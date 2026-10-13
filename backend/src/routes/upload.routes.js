import express from 'express'

import upload, { uploadEditorImage } from '../middleware/upload.middleware.js'
import { uploadEditorImageController, uploadTestImage } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';


const uploadRouter = express.Router()

uploadRouter.post(
    "/upload-image",
    upload.single("image"),
    uploadTestImage
);

// rich-text editor (auction description) — staff only
uploadRouter.post(
    "/editor-image",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN", "STAFF"),
    uploadEditorImage,
    uploadEditorImageController
);

export default uploadRouter;
