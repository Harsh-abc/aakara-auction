export interface Category {
    uuid: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
}

export interface CategoryResponse {
    success: boolean;
    message: string;
    data: Category[];
}

export interface SubCategory {
    uuid: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
}

export interface SubCategoryResponse {
    success: boolean;
    message: string;
    data: SubCategory[];
}