import { uploadToS3 } from "../services/s3.services.js";


export const uploadTestImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required",
            });
        }

        const uploadedFile = await uploadToS3({
            file: req.file,
            folder: "auction",
        });

        console.log(uploadedFile)

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: uploadedFile,
        });
    } catch (error) {
        console.error("S3 Upload Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload image",
        });
    }
}

// Images placed inside rich-text fields (auction description) — returns the public URL
export const uploadEditorImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required",
            });
        }

        const { url, key } = await uploadToS3({
            file: req.file,
            folder: "auction/editor",
        });

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: { url, key },
        });
    } catch (error) {
        console.error("Editor image upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload image",
        });
    }
}