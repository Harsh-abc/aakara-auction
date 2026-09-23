import express from "express";
import { getCurrencies } from "../controllers/currency.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const currencyRouter = express.Router();

// GET /api/currency
currencyRouter.get("/", authenticate, getCurrencies);

export default currencyRouter;