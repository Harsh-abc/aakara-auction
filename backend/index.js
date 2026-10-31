import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import prisma from "./src/libs/prisma.js";
import redis from './src/libs/redis.js';
import authRouter from "./src/routes/auth.routes.js";
import adminRouter from "./src/routes/admin.routes.js";
import uploadRouter from "./src/routes/upload.routes.js";
import categoryRouter from "./src/routes/category.routes.js";
import auctionRouter from "./src/routes/auction.routes.js";
import currencyRouter from "./src/routes/currency.routes.js";
import userRouter from "./src/routes/user.routes.js";
import locationRouter from "./src/routes/location.routes.js";
import biddingRouter from "./src/routes/bidding.routes.js";
import liveStreamRouter from "./src/routes/liveStream.routes.js";
import websiteRouter from "./src/routes/website.routes.js";
import { startAuctionScheduler } from "./src/jobs/auctionScheduler.js";
import { initSocket } from "./src/libs/socket.js";
import { activityLogger } from "./src/middleware/activityLogger.js";


const app = express();

// read the visitor's IP from X-Forwarded-For, but only when a trusted proxy (nginx,
// a load balancer) set it — by default proxies on this machine or a private network.
// TRUST_PROXY can be true, a hop count ("1") or a list of addresses / subnets.
const parseTrustProxy = (value) => {
    if (value === undefined || value === "") return "loopback, linklocal, uniquelocal";
    if (value === "true" || value === "false") return value === "true";
    return /^\d+$/.test(value) ? Number(value) : value;
};
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
// audit trail for Settings → Activity Logs (see src/middleware/activityLogger.js)
app.use(activityLogger);



app.get("/", (req, res) => {
    res.json({
        message: 'Welcome to Akara Auction API',
        sucess: true
    })
})


// Server clock in epoch ms — browsers measure their offset from it so countdowns
// don't depend on the visitor's (possibly wrong) system clock
app.get("/api/time", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ success: true, now: Date.now() });
});

app.get("/test-redis", async (req, res) => {
    try {
        await redis.set("test:key", "Hello Redis");

        const value = await redis.get("test:key");

        res.json({
            success: true,
            message: value,
        });
    } catch (error) {
        console.error("Redis error:", error);

        res.status(500).json({
            success: false,
            message: "Redis connection failed",
        });
    }
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter)
app.use('/api/image', uploadRouter)
app.use('/api/category', categoryRouter)
app.use('/api/auction', auctionRouter)
app.use('/api/currency', currencyRouter)
app.use('/api/users', userRouter)
app.use('/api/location', locationRouter)
app.use('/api/bidding', biddingRouter)
app.use('/api/live', liveStreamRouter)
app.use('/api/website', websiteRouter)

// errors handed to next(err) — answer with JSON the frontend can show, instead of Express's
// HTML error page. Errors thrown with a statusCode carry a message meant for the user;
// anything else is unexpected, so it's logged in full and the user gets a generic message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.statusCode ?? err.status;
    if (status && status < 500) {
        return res.status(status).json({ success: false, message: err.message });
    }
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    res.status(status ?? 500).json({
        success: false,
        message: status ? err.message : "Something went wrong on our side. Please try again in a moment.",
    });
});

const PORT = process.env.PORT || 8080;

// Socket.IO shares the HTTP server (live bids — see src/libs/socket.js)
const server = createServer(app);
initSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    prisma.$connect().then(() => {
        console.log("Connected to the database");
        startAuctionScheduler();
    }).catch((err) => {
        console.error("Error connecting to the database", err);
    });

});