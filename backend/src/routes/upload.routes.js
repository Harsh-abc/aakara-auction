import express from 'express'

import upload, { uploadEditorImage } from '../middleware/upload.middleware.js'
import { uploadEditorImageController, uploadTestImage } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';


const uploadRouter = express.Router()

// standalone image upload (not used by the app) — super admin / admin only
uploadRouter.post(
    "/upload-image",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN"),
    upload.single("image"),
    uploadTestImage
);

// rich-text editor (auction description) — staff only
uploadRouter.post(
    "/editor-image",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN", "OPERATIONS"),
    uploadEditorImage,
    uploadEditorImageController
);

export default uploadRouter;
