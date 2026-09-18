import {
    getAllCategories,
    getCategoryByUuid,
    getSubCategoriesByCategoryUuid,
} from "../services/category.services.js";
import { serializeBigInt } from "../utils/serialize.js";

export const getCategories = async (req, res) => {
    try {
        const categories = await getAllCategories();

        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
            data: serializeBigInt(categories),
        });
    } catch (error) {
        console.error("Get categories error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories",
        });
    }
};

export const getCategory = async (req, res) => {
    try {
        const { uuid } = req.params;

        const category = await getCategoryByUuid(uuid);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        if (!category.isActive) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category fetched successfully",
            data: serializeBigInt(category),
        });
    } catch (error) {
        console.error("Get category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch category",
        });
    }
};

export const getCategorySubCategories = async (req, res) => {
    try {
        const { uuid } = req.params;

        const subCategories =
            await getSubCategoriesByCategoryUuid(uuid);

        return res.status(200).json({
            success: true,
            message: "Subcategories fetched successfully",
            data: serializeBigInt(subCategories),
        });
    } catch (error) {
        console.error(
            "Get category subcategories error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch subcategories",
        });
    }
};