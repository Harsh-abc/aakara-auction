"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";

import { AuthField, AuthFieldError, authInputClass, authInputErrorClass, authLabelClass } from "@/components/core/auth/registration/AuthField";
import { useAppSelector } from "@/hooks/redux";
import { AUCTION_EMAIL } from "@/lib/constants/site-text";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import { getPublicAuctions } from "@/services/operations/publicAuction.api";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW, SectionHeading } from "../storefront";

/*
 * "Absentee bid" (client PDF): a bidder who can't follow the sale leaves a maximum bid per lot.
 * Frontend only for now — the submission is validated and confirmed on screen but not sent anywhere
 * until the absentee bid API exists (see handleSubmit).
 */

type LotRow = { id: number; lotNumber: string; title: string; maxBid: string };
type Errors = Record<string, string | undefined>;

const MAX_LOTS = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{7,15}$/;

// the house increment chart (backend utils/bidIncrement.js) — keep in step with it
const increments = [
    { range: "₹10,000 – ₹20,000", step: "₹1,000" },
    { range: "₹20,000 – ₹30,000", step: "₹2,000" },
    { range: "₹30,000 – ₹50,000", step: "₹2,000 / ₹3,000 (₹32,000, ₹35,000, ₹38,000, ₹40,000…)" },
    { range: "₹50,000 – ₹1,00,000", step: "₹5,000" },
];

// 1500000 → "15,00,000"
const formatAmount = (digits: string) => (digits ? Number(digits).toLocaleString("en-IN") : "");

function validate({ auctionUuid, name, email, phone, lots, acceptTerms }: { auctionUuid: string; name: string; email: string; phone: string; lots: LotRow[]; acceptTerms: boolean }) {
    const errors: Errors = {};
    if (!auctionUuid) errors["absentee-sale"] = "Choose the sale you are bidding in";
    if (!name.trim()) errors["absentee-name"] = "Enter your full name";
    if (!email.trim()) errors["absentee-email"] = "Enter your email";
    else if (!EMAIL_PATTERN.test(email.trim())) errors["absentee-email"] = "Enter a valid email";
    if (!phone.trim()) errors["absentee-phone"] = "Enter your phone number";
    else if (!PHONE_PATTERN.test(phone.trim())) errors["absentee-phone"] = "Enter a valid phone number, with country code";

    const seen = new Set<string>();
    lots.forEach((lot) => {
        const lotNumber = lot.lotNumber.trim().toUpperCase();
        if (!lotNumber) errors[`lot-${lot.id}-number`] = "Enter the lot number";
        else if (seen.has(lotNumber)) errors[`lot-${lot.id}-number`] = "This lot is already listed";
        seen.add(lotNumber);
        if (!Number(lot.maxBid)) errors[`lot-${lot.id}-max`] = "Enter your maximum bid";
    });

    if (!acceptTerms) errors["absentee-terms"] = "Please accept the terms & conditions of sale";
    return errors;
}

export function AbsenteeBid() {
    const user = useAppSelector((state) => state.auth.user);
    const userName = user ? [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") : "";

    const [sales, setSales] = useState<PublicAuction[] | null>(null);
    const [auctionUuid, setAuctionUuid] = useState("");

    // null until typed in: follows the signed-in account until then
    const [nameInput, setName] = useState<string | null>(null);
    const [emailInput, setEmail] = useState<string | null>(null);
    const name = nameInput ?? userName;
    const email = emailInput ?? user?.email ?? "";
    const [phone, setPhone] = useState("");
    const [paddle, setPaddle] = useState("");

    const nextLotId = useRef(1);
    const [lots, setLots] = useState<LotRow[]>([{ id: 0, lotNumber: "", title: "", maxBid: "" }]);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const [errors, setErrors] = useState<Errors>({});
    const [submitted, setSubmitted] = useState(false);

    // the sales still to come (or live) — the ones an absentee bid can be left for
    useEffect(() => {
        let cancelled = false;
        getPublicAuctions({ type: "upcoming", page: 1, limit: 50 })
            .then((data) => {
                if (cancelled) return;
                setSales(data.auctions);
                if (data.auctions.length === 1) setAuctionUuid(data.auctions[0].uuid);
            })
            .catch(() => {
                if (!cancelled) setSales([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const sale = sales?.find((item) => item.uuid === auctionUuid);
    const currencySymbol = sale?.currency.symbol ?? sale?.currency.code ?? "₹";

    const clearError = (key: string) => setErrors((prev) => ({ ...prev, [key]: undefined }));

    const updateLot = (id: number, patch: Partial<LotRow>) => setLots((prev) => prev.map((lot) => (lot.id === id ? { ...lot, ...patch } : lot)));

    const addLot = () => setLots((prev) => [...prev, { id: nextLotId.current++, lotNumber: "", title: "", maxBid: "" }]);

    const removeLot = (id: number) => setLots((prev) => prev.filter((lot) => lot.id !== id));

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const validationErrors = validate({ auctionUuid, name, email, phone, lots, acceptTerms });
        const firstInvalid = Object.keys(validationErrors).find((key) => validationErrors[key]);
        if (firstInvalid) {
            setErrors(validationErrors);
            document.getElementById(firstInvalid)?.focus();
            return;
        }

        // TODO: POST this once the absentee bid API exists, and only then show the confirmation
        // {
        //     auctionUuid, name: name.trim(), email: email.trim(), phone: phone.trim(), paddleNumber: paddle.trim() || null,
        //     lots: lots.map((lot) => ({ lotNumber: lot.lotNumber.trim(), title: lot.title.trim() || null, maxBid: Number(lot.maxBid) })),
        //     acceptTerms: true,
        // }
        setSubmitted(true);
    };

    const startOver = () => {
        setLots([{ id: nextLotId.current++, lotNumber: "", title: "", maxBid: "" }]);
        setAcceptTerms(false);
        setErrors({});
        setSubmitted(false);
    };

    return (
        <section id="absentee-bid-online" aria-labelledby="absentee-bid-online-heading" className="scroll-mt-24">
            <div className="page-container">
                <SectionHeading
                    id="absentee-bid-online-heading"
                    title="Absentee bid"
                    description="Can't follow the sale live? Leave your maximum bid for each lot and we will bid on your behalf, up to that amount."
                />

                <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {submitted ? (
                        <div className="flex flex-col items-start gap-4 border border-[#cecece] bg-white p-6">
                            <p className={EYEBROW}>Absentee bid received</p>
                            <h3 className="text-[18px] leading-7 font-medium text-[#0d0d0d]">Thank you{name ? `, ${name.trim()}` : ""}</h3>
                            <p className={BODY}>
                                Your bids for {sale?.title ?? "this sale"} on {lots.length} {lots.length === 1 ? "lot" : "lots"} have been sent to our team. We will confirm them by email at{" "}
                                <span className="text-[#0d0d0d]">{email.trim()}</span> before the sale.
                            </p>
                            <ul className="w-full divide-y divide-[#ececec] border-y border-[#ececec]">
                                {lots.map((lot) => (
                                    <li key={lot.id} className="flex justify-between gap-4 py-2 text-[14px] leading-5">
                                        <span className="text-[#0d0d0d]">
                                            Lot {lot.lotNumber.trim()}
                                            {lot.title.trim() && <span className="text-[#717171]"> · {lot.title.trim()}</span>}
                                        </span>
                                        <span className="whitespace-nowrap text-[#0d0d0d]">
                                            {currencySymbol}
                                            {formatAmount(lot.maxBid)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <button type="button" onClick={startOver} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                Leave another absentee bid
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
                            {/* the sale */}
                            <div>
                                <label htmlFor="absentee-sale" className={authLabelClass}>
                                    Sale
                                </label>
                                <div className="relative">
                                    <select
                                        id="absentee-sale"
                                        value={auctionUuid}
                                        onChange={(event) => {
                                            setAuctionUuid(event.target.value);
                                            clearError("absentee-sale");
                                        }}
                                        disabled={!sales?.length}
                                        aria-invalid={errors["absentee-sale"] ? true : undefined}
                                        aria-describedby={errors["absentee-sale"] ? "absentee-sale-error" : undefined}
                                        className={cn(authInputClass, "cursor-pointer appearance-none truncate pr-10", errors["absentee-sale"] && authInputErrorClass)}
                                    >
                                        <option value="" disabled>
                                            {sales === null ? "Loading sales…" : sales.length === 0 ? "No upcoming sales right now" : "Select a sale"}
                                        </option>
                                        {sales?.map((item) => (
                                            <option key={item.uuid} value={item.uuid}>
                                                {item.title}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#717171]" />
                                </div>
                                <AuthFieldError id="absentee-sale-error" message={errors["absentee-sale"]} />
                            </div>

                            {/* the bidder */}
                            <fieldset className="flex flex-col gap-4">
                                <legend className="mb-4 text-[14px] leading-5 font-medium text-[#0d0d0d]">Your details</legend>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <AuthField
                                        id="absentee-name"
                                        label="Full name"
                                        autoComplete="name"
                                        maxLength={120}
                                        value={name}
                                        onChange={(event) => {
                                            setName(event.target.value);
                                            clearError("absentee-name");
                                        }}
                                        error={errors["absentee-name"]}
                                    />
                                    <AuthField
                                        id="absentee-email"
                                        label="Email"
                                        type="email"
                                        autoComplete="email"
                                        maxLength={255}
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            clearError("absentee-email");
                                        }}
                                        error={errors["absentee-email"]}
                                    />
                                    <AuthField
                                        id="absentee-phone"
                                        label="Phone"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="+91 98200 00000"
                                        maxLength={20}
                                        value={phone}
                                        onChange={(event) => {
                                            setPhone(event.target.value);
                                            clearError("absentee-phone");
                                        }}
                                        error={errors["absentee-phone"]}
                                    />
                                    <AuthField
                                        id="absentee-paddle"
                                        label="Paddle number (optional)"
                                        maxLength={20}
                                        value={paddle}
                                        onChange={(event) => setPaddle(event.target.value)}
                                    />
                                </div>
                            </fieldset>

                            {/* the lots */}
                            <fieldset>
                                <legend className="mb-4 text-[14px] leading-5 font-medium text-[#0d0d0d]">Your bids</legend>
                                <ol className="flex flex-col gap-3">
                                    {lots.map((lot, index) => (
                                        <li key={lot.id} className="grid grid-cols-1 gap-3 border border-[#cecece] bg-white p-4 sm:grid-cols-[120px_minmax(0,1fr)_180px_auto] sm:items-start">
                                            <AuthField
                                                id={`lot-${lot.id}-number`}
                                                label="Lot no."
                                                maxLength={12}
                                                value={lot.lotNumber}
                                                onChange={(event) => {
                                                    updateLot(lot.id, { lotNumber: event.target.value });
                                                    clearError(`lot-${lot.id}-number`);
                                                }}
                                                error={errors[`lot-${lot.id}-number`]}
                                            />
                                            <AuthField
                                                id={`lot-${lot.id}-title`}
                                                label="Artist / title (optional)"
                                                maxLength={200}
                                                value={lot.title}
                                                onChange={(event) => updateLot(lot.id, { title: event.target.value })}
                                            />
                                            <AuthField
                                                id={`lot-${lot.id}-max`}
                                                label={`Maximum bid (${currencySymbol})`}
                                                inputMode="numeric"
                                                placeholder="e.g. 1,50,000"
                                                value={formatAmount(lot.maxBid)}
                                                onChange={(event) => {
                                                    updateLot(lot.id, { maxBid: event.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12) });
                                                    clearError(`lot-${lot.id}-max`);
                                                }}
                                                error={errors[`lot-${lot.id}-max`]}
                                            />
                                            {lots.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLot(lot.id)}
                                                    aria-label={`Remove bid ${index + 1}`}
                                                    className="inline-flex size-11.5 cursor-pointer items-center justify-center self-end border border-[#cecece] text-[#717171] transition-colors hover:border-[#0d0d0d] hover:text-[#0d0d0d] sm:mt-6.25"
                                                >
                                                    <X className="size-4" strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                                {lots.length < MAX_LOTS && (
                                    <button type="button" onClick={addLot} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "mt-3")}>
                                        + Add another lot
                                    </button>
                                )}
                            </fieldset>

                            <div>
                                <label htmlFor="absentee-terms" className="flex w-fit cursor-pointer items-start gap-3 text-[14px] leading-5 text-[#0d0d0d]">
                                    <input
                                        id="absentee-terms"
                                        type="checkbox"
                                        checked={acceptTerms}
                                        onChange={(event) => {
                                            setAcceptTerms(event.target.checked);
                                            clearError("absentee-terms");
                                        }}
                                        aria-describedby={errors["absentee-terms"] ? "absentee-terms-error" : undefined}
                                        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded-none accent-[#0d0d0d]"
                                    />
                                    <span>
                                        I authorise Akara to bid on my behalf up to the amounts above, and I accept the{" "}
                                        <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-[#673364]">
                                            terms & conditions of sale
                                        </Link>
                                        .
                                    </span>
                                </label>
                                <AuthFieldError id="absentee-terms-error" message={errors["absentee-terms"]} />
                            </div>

                            <div>
                                <button type="submit" className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                    Submit absentee bid
                                </button>
                            </div>
                        </form>
                    )}

                    {/* how bids rise, next to the form */}
                    <aside aria-labelledby="bidding-increments-heading" className="h-fit bg-[#f4f2ef] p-5 md:p-6">
                        <h3 id="bidding-increments-heading" className="text-[14px] leading-5 font-medium text-[#0d0d0d]">
                            Bidding increments
                        </h3>
                        <table className="mt-3 w-full text-left text-[14px] leading-[22.75px]">
                            <thead>
                                <tr className="border-b border-[#cecece] text-[11px] tracking-[0.16em] text-[#717171] uppercase">
                                    <th className="py-2 pr-4 font-normal">Current bid</th>
                                    <th className="py-2 font-normal">Increment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {increments.map((row) => (
                                    <tr key={row.range} className="border-b border-[#e2ded8] align-top">
                                        <td className="py-2 pr-4 whitespace-nowrap text-[#0d0d0d]">{row.range}</td>
                                        <td className="py-2 text-[#717171]">{row.step}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className={cn(BODY, "mt-3")}>
                            The same steps repeat at every level — e.g. ₹1,00,000 – ₹2,00,000 rises by ₹10,000. A sale may set its own increments; the next valid bid is always shown on the lot page.
                        </p>
                        <p className={cn(BODY, "mt-3")}>
                            Questions?{" "}
                            <a href={`mailto:${AUCTION_EMAIL}`} className="text-[#0d0d0d] underline underline-offset-2 hover:text-[#673364]">
                                {AUCTION_EMAIL}
                            </a>
                        </p>
                    </aside>
                </div>
            </div>
        </section>
    );
}
