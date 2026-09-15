import express from 'express'

import upload from '../middleware/upload.middleware.js'
import { uploadTestImage } from '../controllers/upload.controller.js';


const uploadRouter = express.Router()

uploadRouter.post(
    "/upload-image",
    upload.single("image"),
    uploadTestImage
);

export default uploadRouter;