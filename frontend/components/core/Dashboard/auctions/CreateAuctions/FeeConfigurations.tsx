"use client";

import { Trash2, Plus } from "lucide-react";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import DashboardFormText from "@/components/common/DashboardFormText";



import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";



type FeeType = "percentage" | "fixed";

type Fee = {
    id: number;
    name: string;
    type: FeeType;
    amount: string;
    custom?: boolean;
    deletable?: boolean;
};
const defaultFees: Fee[] = [
    {
        id: 1,
        name: "Buyer Premium",
        type: "percentage",
        amount: "10",
        deletable: false,
    },
    {
        id: 2,
        name: "Platform Fee",
        type: "fixed",
        amount: "500",
        deletable: true,
    },
    {
        id: 3,
        name: "Tax / GST",
        type: "percentage",
        amount: "10",
        deletable: true,
    },
    {
        id: 4,
        name: "Payment Processing Fee",
        type: "fixed",
        amount: "500",
        deletable: true,
    },
    {
        id: 5,
        name: "Late Payment Fee",
        type: "fixed",
        amount: "500",
        deletable: true,
    },
];
export default function FeeConfiguration() {
    const [fees, setFees] = useState<Fee[]>(defaultFees);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [newFeeName, setNewFeeName] = useState("");
    const [newFeeType, setNewFeeType] =
        useState<FeeType>("percentage");
    const [newFeeAmount, setNewFeeAmount] = useState("");


    const handleTypeChange = (
        id: number,
        type: FeeType
    ) => {
        setFees((prev) =>
            prev.map((fee) =>
                fee.id === id
                    ? {
                        ...fee,
                        type,
                    }
                    : fee
            )
        );
    };


    const handleAmountChange = (
        id: number,
        amount: string
    ) => {
        setFees((prev) =>
            prev.map((fee) =>
                fee.id === id
                    ? {
                        ...fee,
                        amount,
                    }
                    : fee
            )
        );
    };


    const handleDelete = (id: number) => {
        setFees((prev) =>
            prev.filter((fee) => fee.id !== id)
        );
    };


    const handleAddCustomFee = () => {
        if (!newFeeName.trim() || !newFeeAmount.trim()) {
            return;
        }

        const newFee: Fee = {
            id: Date.now(),
            name: newFeeName,
            type: newFeeType,
            amount: newFeeAmount,
            custom: true,
            deletable: true,
        };

        setFees((prev) => [...prev, newFee]);


        setNewFeeName("");
        setNewFeeType("percentage");
        setNewFeeAmount("");

        setIsDialogOpen(false);
    };
    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_332px]">

            <div className="rounded-lg bg-dashboardFormBg p-6">
                <DashboardFormText text="Fee Configuration" />


                <div className="grid grid-cols-[1.5fr_1fr_1fr_44px] gap-4 pt-6  mb-4">

                    <div className="text-sm font-semibold text-slate-600">
                        Fee platform
                    </div>

                    <div className="text-sm font-semibold text-slate-600">
                        Type
                    </div>

                    <div className="text-sm font-semibold text-slate-600">
                        Amount
                    </div>

                    <div className="text-sm font-semibold text-slate-600">
                        Action
                    </div>

                </div>

                <div className="space-y-3">

                    {fees.map((fee) => (
                        <div
                            key={fee.id}
                            className="grid grid-cols-[1.5fr_1fr_1fr_44px] gap-4 items-center"
                        >

                            <div className="h-11 flex items-center rounded-lg bg-white px-3">
                                <span className="text-sm font-semibold text-slate-800">
                                    {fee.name}
                                    {fee.name === "Buyer Premium" && (
                                        <span className="text-red-500">
                                            *
                                        </span>
                                    )}
                                </span>
                            </div>

                            <div className="h-11 rounded-lg bg-[#ebe7e7] p-1 flex">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleTypeChange(
                                            fee.id,
                                            "percentage"
                                        )
                                    }
                                    className={`
                                        flex-1 rounded-md text-xs font-medium
                                        transition-all
                                        ${fee.type === "percentage"
                                            ? "bg-white text-[#914968] shadow-sm"
                                            : "text-gray-600"
                                        }
                                    `}
                                >
                                    Percentage
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleTypeChange(
                                            fee.id,
                                            "fixed"
                                        )
                                    }
                                    className={`
                                        flex-1 rounded-md text-xs font-medium
                                        transition-all
                                        ${fee.type === "fixed"
                                            ? "bg-white text-[#914968] shadow-sm"
                                            : "text-slate-500"
                                        }
                                    `}
                                >
                                    Fixed
                                </button>

                            </div>

                            <div className="relative">

                                {fee.type === "fixed" && (
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                                        ₹
                                    </span>
                                )}

                                <Input
                                    value={fee.amount}
                                    onChange={(e) =>
                                        handleAmountChange(
                                            fee.id,
                                            e.target.value
                                        )
                                    }
                                    className={`
                                        h-11 bg-white border-0
                                        ${fee.type === "fixed"
                                            ? "pl-7"
                                            : "pr-8"
                                        }
                                    `}
                                />

                                {fee.type === "percentage" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                        %
                                    </span>
                                )}

                            </div>

                            {fee.deletable !== false ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(fee.id)}
                                    className="
            h-11 w-11
            border-red-500
            text-red-500
            hover:bg-red-50
            hover:text-red-600
        "
                                >
                                    <Trash2 size={17} />
                                </Button>
                            ) : (
                                <div className="h-11 w-11" />
                            )}

                        </div>
                    ))}

                </div>


                <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="
                        mt-5
                        h-11
                        w-full
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        text-sm
                        font-semibold
                        text-[#914968]
                        flex
                        items-center
                        justify-center
                        gap-2
                        hover:bg-slate-50
                        transition
                    "
                >
                    <Plus size={18} />
                    Add Custom Charge
                </button>

            </div>


            <Dialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            >
                <DialogContent className="sm:max-w-[500px]">

                    <DialogHeader>
                        <DialogTitle>
                            Add Custom Charge
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-4">

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">
                                Fee Platform
                            </label>

                            <Input
                                placeholder="Enter fee name"
                                value={newFeeName}
                                onChange={(e) =>
                                    setNewFeeName(
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">
                                Type
                            </label>

                            <div className="h-11 rounded-lg bg-slate-200 p-1 flex">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setNewFeeType(
                                            "percentage"
                                        )
                                    }
                                    className={`
                                        flex-1 rounded-md text-sm
                                        ${newFeeType ===
                                            "percentage"
                                            ? "bg-white text-[#914968] shadow-sm font-semibold"
                                            : "text-slate-500"
                                        }
                                    `}
                                >
                                    Percentage
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setNewFeeType("fixed")
                                    }
                                    className={`
                                        flex-1 rounded-md text-sm
                                        ${newFeeType === "fixed"
                                            ? "bg-white text-[#914968] shadow-sm font-semibold"
                                            : "text-slate-500"
                                        }
                                    `}
                                >
                                    Fixed
                                </button>

                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">
                                Amount
                            </label>

                            <div className="relative">

                                {newFeeType === "fixed" && (
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                        ₹
                                    </span>
                                )}

                                <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={newFeeAmount}
                                    onChange={(e) =>
                                        setNewFeeAmount(
                                            e.target.value
                                        )
                                    }
                                    className={
                                        newFeeType === "fixed"
                                            ? "pl-7"
                                            : "pr-8"
                                    }
                                />

                                {newFeeType === "percentage" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                        %
                                    </span>
                                )}

                            </div>
                        </div>

                    </div>

                    <DialogFooter>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setIsDialogOpen(false)
                            }
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




            <div className="space-y-4">

                <div className="rounded-[12px] border border-slate-100 bg-white p-4 shadow-sm">

                    <div className="mb-3 flex items-center justify-between">
                        <DashboardFormText text="Live Calculation Example" />

                        <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-medium uppercase text-emerald-600">
                            Preview
                        </span>
                    </div>

                    <p className="mb-4 text-xs text-slate-500">
                        Estimated total for a winning bid of ₹1,00,000
                    </p>

                    <div className="space-y-3 text-xs">

                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                Artwork Winning Bid
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹1,00,000
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                Buyer Premium (10%)
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹10,000
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                GST (18% on Premium)
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹1,800
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                Platform Charges (2%)
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹2,000
                            </span>
                        </div>

                    </div>

                    <div className="my-3 border-t border-slate-200" />

                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-700">
                            Estimated Total
                        </span>

                        <span className="text-sm font-bold text-[#7c365c]">
                            ₹1,13,800
                        </span>
                    </div>

                </div>


                <div className="rounded-[12px] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <DashboardFormText text="Collateral Settings" />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Security Deposit Amount
                        </label>

                        <Input
                            type="text"
                            placeholder="e.g. 5000"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                    </div>

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Refund & Clawback Rules
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="">
                                Fully Refundable on Loss
                            </option>

                            <option value="live">
                                Live Auction
                            </option>

                            <option value="online">
                                Online Auction
                            </option>
                        </select>
                    </div>
                </div>

            </div>

        </div >
    );
}


type FeeRowProps = {
    name: string;
    required?: boolean;
    type: "percentage" | "fixed";
    amount: string;
};

function FeeRow({
    name,
    required,
    type,
    amount,
}: FeeRowProps) {
    return (
        <div className="grid grid-cols-[1.4fr_1fr_1fr_36px] items-center gap-3">

            {/* NAME */}
            <div className="flex h-9 items-center rounded-md bg-slate-50 px-3 text-xs font-medium text-slate-800">
                {name}

                {required && (
                    <span className="ml-0.5 text-red-500">*</span>
                )}
            </div>

            {/* TYPE */}
            <div className="flex h-9 rounded-md bg-slate-100 p-0.5">

                <button
                    type="button"
                    className={`
                        flex-1 rounded-md text-[11px] font-medium
                        ${type === "percentage"
                            ? "bg-white text-[#7c365c] shadow-sm"
                            : "text-slate-500"
                        }
                    `}
                >
                    Percentage
                </button>

                <button
                    type="button"
                    className={`
                        flex-1 rounded-md text-[11px] font-medium
                        ${type === "fixed"
                            ? "bg-white text-[#7c365c] shadow-sm"
                            : "text-slate-500"
                        }
                    `}
                >
                    Fixed
                </button>

            </div>

            {/* AMOUNT */}
            <div className="flex h-9 items-center rounded-md bg-slate-50 px-3 text-xs font-medium text-slate-800">
                {amount}
            </div>

            {/* DELETE */}
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="
                    h-9
                    w-9
                    border-red-400
                    text-red-500
                    hover:bg-red-50
                    hover:text-red-600
                "
            >
                <Trash2 className="h-4 w-4" />
            </Button>

        </div>
    );
}

