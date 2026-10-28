import redis from "./redis.js";

// =====================================================================
// Live bidding store (Redis)
//
// While a sale runs, Redis is the book of record for its lots: every bid
// and proxy is settled here by one Lua script per call, so concurrent
// bids on a lot are serialised without touching Postgres. The database
// gets a snapshot of each lot's current bid every scheduler tick, the
// result when a lot closes, and the full bid history once the auction
// ends (see services/bidding.services.js).
//
// Keys (all under "bid:"):
//   lot:{lotUuid}                  HASH  lot facts + live state (currentBid, leaderId, bidCount, seq, nextBid)
//   lot:{lotUuid}:bids             LIST  every bid, oldest first (JSON)
//   lot:{lotUuid}:proxies          HASH  userId -> { max, at } (also in the auto_bids table; reloaded from it with the lot)
//   lot:{lotUuid}:eligible         SET   verified bidder ids + "__loaded__" (cache, expires)
//   auction:{auctionUuid}:status   STR   auction status (cache, expires)
//   auction:{auctionUuid}:lots     SET   lots of the sale that have state here
//   auction:{auctionUuid}:bidders  HASH  userId -> { uuid, paddle, name }
//   auction:{auctionUuid}:feed     LIST  latest bids across the sale, newest first (capped)
//   auction:{auctionUuid}:stats    HASH  total / manual / proxy bid counts
//   auction:{auctionUuid}:counts   ZSET  userId -> bids placed
//   dirty                          SET   lots changed since the last database snapshot
//   flush-pending                  SET   ended auctions whose bids still need writing to the database
// =====================================================================

export const FEED_SIZE = 200;
export const ELIGIBLE_TTL_SECONDS = 600;
export const AUCTION_STATUS_TTL_SECONDS = 60;
export const ELIGIBLE_SENTINEL = "__loaded__";

export const bidKeys = {
    lot: (lotUuid) => `bid:lot:${lotUuid}`,
    bids: (lotUuid) => `bid:lot:${lotUuid}:bids`,
    proxies: (lotUuid) => `bid:lot:${lotUuid}:proxies`,
    eligible: (lotUuid) => `bid:lot:${lotUuid}:eligible`,
    auctionStatus: (auctionUuid) => `bid:auction:${auctionUuid}:status`,
    auctionLots: (auctionUuid) => `bid:auction:${auctionUuid}:lots`,
    auctionBidders: (auctionUuid) => `bid:auction:${auctionUuid}:bidders`,
    auctionFeed: (auctionUuid) => `bid:auction:${auctionUuid}:feed`,
    auctionStats: (auctionUuid) => `bid:auction:${auctionUuid}:stats`,
    auctionCounts: (auctionUuid) => `bid:auction:${auctionUuid}:counts`,
    dirty: "bid:dirty",
    flushPending: "bid:flush-pending",
    rate: (userId) => `bid:rate:${userId}`,
};

// ---------------------------------------------------------------------
// HYDRATE — writes a lot's state only if it isn't there yet, so a slow
// reader can never overwrite bids placed in the meantime.
// KEYS: 1 lot hash, 2 auction lots set   ARGV: lotUuid, field, value, field, value…
// ---------------------------------------------------------------------

const HYDRATE_LUA = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], unpack(ARGV, 2))
redis.call('SADD', KEYS[2], ARGV[1])
return 1
`;

// ---------------------------------------------------------------------
// BID ENGINE — one atomic run per manual bid, floor bid, proxy bid, the
// hammer (EXECUTE: the proxies are placed), a close (CLOSE: proxies placed and
// bids stopped together), or "resolve" (lot opened / sale resumed: next ask only).
// A floor bid is a manual bid the auctioneer enters for a paddle in the room.
//
// KEYS: 1 lot, 2 bids, 3 proxies, 4 auction status, 5 auction feed,
//       6 auction stats, 7 auction bid counts, 8 dirty set
// ARGV: 1 mode (BID | FLOOR | PROXY | RESOLVE | EXECUTE | CLOSE), 2 userId, 3 amount,
//       4 now (ms), 5 lotUuid, 6 feed size, 7 ip, 8 user agent
//
// Bid sources: M = online (manual), F = floor, P = proxy
//
// Proxy rules:
//   - a bidder leaves one proxy per lot, before the lot opens; it can be changed
//     until the lot opens (a new maximum is ranked as set when it was changed),
//     and is locked from then on
//   - proxies don't bid while the lot is live — they're placed when the auctioneer
//     calls the hammer (or the lot closes any other way), against the standing bid
//   - only the highest proxy bids: it takes the lot at the next valid bid over the
//     standing bid, up to its max. The other proxies don't bid against it, so the
//     price never climbs to the next-highest maximum
//   - a proxy may top a bid by less than a full increment when its max is that close
//   - equal maximums: the proxy set first is the highest. "First" is the order the engine
//     accepted them — 'at' is unique per lot and saved with the proxy, so a reload keeps it
//   - a standing manual / floor bid equal to a proxy's max loses to the proxy (set
//     earlier); only a bid above every proxy's max beats them
//   - a lot with no live bids goes to the strongest proxy (highest max, then
//     earliest), from the starting price
// Increments mirror utils/bidIncrement.js — keep the two in step.
// ---------------------------------------------------------------------

const ENGINE_LUA = `
local lotKey, bidsKey, proxiesKey, auctionKey, feedKey, statsKey, countsKey, dirtyKey =
    KEYS[1], KEYS[2], KEYS[3], KEYS[4], KEYS[5], KEYS[6], KEYS[7], KEYS[8]
local mode, userId, amount, now, lotUuid, feedSize, ip, ua =
    ARGV[1], ARGV[2], tonumber(ARGV[3]), tonumber(ARGV[4]), ARGV[5], tonumber(ARGV[6]), ARGV[7], ARGV[8]

local function fail(code, extra)
    local r = extra or {}
    r.err = code
    return cjson.encode(r)
end

if redis.call('EXISTS', lotKey) == 0 then return fail('NOT_LOADED') end
local auctionStatus = redis.call('GET', auctionKey)
if not auctionStatus then return fail('NOT_LOADED') end

local raw = redis.call('HGETALL', lotKey)
local lot = {}
for i = 1, #raw, 2 do lot[raw[i]] = raw[i + 1] end

local status = lot.status
local start = tonumber(lot.startingPrice)
local rules = cjson.decode(lot.rules or '[]')
local count = tonumber(lot.bidCount) or 0
local current = nil
if count > 0 then current = tonumber(lot.currentBid) end
local leader = nil
if lot.leaderId and lot.leaderId ~= '' then leader = lot.leaderId end
local seq = tonumber(lot.seq) or 0
local itemNumber = lot.itemNumber
local prevLeader = leader

-- house increment chart, in tenths of a decade (see utils/bidIncrement.js)
local LADDER = {
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 22, 24, 26, 28,
    30, 32, 35, 38, 40, 42, 45, 48,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
    100,
}

-- the first step of the chart above value
local function ladderAbove(value)
    if value < 10 then return math.floor(value) + 1 end
    local decade = math.pow(10, math.floor(math.log10(value)))
    if decade > value then decade = decade / 10 elseif decade * 10 <= value then decade = decade * 10 end
    local unit = decade / 10
    for _, tenths in ipairs(LADDER) do
        if tenths * unit > value then return tenths * unit end
    end
end

-- smallest bid the next bidder may place
local function nextMin(value)
    if value == nil then return start end
    for _, rule in ipairs(rules) do
        local lo = tonumber(rule.rangeMin)
        local hi = tonumber(rule.rangeMax)
        if (lo == nil or value >= lo) and (hi == nil or value < hi) then
            if rule.valueType == 'PERCENTAGE' then
                return value + math.ceil(value * tonumber(rule.value) / 100)
            end
            return value + tonumber(rule.value)
        end
    end
    return ladderAbove(value)
end

local proxies = {}
local praw = redis.call('HGETALL', proxiesKey)
for i = 1, #praw, 2 do
    local p = cjson.decode(praw[i + 1])
    proxies[praw[i]] = { max = tonumber(p.max), at = tonumber(p.at) }
end

local out = {}
local function record(uid, amt, src)
    seq = seq + 1
    count = count + 1
    current = amt
    leader = uid
    local bid = { seq = seq, u = uid, a = amt, s = src, t = now }
    if src ~= 'P' then
        bid.ip = ip
        bid.ua = ua
    end
    redis.call('RPUSH', bidsKey, cjson.encode(bid))
    redis.call('LPUSH', feedKey, cjson.encode({ lot = lotUuid, n = itemNumber, seq = seq, u = uid, a = amt, s = src, t = now }))
    redis.call('HINCRBY', statsKey, 'total', 1)
    -- floor bids are placed by bidders too (counted with online bids)
    redis.call('HINCRBY', statsKey, src == 'P' and 'proxy' or 'manual', 1)
    redis.call('ZINCRBY', countsKey, 1, uid)
    out[#out + 1] = { seq = seq, u = uid, a = amt, s = src, t = now }
end

-- is proxy a stronger than proxy b
local function better(a, b)
    if b == nil then return true end
    if a.max ~= b.max then return a.max > b.max end
    if a.at ~= b.at then return a.at < b.at end
    return a.uid < b.uid
end

-- strongest proxy other than 'exclude' whose max passes 'test'
local function strongest(test, exclude)
    local best = nil
    for uid, p in pairs(proxies) do
        if uid ~= exclude and test(p.max) then
            local candidate = { uid = uid, max = p.max, at = p.at }
            if better(candidate, best) then best = candidate end
        end
    end
    return best
end

-- place the strongest proxy against the standing bid (only at the hammer / close): it takes the
-- lot at the next valid bid (capped at its max); the other proxies don't bid
local function resolve()
    if status ~= 'ACTIVE' then return end
    if current == nil then
        local opener = strongest(function(max) return max >= start end, nil)
        if opener then record(opener.uid, start, 'P') end
        return
    end
    local floor = current
    local top = strongest(function(max) return max > floor end, nil)
    -- the leader's own proxy is the strongest: they already hold the lot
    if not top or top.uid == leader then return end
    local amt = nextMin(current)
    if amt > top.max then amt = top.max end
    record(top.uid, amt, 'P')
end

-- the bidder's proxy before a PROXY run changed it (to put it back if saving fails)
local prevProxy = nil

local function isOneOf(value, list)
    for _, item in ipairs(list) do
        if value == item then return true end
    end
    return false
end

if mode == 'BID' or mode == 'FLOOR' then
    if status ~= 'ACTIVE' then return fail('LOT_NOT_LIVE') end
    if auctionStatus ~= 'LIVE' then return fail('AUCTION_NOT_LIVE', { auctionStatus = auctionStatus }) end
    if leader == userId then return fail('ALREADY_LEADING') end
    local need = nextMin(current)
    if amount < need then return fail('BID_TOO_LOW', { nextBid = need }) end

    -- proxies don't answer live bids; they're placed when the lot is hammered (EXECUTE / CLOSE)
    record(userId, amount, mode == 'FLOOR' and 'F' or 'M')
elseif mode == 'PROXY' then
    -- proxies are left (or changed) before the lot opens, one per bidder
    if status == 'ACTIVE' or status == 'CLOSING' then return fail('LOT_STARTED') end
    if not isOneOf(status, { 'DRAFT', 'SCHEDULED' }) then return fail('LOT_CLOSED') end
    if not isOneOf(auctionStatus, { 'SCHEDULED', 'PREVIEW', 'LIVE', 'PAUSED' }) then
        return fail('AUCTION_CLOSED', { auctionStatus = auctionStatus })
    end
    local need = nextMin(current)
    if amount < need then return fail('PROXY_TOO_LOW', { nextBid = need }) end

    -- an edit with the same maximum changes nothing (and keeps its place among equal maximums)
    local existing = proxies[userId]
    if existing then
        prevProxy = { max = existing.max, at = existing.at }
    end
    if not (existing and existing.max == amount) then
        -- 'at' decides equal maximums, so no two proxies on a lot share one: a proxy
        -- accepted (or changed) later always gets a later 'at' (even within the same millisecond)
        local at = now
        for _, p in pairs(proxies) do
            if p.at >= at then at = p.at + 1 end
        end
        proxies[userId] = { max = amount, at = at }
        redis.call('HSET', proxiesKey, userId, cjson.encode({ max = amount, at = at }))
    end
elseif mode == 'RESOLVE' then
    -- the lot opened / the sale resumed: proxies wait for the hammer, only the next ask is refreshed
elseif mode == 'EXECUTE' or mode == 'CLOSE' then
    -- the hammer (EXECUTE), or the lot closing any other way (CLOSE): the proxies are placed now
    if status ~= 'ACTIVE' then return fail('LOT_NOT_LIVE') end
    local before = #out
    resolve()
    if #out == before and current ~= nil then
        -- no proxy tops the standing bid — but one whose max equals it takes it: it was set before the lot
        -- opened, so before that bid (unless the leader's own proxy is as high and was set first)
        local tie = strongest(function(max) return max == current end, leader)
        if tie then
            local own = proxies[leader]
            local ownHolds = own ~= nil and own.max >= current
                and (own.max > current or own.at < tie.at or (own.at == tie.at and leader < tie.uid))
            if not ownHolds then record(tie.uid, current, 'P') end
        end
    end
    -- CLOSE stops bids in the same atomic run, so no bid can slip in after the proxies
    if mode == 'CLOSE' then
        status = 'CLOSING'
        redis.call('HSET', lotKey, 'status', 'CLOSING')
    end
else
    return fail('BAD_MODE')
end

local nextBid = nextMin(current)
redis.call('HSET', lotKey, 'nextBid', tostring(nextBid))
if #out > 0 then
    redis.call('HSET', lotKey, 'currentBid', tostring(current), 'leaderId', leader, 'bidCount', count, 'seq', seq)
    redis.call('SADD', dirtyKey, lotUuid)
    redis.call('LTRIM', feedKey, 0, feedSize - 1)
end

local mine = proxies[userId]
return cjson.encode({
    ok = true,
    bids = out,
    prevLeader = prevLeader,
    proxyMax = mine and mine.max or nil,
    proxyAt = mine and mine.at or nil,
    prevProxy = prevProxy,
    state = {
        status = status,
        currentBid = current,
        leaderId = leader,
        bidCount = count,
        nextBid = nextBid,
    },
})
`;

redis.defineCommand("bidHydrateLot", { numberOfKeys: 2, lua: HYDRATE_LUA });
redis.defineCommand("bidEngine", { numberOfKeys: 8, lua: ENGINE_LUA });

/** Writes a lot's state unless it already exists. Returns true if this call wrote it. */
export const hydrateLotState = async ({ lotUuid, auctionUuid, fields }) => {
    const flat = Object.entries(fields).flatMap(([field, value]) => [field, value === null || value === undefined ? "" : String(value)]);
    const written = await redis.bidHydrateLot(bidKeys.lot(lotUuid), bidKeys.auctionLots(auctionUuid), lotUuid, ...flat);
    return written === 1;
};

/**
 * Runs the bid engine for a lot. Resolves to the script's result:
 *   { ok: true, bids, prevLeader, proxyMax, proxyAt, prevProxy, state }  or  { err: CODE, ... }
 * Amounts come back as numbers.
 */
export const runBidEngine = async ({ mode, lotUuid, auctionUuid, userId = "", amount = 0, ip = "", userAgent = "" }) => {
    const raw = await redis.bidEngine(
        bidKeys.lot(lotUuid),
        bidKeys.bids(lotUuid),
        bidKeys.proxies(lotUuid),
        bidKeys.auctionStatus(auctionUuid),
        bidKeys.auctionFeed(auctionUuid),
        bidKeys.auctionStats(auctionUuid),
        bidKeys.auctionCounts(auctionUuid),
        bidKeys.dirty,
        mode,
        String(userId),
        String(amount),
        String(Date.now()),
        lotUuid,
        String(FEED_SIZE),
        ip ?? "",
        (userAgent ?? "").slice(0, 255)
    );
    const result = JSON.parse(raw);
    // cjson writes an empty table as {}
    if (result.ok) result.bids = Array.isArray(result.bids) ? result.bids : [];
    return result;
};

/** Reads a lot's hash; null when the lot has no live state. */
export const readLotState = async (lotUuid) => {
    const state = await redis.hgetall(bidKeys.lot(lotUuid));
    return Object.keys(state).length ? state : null;
};

/** Every key that belongs to one lot. */
export const lotKeyList = (lotUuid) => [bidKeys.lot(lotUuid), bidKeys.bids(lotUuid), bidKeys.proxies(lotUuid), bidKeys.eligible(lotUuid)];

/** Every auction-level key (lots are listed in auctionLots). */
export const auctionKeyList = (auctionUuid) => [
    bidKeys.auctionStatus(auctionUuid),
    bidKeys.auctionLots(auctionUuid),
    bidKeys.auctionBidders(auctionUuid),
    bidKeys.auctionFeed(auctionUuid),
    bidKeys.auctionStats(auctionUuid),
    bidKeys.auctionCounts(auctionUuid),
];
