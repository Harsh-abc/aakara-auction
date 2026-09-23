"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { apiConnector } from "@/services/apiConnector";
import { currencyEndPoints } from "@/services/api";
import type { RootState } from "@/redux/store";

export interface CurrencyOption {
    code: string;
    name: string;
    symbol: string | null;
}

/**
 * Mirrors prisma/seed.js. Used only until the API responds (or if it fails),
 * so the form never renders an empty currency list.
 */
export const FALLBACK_CURRENCIES: CurrencyOption[] = [
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound Sterling", symbol: "£" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
];

// Module-level cache: fetched once per page load, shared by every component
let cache: CurrencyOption[] | null = null;
let inflight: Promise<CurrencyOption[]> | null = null;

const fetchCurrencies = (token: string) => {
    if (cache) return Promise.resolve(cache);

    if (!inflight) {
        inflight = apiConnector<{ success: boolean; data: CurrencyOption[] }>({
            method: "GET",
            url: currencyEndPoints.GET_CURRENCIES_API,
            header: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                cache = res.data?.data?.length ? res.data.data : FALLBACK_CURRENCIES;
                return cache;
            })
            .catch((error) => {
                console.error("Failed to load currencies:", error);
                return FALLBACK_CURRENCIES;
            })
            .finally(() => {
                inflight = null;
            });
    }

    return inflight;
};

/** Active currencies from the `currencies` table. */
export function useCurrencies() {
    const token = useSelector((state: RootState) => state.auth.accessToken);

    const [currencies, setCurrencies] = useState<CurrencyOption[]>(cache ?? FALLBACK_CURRENCIES);
    const [loading, setLoading] = useState(!cache);

    useEffect(() => {
        if (cache || !token) {
            setLoading(false);
            return;
        }

        let active = true;

        fetchCurrencies(token).then((list) => {
            if (active) {
                setCurrencies(list);
                setLoading(false);
            }
        });

        return () => {
            active = false;
        };
    }, [token]);

    return { currencies, loading };
}