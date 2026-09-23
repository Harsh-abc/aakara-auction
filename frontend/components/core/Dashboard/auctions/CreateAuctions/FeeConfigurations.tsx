"use client";

import { Trash2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import DashboardFormText from "@/components/common/DashboardFormText";

import {
    AuctionFormData,
    AuctionFeeForm,
} from "@/lib/types/AuctionsFormData";

// =====================================================================
// TYPES & DEFAULTS
// =====================================================================

type CalcType = "percentage" | "fixed";

type Fee = {
    id: number;
    feeType: AuctionFeeForm["feeType"];
    name: string;
    type: CalcType;
    amount: string;
    deletable: boolean;
};

const defaultFees: Fee[] = [
    { id: 1, feeType: "BUYER_PREMIUM", name: "Buyer Premium", type: "percentage", amount: "10", deletable: false },
    { id: 2, feeType: "PLATFORM_FEE", name: "Platform Fee", type: "fixed", amount: "500", deletable: true },
    { id: 3, feeType: "TAX_GST", name: "Tax / GST", type: "percentage", amount: "18", deletable: true },
    { id: 4, feeType: "PAYMENT_PROCESSING", name: "Payment Processing Fee", type: "fixed", amount: "500", deletable: true },
    { id: 5, feeType: "LATE_PAYMENT", name: "Late Payment Fee", type: "fixed", amount: "500", deletable: true },
];

const EXAMPLE_BID = 100000;

const formatINR = (value: number) =>
    `₹${Math.round(value).toLocaleString("en-IN")}`;

/** UI rows -> React Hook Form shape (what buildAuctionFormData sends) */
const toFormFees = (fees: Fee[]): AuctionFeeForm[] =>
    fees.map((fee, index) => ({
        feeType: fee.feeType,
        name: fee.name,
        calculationType: fee.type === "percentage" ? "PERCENTAGE" : "FIXED",
        value: Number(fee.amount) || 0,
        description: "",
        isActive: true,
        sortOrder: index,
    }));

/** React Hook Form shape -> UI rows (restores state when revisiting the step) */
const fromFormFees = (fees: AuctionFeeForm[]): Fee[] =>
    fees.map((fee, index) => ({
        id: index + 1,
        feeType: fee.feeType,
        name: fee.name,
        type: fee.calculationType === "PERCENTAGE" ? "percentage" : "fixed",
        amount: fee.value === null || fee.value === undefined ? "" : String(fee.value),
        deletable: fee.feeType !== "BUYER_PREMIUM",
    }));

// =====================================================================
// COMPONENT
// =====================================================================

export default function FeeConfiguration() {
    const { setValue, getValues } = useFormContext<AuctionFormData>();

    // Restore from the form if this step was visited before, otherwise defaults
    const [fees, setFees] = useState<Fee[]>(() => {
        const saved = getValues("fees");
        return saved && saved.length > 0 ? fromFormFees(saved) : defaultFees;
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newFeeName, setNewFeeName] = useState("");
    const [newFeeType, setNewFeeType] = useState<CalcType>("percentage");
    const [newFeeAmount, setNewFeeAmount] = useState("");
    const [dialogError, setDialogError] = useState<string | null>(null);

    /** Update local rows AND the form in one place (outside any state updater). */
    const commitFees = (updatedFees: Fee[]) => {
        setFees(updatedFees);
        setValue("fees", toFormFees(updatedFees), {
            shouldDirty: true,
            shouldTouch: true,
        });
    };

    // Seed the form with defaults only on the very first visit
    useEffect(() => {
        const saved = getValues("fees");
        if (!saved || saved.length === 0) {
            setValue("fees", toFormFees(defaultFees));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =================================================================
    // HANDLERS
    // =================================================================

    const handleTypeChange = (id: number, type: CalcType) => {
        commitFees(fees.map((fee) => (fee.id === id ? { ...fee, type } : fee)));
    };

    const handleAmountChange = (id: number, amount: string) => {
        // block negatives; allow empty while typing
        if (amount !== "" && Number(amount) < 0) return;
        commitFees(fees.map((fee) => (fee.id === id ? { ...fee, amount } : fee)));
    };

    const handleDelete = (id: number) => {
        commitFees(fees.filter((fee) => fee.id !== id));
    };

    const resetDialog = () => {
        setNewFeeName("");
        setNewFeeType("percentage");
        setNewFeeAmount("");
        setDialogError(null);
    };

    const handleAddCustomFee = () => {
        const name = newFeeName.trim();
        const amount = Number(newFeeAmount);

        if (!name) return setDialogError("Enter a fee name");
        if (newFeeAmount.trim() === "" || !Number.isFinite(amount) || amount < 0) {
            return setDialogError("Enter a valid amount");
        }
        if (newFeeType === "percentage" && amount > 100) {
            return setDialogError("Percentage cannot exceed 100");
        }
        if (fees.some((fee) => fee.name.toLowerCase() === name.toLowerCase())) {
            return setDialogError("A fee with this name already exists");
        }

        commitFees([
            ...fees,
            {
                id: Date.now(),
                feeType: "CUSTOM",
                name,
                type: newFeeType,
                amount: newFeeAmount,
                deletable: true,
            },
        ]);

        resetDialog();
        setIsDialogOpen(false);
    };

    // =================================================================
    // LIVE CALCULATION (uses the real configured fees)
    // =================================================================

    const calculation = useMemo(() => {
        const valueOf = (fee: Fee, base: number) => {
            const amount = Number(fee.amount) || 0;
            return fee.type === "percentage" ? (base * amount) / 100 : amount;
        };

        const premiumFee = fees.find((f) => f.feeType === "BUYER_PREMIUM");
        const premium = premiumFee ? valueOf(premiumFee, EXAMPLE_BID) : 0;

        const rows: { label: string; value: number }[] = [];

        if (premiumFee) {
            rows.push({
                label: `Buyer Premium${premiumFee.type === "percentage" ? ` (${premiumFee.amount || 0}%)` : ""}`,
                value: premium,
            });
        }

        fees.forEach((fee) => {
            // Premium shown above; late fee only applies if payment is late
            if (fee.feeType === "BUYER_PREMIUM" || fee.feeType === "LATE_PAYMENT") return;

            // GST is charged on the buyer premium
            const base = fee.feeType === "TAX_GST" ? premium : EXAMPLE_BID;
            const suffix =
                fee.type === "percentage"
                    ? ` (${fee.amount || 0}%${fee.feeType === "TAX_GST" ? " on Premium" : ""})`
                    : "";

            rows.push({ label: `${fee.name}${suffix}`, value: valueOf(fee, base) });
        });

        const total = EXAMPLE_BID + rows.reduce((sum, r) => sum + r.value, 0);

        return { rows, total };
    }, [fees]);

    // =================================================================
    // RENDER
    // =================================================================

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_332px]">

            {/* ================= FEE CONFIGURATION ================= */}

            <div className="rounded-lg bg-dashboardFormBg p-6">
                <DashboardFormText text="Fee Configuration" />

                <div className="grid grid-cols-[1.5fr_1fr_1fr_44px] gap-4 pt-6 mb-4">
                    <div className="text-sm font-semibold text-slate-600">Fee platform</div>
                    <div className="text-sm font-semibold text-slate-600">Type</div>
                    <div className="text-sm font-semibold text-slate-600">Amount</div>
                    <div className="text-sm font-semibold text-slate-600">Action</div>
                </div>

                <div className="space-y-3">
                    {fees.map((fee) => (
                        <div
                            key={fee.id}
                            className="grid grid-cols-[1.5fr_1fr_1fr_44px] gap-4 items-center"
                        >
                            {/* NAME */}
                            <div className="h-11 flex items-center rounded-lg bg-white px-3">
                                <span className="text-sm font-semibold text-slate-800">
                                    {fee.name}
                                    {fee.feeType === "BUYER_PREMIUM" && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </span>
                            </div>

                            {/* TYPE */}
                            <div className="h-11 rounded-lg bg-[#ebe7e7] p-1 flex">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange(fee.id, "percentage")}
                                    className={`flex-1 rounded-md text-xs font-medium transition-all ${fee.type === "percentage"
                                        ? "bg-white text-[#914968] shadow-sm"
                                        : "text-gray-600"
                                        }`}
                                >
                                    Percentage
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTypeChange(fee.id, "fixed")}
                                    className={`flex-1 rounded-md text-xs font-medium transition-all ${fee.type === "fixed"
                                        ? "bg-white text-[#914968] shadow-sm"
                                        : "text-slate-500"
                                        }`}
                                >
                                    Fixed
                                </button>
                            </div>

                            {/* AMOUNT */}
                            <div className="relative">
                                {fee.type === "fixed" && (
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">₹</span>
                                )}

                                <Input
                                    type="number"
                                    min={0}
                                    max={fee.type === "percentage" ? 100 : undefined}
                                    value={fee.amount}
                                    onChange={(e) => handleAmountChange(fee.id, e.target.value)}
                                    className={`h-11 bg-white border-0 ${fee.type === "fixed" ? "pl-7" : "pr-8"}`}
                                />

                                {fee.type === "percentage" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
                                )}
                            </div>

                            {/* DELETE */}
                            {fee.deletable ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(fee.id)}
                                    className="h-11 w-11 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 size={17} />
                                </Button>
                            ) : (
                                <div className="h-11 w-11" />
                            )}
                        </div>
                    ))}
                </div>

                {/* ADD CUSTOM FEE */}
                <button
                    type="button"
                    onClick={() => {
                        resetDialog();
                        setIsDialogOpen(true);
                    }}
                    className="mt-5 h-11 w-full rounded-lg border border-slate-200 bg-white text-sm font-semibold text-[#914968] flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                >
                    <Plus size={18} />
                    Add Custom Charge
                </button>
            </div>

            {/* ================= CUSTOM FEE DIALOG ================= */}

            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetDialog();
                }}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Custom Charge</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        {/* NAME */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Fee Platform</label>
                            <Input
                                placeholder="Enter fee name"
                                value={newFeeName}
                                onChange={(e) => {
                                    setNewFeeName(e.target.value);
                                    setDialogError(null);
                                }}
                            />
                        </div>

                        {/* TYPE */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Type</label>
                            <div className="h-11 rounded-lg bg-slate-200 p-1 flex">
                                <button
                                    type="button"
                                    onClick={() => setNewFeeType("percentage")}
                                    className={`flex-1 rounded-md text-sm ${newFeeType === "percentage"
                                        ? "bg-white text-[#914968] shadow-sm font-semibold"
                                        : "text-slate-500"
                                        }`}
                                >
                                    Percentage
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNewFeeType("fixed")}
                                    className={`flex-1 rounded-md text-sm ${newFeeType === "fixed"
                                        ? "bg-white text-[#914968] shadow-sm font-semibold"
                                        : "text-slate-500"
                                        }`}
                                >
                                    Fixed
                                </button>
                            </div>
                        </div>

                        {/* AMOUNT */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Amount</label>
                            <div className="relative">
                                {newFeeType === "fixed" && (
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                                )}

                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="Enter amount"
                                    value={newFeeAmount}
                                    onChange={(e) => {
                                        setNewFeeAmount(e.target.value);
                                        setDialogError(null);
                                    }}
                                    className={newFeeType === "fixed" ? "pl-7" : "pr-8"}
                                />

                                {newFeeType === "percentage" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
                                )}
                            </div>
                        </div>

                        {dialogError && (
                            <p className="text-sm text-red-500">{dialogError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            onClick={handleAddCustomFee}
                            className="bg-[#914968] hover:bg-[#7d3e59]"
                        >
                            Add Charge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================= RIGHT SIDE ================= */}

            <div className="space-y-4">

                {/* LIVE CALCULATION */}
                <div className="rounded-[12px] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <DashboardFormText text="Live Calculation Example" />
                        <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-medium uppercase text-emerald-600">
                            Preview
                        </span>
                    </div>

                    <p className="mb-4 text-xs text-slate-500">
                        Estimated total for a winning bid of {formatINR(EXAMPLE_BID)}
                    </p>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Artwork Winning Bid</span>
                            <span className="font-semibold text-slate-800">{formatINR(EXAMPLE_BID)}</span>
                        </div>

                        {calculation.rows.map((row) => (
                            <div key={row.label} className="flex justify-between gap-3">
                                <span className="text-slate-600">{row.label}</span>
                                <span className="font-semibold text-slate-800">{formatINR(row.value)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="my-3 border-t border-slate-200" />

                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-700">Estimated Total</span>
                        <span className="text-sm font-bold text-[#7c365c]">{formatINR(calculation.total)}</span>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-400">
                        Late payment fee is excluded — it applies only if payment is overdue.
                    </p>
                </div>

                {/* COLLATERAL
                    NOTE: not saved yet. The Auction model has no deposit fields;
                    AuctionParticipant.depositAmount is per-bidder. Wire this up
                    (e.g. as an AuctionRule REGISTRATION_DEPOSIT) in a later step. */}
                <div className="rounded-[12px] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <DashboardFormText text="Collateral Settings" />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">Security Deposit Amount</label>
                        <Input
                            type="text"
                            placeholder="e.g. 5000"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper mt-4">
                        <label className="block mb-2">Refund & Clawback Rules</label>
                        <select className="w-full border rounded-md px-3 py-2">
                            <option value="">Fully Refundable on Loss</option>
                            <option value="live">Live Auction</option>
                            <option value="online">Online Auction</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}