import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();
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

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});