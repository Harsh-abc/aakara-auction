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
import { startAuctionScheduler } from "./src/jobs/auctionScheduler.js";
import { initSocket } from "./src/libs/socket.js";


const app = express();


app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());



app.get("/", (req, res) => {
    res.json({
        message: 'Welcome to Aakara Auction API',
        sucess: true
    })
})


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