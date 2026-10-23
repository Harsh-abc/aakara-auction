import { Router } from 'express'

import {
    createHomeBanner,
    deleteHomeBanner,
    getActiveHomeBanners,
    getHomeBanners,
    removeHomeBannerImage,
    reorderHomeBanners,
    setHomeBannerImage,
    updateHomeBanner,
} from '../controllers/website.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadBannerImages, uploadEditorImage } from '../middleware/upload.middleware.js';

const websiteRouter = Router();

// STOREFRONT — the home page hero's default images, no login
websiteRouter.get('/home-banners', getActiveHomeBanners)

// SETTINGS → WEBSITE (super admin only) — images are JPG / PNG / WEBP / GIF, 10MB max
websiteRouter.get('/home-banners/all', authenticate, requireRole('SUPER_ADMIN'), getHomeBanners)
// "image" (laptop, required), "tabletImage" / "mobileImage" (optional)
websiteRouter.post('/home-banners', authenticate, requireRole('SUPER_ADMIN'), uploadBannerImages, createHomeBanner)
websiteRouter.patch('/home-banners/reorder', authenticate, requireRole('SUPER_ADMIN'), reorderHomeBanners) // before /:uuid
websiteRouter.patch('/home-banners/:uuid', authenticate, requireRole('SUPER_ADMIN'), updateHomeBanner)
websiteRouter.delete('/home-banners/:uuid', authenticate, requireRole('SUPER_ADMIN'), deleteHomeBanner)
// one device's image (desktop | tablet | mobile) — single "image"
websiteRouter.put('/home-banners/:uuid/images/:device', authenticate, requireRole('SUPER_ADMIN'), uploadEditorImage, setHomeBannerImage)
websiteRouter.delete('/home-banners/:uuid/images/:device', authenticate, requireRole('SUPER_ADMIN'), removeHomeBannerImage)

export default websiteRouter;
