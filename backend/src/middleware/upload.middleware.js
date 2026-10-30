import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_TYPES = [
    // images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

    // documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);

    const error = new Error(
        `"${file.originalname}" is not allowed. Use JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, MP4, WEBM, MOV, AVI or MKV.`
    );
    error.statusCode = 400;
    cb(error, false);
};

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per file
        files: 200,                   // total files per request
        fieldSize: 10 * 1024 * 1024,  // the "lots" JSON field can get large
    },
    fileFilter,
});

/**
 * Wraps upload.any() so multer errors come back as JSON 400s
 * instead of falling through to Express' HTML error page.
 */
export const uploadAny = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (!err) return next();

        let message = err.message || "File upload failed";
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") message = "Each file must be 100MB or smaller";
            if (err.code === "LIMIT_FILE_COUNT") message = "Too many files in one request";
            if (err.code === "LIMIT_FIELD_VALUE") message = "Form data is too large";
        }

        return res.status(400).json({ success: false, message });
    });
};

/**
 * Routes any signed-in user can reach get tight limits, so nobody can make the
 * server buffer gigabytes in memory (uploadAny's 100MB × 200 is staff-only).
 * Both keep upload.any() so req.files stays an array for the controllers.
 */
const typeFilter = (types, message) => (req, file, cb) => {
    if (types.includes(file.mimetype)) return cb(null, true);
    const error = new Error(message);
    error.statusCode = 400;
    cb(error, false);
};

const limitedUpload = ({ types, typeMessage, fileSize, files, sizeMessage }) => {
    const uploader = multer({
        storage,
        limits: { fileSize, files, fields: 50, fieldSize: 64 * 1024 },
        fileFilter: typeFilter(types, typeMessage),
    }).any();

    return (req, res, next) => {
        uploader(req, res, (err) => {
            if (!err) return next();

            let message = err.message || "File upload failed";
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") message = sizeMessage;
                if (err.code === "LIMIT_FILE_COUNT") message = "Too many files in one request";
                if (err.code === "LIMIT_FIELD_VALUE" || err.code === "LIMIT_FIELD_COUNT") message = "Form data is too large";
            }
            return res.status(400).json({ success: false, message });
        });
    };
};

// bidder submitting their own KYC — matches submitMyKycSchema (≤ 10 documents) and KYC_SELF_MAX_SIZE
export const uploadMyKyc = limitedUpload({
    types: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    typeMessage: "KYC documents must be JPG, PNG, WEBP or PDF.",
    fileSize: 5 * 1024 * 1024,
    files: 10,
    sizeMessage: "Each document must be 5 MB or smaller",
});

// My profile — the optional "avatar" image only
export const uploadAvatar = limitedUpload({
    types: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    typeMessage: "Avatar must be JPG, PNG or WEBP",
    fileSize: 2 * 1024 * 1024,
    files: 1,
    sizeMessage: "Avatar must be 2 MB or smaller",
});

/**
 * Single image under the "image" field (rich-text editor inserts) —
 * images only, 10MB max, multer errors returned as JSON 400s.
 */
const EDITOR_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const imageOnlyFilter = (req, file, cb) => {
    if (EDITOR_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    const error = new Error("Only JPG, PNG, WEBP or GIF images are allowed");
    error.statusCode = 400;
    cb(error, false);
};

const editorImageUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: imageOnlyFilter,
});

const imageUploadError = (res, err) => {
    let message = err.message || "Image upload failed";
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") message = "Image must be 10MB or smaller";
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected image field";
    }
    return res.status(400).json({ success: false, message });
};

export const uploadEditorImage = (req, res, next) => {
    editorImageUpload.single("image")(req, res, (err) => (err ? imageUploadError(res, err) : next()));
};

/**
 * Home page banner (Settings → Website): the laptop image under "image", plus optional
 * "tabletImage" / "mobileImage" — images only, 10MB each.
 */
const bannerImageUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 3 },
    fileFilter: imageOnlyFilter,
});

export const uploadBannerImages = (req, res, next) => {
    bannerImageUpload.fields([
        { name: "image", maxCount: 1 },
        { name: "tabletImage", maxCount: 1 },
        { name: "mobileImage", maxCount: 1 },
    ])(req, res, (err) => (err ? imageUploadError(res, err) : next()));
};

export default upload;