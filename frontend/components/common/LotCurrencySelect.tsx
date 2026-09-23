"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { useCurrencies } from "@/hooks/useCurrencies";

interface LotCurrencySelectProps {
    lotIndex: number;
}

/**
 * Pricing step: the lot's currency, limited to the currencies enabled on the
 * auction (Basic Info). Defaults to the auction's primary currency.
 */
export default function LotCurrencySelect({ lotIndex }: LotCurrencySelectProps) {
    const { control, register, setValue, getValues } = useFormContext<AuctionFormData>();
    const { currencies } = useCurrencies();

    // Currencies enabled on the auction + the primary one
    const allowed = useWatch({ control, name: "basicInfo.currency" }) ?? [];
    const primary = useWatch({ control, name: "basicInfo.primaryCurrency" }) || allowed[0] || "INR";

    const path = `lots.${lotIndex}.pricing.currency` as const;

    // New lot (empty) or a currency that was since disabled -> use the primary
    useEffect(() => {
        const current = getValues(path);
        if (!current || !allowed.includes(current)) {
            setValue(path, primary, { shouldDirty: true });
        }
    }, [allowed, primary, path, getValues, setValue]);

    // Only show currencies enabled for this auction
    const options = currencies.filter((c) => allowed.includes(c.code));

    return (
        <div className="input-wrapper">
            <label className="block mb-2">Currency</label>

            <select className="w-full border rounded-md px-3 py-2 h-11" {...register(path)}>
                {options.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.code}
                        {c.symbol ? ` (${c.symbol})` : ""}
                        {c.code === primary ? " — primary" : ""}
                    </option>
                ))}
            </select>

            {allowed.length <= 1 && (
                <p className="mt-1 text-xs text-slate-500">
                    Enable more currencies in Basic Info to price lots differently.
                </p>
            )}
        </div>
    );
}