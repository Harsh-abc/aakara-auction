import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import prisma from "./src/libs/prisma.js";
import redis from './src/libs/redis.js';
import authRouter from "./src/routes/auth.routes.js";
import adminRouter from "./src/routes/admin.routes.js";


const app = express();



app.use(express.json());
app.use(cookieParser());
app.use(cors());



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

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    prisma.$connect().then(() => {
        console.log("Connected to the database");
    }).catch((err) => {
        console.error("Error connecting to the database", err);
    });

});