export type Lot = {
    id?: string;

    details: {
        title: string;
        artist: string;
        description: string;
    };

    images: {
        id?: string;
        url: string;
    }[];

    pricing: {
        startingPrice: number | null;
        estimateFrom: number | null;
        estimateTo: number | null;
    };

    condition: {
        condition: string;
        provenance: string;
    };

    certificates: {
        id?: string;
        name: string;
        url: string;
    }[];

    status: "draft" | "published" | "archived" | "complete";
};

export type AuctionFormData = {
    basicInfo: {
        name: string;
        reference: string;
        auctionType: string;
        description: string;
        category: string;
        subCategory: string;
    };

    schedule: {
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
    };

    lots: Lot[];
};