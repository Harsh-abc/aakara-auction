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
//   lot:{lotUuid}:proxies          HASH  userId -> { max, at }
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
// BID ENGINE — one atomic run per manual bid, proxy bid, or "resolve"
// (when a lot opens / the sale resumes, so waiting proxies bid).
//
// KEYS: 1 lot, 2 bids, 3 proxies, 4 auction status, 5 auction feed,
//       6 auction stats, 7 auction bid counts, 8 dirty set
// ARGV: 1 mode (BID | PROXY | RESOLVE), 2 userId, 3 amount, 4 now (ms),
//       5 lotUuid, 6 feed size, 7 ip, 8 user agent
//
// Proxy rules:
//   - a proxy bids for its owner only as much as it takes to lead, up to its max
//   - the strongest proxy (highest max, then earliest) opens the lot at the starting price
//   - a proxy may top a bid by less than a full increment when its max is that close
//   - equal maximums: the earlier one holds the lead
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

local function defaultIncrement(value)
    local r = value * 0.05
    if r <= 1 then return 1 end
    local step = math.pow(10, math.floor(math.log10(r))) / 2
    return math.ceil(r / step) * step
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
    return value + defaultIncrement(value)
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
    if src == 'M' then
        bid.ip = ip
        bid.ua = ua
    end
    redis.call('RPUSH', bidsKey, cjson.encode(bid))
    redis.call('LPUSH', feedKey, cjson.encode({ lot = lotUuid, n = itemNumber, seq = seq, u = uid, a = amt, s = src, t = now }))
    redis.call('HINCRBY', statsKey, 'total', 1)
    redis.call('HINCRBY', statsKey, src == 'M' and 'manual' or 'proxy', 1)
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

-- let waiting proxies bid until no one can top the leader
local function resolve()
    if status ~= 'ACTIVE' or auctionStatus ~= 'LIVE' then return end
    for _ = 1, 1000 do
        if current == nil then
            local opener = strongest(function(max) return max >= start end, nil)
            if not opener then return end
            record(opener.uid, start, 'P')
        else
            local floor = current
            local challenger = strongest(function(max) return max > floor end, leader)
            if not challenger then return end

            local holder = leader
            local own = proxies[holder]
            local cap = current
            if own and own.max > current then cap = own.max end
            local holderWinsTie = own ~= nil and (own.at < challenger.at or (own.at == challenger.at and holder < challenger.uid))

            if challenger.max > cap then
                -- the leader's proxy defends to its max, then the challenger tops it
                if cap > current then record(holder, cap, 'P') end
                local amt = nextMin(current)
                if amt > challenger.max then amt = challenger.max end
                record(challenger.uid, amt, 'P')
            elseif challenger.max == cap and not holderWinsTie then
                record(challenger.uid, cap, 'P')
            elseif challenger.max < cap then
                -- the challenger runs out; the leader's proxy answers
                record(challenger.uid, challenger.max, 'P')
                local amt = nextMin(current)
                if amt > cap then amt = cap end
                record(holder, amt, 'P')
            else
                record(holder, cap, 'P')
            end
        end
    end
end

local function isOneOf(value, list)
    for _, item in ipairs(list) do
        if value == item then return true end
    end
    return false
end

if mode == 'BID' then
    if status ~= 'ACTIVE' then return fail('LOT_NOT_LIVE') end
    if auctionStatus ~= 'LIVE' then return fail('AUCTION_NOT_LIVE', { auctionStatus = auctionStatus }) end
    if leader == userId then return fail('ALREADY_LEADING') end
    local need = nextMin(current)
    if amount < need then return fail('BID_TOO_LOW', { nextBid = need }) end

    record(userId, amount, 'M')
    -- an earlier proxy with exactly this max holds the tie
    local tie = strongest(function(max) return max == amount end, userId)
    if tie then record(tie.uid, amount, 'P') end
    resolve()
elseif mode == 'PROXY' then
    if not isOneOf(status, { 'ACTIVE', 'DRAFT', 'SCHEDULED' }) then return fail('LOT_CLOSED') end
    if not isOneOf(auctionStatus, { 'SCHEDULED', 'PREVIEW', 'LIVE', 'PAUSED' }) then
        return fail('AUCTION_CLOSED', { auctionStatus = auctionStatus })
    end
    local existing = proxies[userId]
    if existing and amount <= existing.max then return fail('PROXY_NOT_HIGHER', { proxyMax = existing.max }) end
    if leader == userId then
        if amount <= current then return fail('PROXY_TOO_LOW', { nextBid = nextMin(current) }) end
    else
        local need = nextMin(current)
        if amount < need then return fail('PROXY_TOO_LOW', { nextBid = need }) end
    end

    proxies[userId] = { max = amount, at = now }
    redis.call('HSET', proxiesKey, userId, cjson.encode({ max = amount, at = now }))
    resolve()
elseif mode == 'RESOLVE' then
    resolve()
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
 *   { ok: true, bids, prevLeader, proxyMax, state }  or  { err: CODE, ... }
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
