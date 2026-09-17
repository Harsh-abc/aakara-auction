import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",

        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only JPG, PNG, WEBP, PDF, DOC, DOCX, MP4, WEBM, MOV, AVI and MKV files are allowed"
            ),
            false
        );
    }
};

const upload = multer({
    storage,

    limits: {
        fileSize: 100 * 1024 * 1024,
    },

    fileFilter,
});

export default upload;