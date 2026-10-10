export interface Country {
    isoCode: string;
    name: string;
}

export interface CountriesResponse {
    success: boolean;
    message: string;
    data: Country[];
}

export interface CitiesResponse {
    success: boolean;
    message: string;
    data: string[];
}
