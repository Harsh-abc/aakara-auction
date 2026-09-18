import { apiConnector } from "../apiConnector";
import { categoryEndPoints } from "../api";

import {
    CategoryResponse,
    SubCategoryResponse,
} from "@/lib/types/category.types";

export const getCategories = async (): Promise<CategoryResponse> => {
    const response = await apiConnector<CategoryResponse>({
        method: "GET",
        url: categoryEndPoints.GET_ALL_CATEGORIES_API,
    });

    return response.data;
};

export const getSubCategories = async (
    categoryUuid: string
): Promise<SubCategoryResponse> => {
    const response = await apiConnector<SubCategoryResponse>({
        method: "GET",
        url: categoryEndPoints.GET_CATEGORY_SUBCATEGORIES_API(
            categoryUuid
        ),
    });

    return response.data;
};