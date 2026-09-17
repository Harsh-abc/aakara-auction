import express, { Router } from 'express'
import { getCategories, getCategory, getCategorySubCategories } from '../controllers/category.controller.js';

const categoryRouter = express.Router()

categoryRouter.get('/get-all-category', getCategories)

categoryRouter.get('/get-category/:uuid', getCategory)

categoryRouter.get('/get-category/:uuid/subcategories', getCategorySubCategories)


export default categoryRouter;