import { Country, City } from "country-state-city";

// the dataset is static, so build the country list once and let browsers cache responses for a day
const CACHE_HEADER = "public, max-age=86400";

const countries = Country.getAllCountries()
    .map(({ isoCode, name }) => ({ isoCode, name }))
    .sort((a, b) => a.name.localeCompare(b.name));


export const getCountries = (req, res) => {
    res.set("Cache-Control", CACHE_HEADER);

    return res.status(200).json({
        success: true,
        message: "Countries fetched successfully",
        data: countries,
    });
};


export const getCitiesOfCountry = (req, res) => {
    try {
        const isoCode = String(req.params.isoCode || "").toUpperCase();

        if (!Country.getCountryByCode(isoCode)) {
            return res.status(404).json({
                success: false,
                message: "Country not found",
            });
        }

        // the same city name can appear under several states, so dedupe before sending
        const cities = [...new Set((City.getCitiesOfCountry(isoCode) || []).map((city) => city.name))]
            .sort((a, b) => a.localeCompare(b));

        res.set("Cache-Control", CACHE_HEADER);

        return res.status(200).json({
            success: true,
            message: "Cities fetched successfully",
            data: cities,
        });
    } catch (error) {
        console.error("Get cities error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch cities",
        });
    }
};
