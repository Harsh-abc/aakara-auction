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

export default upload;