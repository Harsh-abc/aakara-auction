import express from "express";
import { getCountries, getCitiesOfCountry } from "../controllers/location.controller.js";

const locationRouter = express.Router();

// public — used by the signup form before the user has an account

// GET /api/location/countries
locationRouter.get("/countries", getCountries);

// GET /api/location/countries/:isoCode/cities
locationRouter.get("/countries/:isoCode/cities", getCitiesOfCountry);

export default locationRouter;
