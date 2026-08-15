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

export default redis;