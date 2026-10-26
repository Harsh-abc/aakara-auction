import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
    console.log("Redis connecting...");
});

redis.on("ready", () => {
    console.log("Redis connected successfully");
});

redis.on("error", (error) => {
    console.error("Redis error:", error);
});

redis.on("close", () => {
    console.log("Redis connection closed");
});

redis.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

// every key matching a glob — SCAN rather than KEYS, so a long list never stalls Redis
export const scanKeys = async (pattern) => {
    const keys = [];
    for await (const batch of redis.scanStream({ match: pattern, count: 500 })) keys.push(...batch);
    return keys;
};

const DELETE_CHUNK = 500;

export const deleteKeys = async (keys) => {
    for (let i = 0; i < keys.length; i += DELETE_CHUNK) {
        await redis.del(...keys.slice(i, i + DELETE_CHUNK));
    }
};

export default redis;