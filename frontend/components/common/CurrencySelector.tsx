"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Star } from "lucide-react";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { useCurrencies } from "@/hooks/useCurrencies";

/**
 * Basic Info: pick the currencies lots in this auction may use,
 * and mark one as PRIMARY (settlement + default for new lots).
 */
export default function CurrencySelector() {
    const { control, setValue, getValues, formState: { errors } } = useFormContext<AuctionFormData>();
    const { currencies, loading } = useCurrencies(); // from the `currencies` table

    const selected = useWatch({ control, name: "basicInfo.currency" }) ?? [];
    const primary = useWatch({ control, name: "basicInfo.primaryCurrency" });

    const opts = { shouldDirty: true, shouldTouch: true, shouldValidate: true } as const;

    const toggle = (code: string, checked: boolean) => {
        const current = getValues("basicInfo.currency") ?? [];
        const next = checked ? [...new Set([...current, code])] : current.filter((c) => c !== code);

        // Don't allow removing the last currency
        if (next.length === 0) return;

        setValue("basicInfo.currency", next, opts);

        // Keep primary valid: first selection becomes primary; removing primary moves it
        const currentPrimary = getValues("basicInfo.primaryCurrency");
        if (!currentPrimary || !next.includes(currentPrimary)) {
            setValue("basicInfo.primaryCurrency", next[0], opts);
        }

        // Lots using a currency that was just removed fall back to the primary
        if (!checked) {
            const lots = getValues("lots") ?? [];
            lots.forEach((lot, i) => {
                if (lot?.pricing?.currency === code) {
                    setValue(`lots.${i}.pricing.currency`, "", { shouldDirty: true });
                }
            });
        }
    };

    const makePrimary = (code: string) => {
        if (!selected.includes(code)) toggle(code, true);
        setValue("basicInfo.primaryCurrency", code, opts);
    };

    return (
        <div className="mt-6">
            <label className="block mb-2 text-sm font-medium">Auction Currencies</label>

            <p className="mb-4 text-sm text-slate-500">
                Select the currencies lots in this auction can be priced in. The{" "}
                <Star className="inline h-3.5 w-3.5 -mt-0.5 fill-amber-400 text-amber-400" /> primary currency is
                used for settlement and as the default for new lots.
            </p>

            <div className="grid grid-cols-2 gap-3">
                {currencies.map((currency) => {
                    const isSelected = selected.includes(currency.code);
                    const isPrimary = primary === currency.code;

                    return (
                        <div
                            key={currency.code}
                            className={`flex min-h-[48px] w-full items-center gap-3 rounded-md border px-4 py-3 transition ${isSelected ? "border-[#7A3D5E] bg-[#fdf5f9]" : "border-slate-200 bg-white"
                                }`}
                        >
                            <label className="flex flex-1 cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => toggle(currency.code, e.target.checked)}
                                    className="h-4 w-4 shrink-0"
                                />
                                <span className="text-sm text-slate-700">
                                    {currency.code} - {currency.name}
                                    {currency.symbol && (
                                        <span className="ml-1 text-slate-400">({currency.symbol})</span>
                                    )}
                                </span>
                            </label>

                            {isSelected && (
                                <button
                                    type="button"
                                    onClick={() => makePrimary(currency.code)}
                                    title={isPrimary ? "Primary currency" : "Make primary"}
                                    aria-pressed={isPrimary}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${isPrimary
                                        ? "bg-amber-100 text-amber-700"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        }`}
                                >
                                    <Star className={`h-3.5 w-3.5 ${isPrimary ? "fill-amber-400 text-amber-400" : ""}`} />
                                    {isPrimary ? "Primary" : "Set primary"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {loading && <p className="mt-2 text-xs text-slate-400">Loading currencies…</p>}

            {errors.basicInfo?.currency && (
                <p className="mt-2 text-sm text-red-500">Please select at least one currency.</p>
            )}
        </div>
    );
}