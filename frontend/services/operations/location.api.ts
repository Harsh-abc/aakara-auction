import { apiConnector } from "../apiConnector";
import { locationEndPoints } from "../api";

import { CitiesResponse, CountriesResponse } from "@/lib/types/location.types";

export const getCountries = async (): Promise<CountriesResponse> => {
    const response = await apiConnector<CountriesResponse>({
        method: "GET",
        url: locationEndPoints.GET_COUNTRIES_API,
    });

    return response.data;
};

export const getCities = async (isoCode: string): Promise<CitiesResponse> => {
    const response = await apiConnector<CitiesResponse>({
        method: "GET",
        url: locationEndPoints.GET_CITIES_API(isoCode),
    });

    return response.data;
};
