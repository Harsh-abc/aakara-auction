"use client";

import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import Stepper from "@/components/core/Dashboard/auctions/AuctionStepper";
import AuctionSchedule from "@/components/core/Dashboard/auctions/CreateAuctions/AuctionSchedule";
import BasicInfo from "@/components/core/Dashboard/auctions/CreateAuctions/BasicInfo";
import AddLots from "@/components/core/Dashboard/auctions/CreateAuctions/Lots";
import FeeConfiguration from "@/components/core/Dashboard/auctions/CreateAuctions/FeeConfigurations";
import ShippingInfo from "@/components/core/Dashboard/auctions/CreateAuctions/ShippingInfo";
import AuctionVisibility from "@/components/core/Dashboard/auctions/CreateAuctions/AuctionVisbility";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { createAuction } from "@/services/operations/auction.api";
import { clearAuctionState } from "@/redux/slices/auctionSlice"; // adjust path to your slice
import {
    buildAuctionFormData,
    validateAuctionForm,
} from "@/utils/buildAuctionFormData";

import { RootState, AppDispatch } from "@/redux/store";
import { useRouter } from "next/navigation";

const DEFAULT_VALUES: AuctionFormData = {
    basicInfo: {
        auctionName: "",
        auctionId: "",
        auctionType: "FLOOR",
        description: "",
        shortDescription: "",
        categoryUuid: "",
        subCategoryUuid: "",
        auctionLocation: "",
        auctionTags: [],
        currency: ["INR"],
        coverImage: null,
    },
    schedule: {
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        previewStartAt: "",
        registrationRequired: true,
        registrationStarts: "",
        registrationDeadline: "",
        timezone: "Asia/Kolkata",
        auctionExtensionTime: null,
    },
    lots: [],
    fees: [], // FeeConfiguration seeds defaults on first visit
    shipping: {
        shippingStrategy: "SHIPPING_CALCULATED_SEPARATELY",
        isOnline: true,
        venue: "",
        shippingInfo: "",
    },
    visibility: {
        visibility: "REGISTERED_USERS_ONLY",
        termsAndConditions: "",
    },
};

export default function CreateAuctions() {
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>();

    const { loading, error, success } = useSelector(
        (state: RootState) => state.auction
    );

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
    const [currentLotStep, setCurrentLotStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<AuctionFormData>({
        shouldUnregister: false,
        defaultValues: DEFAULT_VALUES,
    });

    // Clear stale success/error from a previous visit
    useEffect(() => {
        dispatch(clearAuctionState());
    }, [dispatch]);

    const handleBack = () => {
        if (currentStep === 3 && selectedLotIndex !== null) {
            if (currentLotStep === 1) {
                setSelectedLotIndex(null);
                setCurrentLotStep(1);
                return;
            }
            setCurrentLotStep((prev) => prev - 1);
            return;
        }
        if (currentStep > 1) setCurrentStep((prev) => prev - 1);
    };

    const handleNext = () => {
        if (currentStep === 3 && selectedLotIndex !== null) {
            if (currentLotStep < 6) {
                setCurrentLotStep((prev) => prev + 1);
                return;
            }
            setSelectedLotIndex(null);
            setCurrentLotStep(1);
            return;
        }
        if (currentStep < 7) setCurrentStep((prev) => prev + 1);
    };

    /**
     * status = "DRAFT"     -> Save Draft (lenient validation)
     * status = "SCHEDULED" -> Publish (requires lots + prices)
     */
    const submitAuction = async (status: "DRAFT" | "SCHEDULED") => {
        setSuccessMessage(null);

        const data = form.getValues();
        const problems = validateAuctionForm(data, status);
        setValidationErrors(problems);
        if (problems.length > 0) return;

        try {
            const formData = buildAuctionFormData(data, status);
            const result = await dispatch(createAuction(formData)).unwrap();

            setSuccessMessage(result.message || "Auction created successfully");

            // Start fresh so a second click can't create a duplicate
            form.reset(DEFAULT_VALUES);
            setCurrentStep(1);
            setSelectedLotIndex(null);
            setCurrentLotStep(1);

            // Optional: navigate to the auction list
            router.push("/dashboard/auctions");
        } catch (err) {
            // Error message is already stored in the slice by the thunk
            console.error("Create auction failed:", err);
        }
    };

    const continueLabel =
        currentStep === 3 && selectedLotIndex !== null && currentLotStep === 6
            ? "Save Lot"
            : currentStep === 7
                ? "Publish"
                : "Continue";

    const handlePrimaryAction = () => {
        if (currentStep === 7) {
            submitAuction("SCHEDULED");
            return;
        }
        handleNext();
    };

    return (
        <FormProvider {...form}>
            <div className="p-6 pb-28">
                <Stepper currentStep={currentStep} onStepChange={setCurrentStep} />

                <div className="mt-10">
                    {currentStep === 1 && <BasicInfo />}
                    {currentStep === 2 && <AuctionSchedule />}
                    {currentStep === 3 && (
                        <AddLots
                            selectedLotIndex={selectedLotIndex}
                            setSelectedLotIndex={setSelectedLotIndex}
                            currentLotStep={currentLotStep}
                            setCurrentLotStep={setCurrentLotStep}
                        />
                    )}
                    {currentStep === 4 && <FeeConfiguration />}
                    {currentStep === 5 && <ShippingInfo />}
                    {currentStep === 6 && <AuctionVisibility />}
                    {currentStep === 7 && (
                        <div className="rounded-[8px] bg-dashboardFormBg p-6 text-sm text-slate-600">
                            Review your auction, then click <b>Publish</b>.
                        </div>
                    )}
                </div>

                {/* ---------- Messages ---------- */}
                {(validationErrors.length > 0 || error || successMessage) && (
                    <div className="fixed bottom-20 left-1/2 z-50 w-[min(560px,90vw)] -translate-x-1/2 space-y-2">
                        {validationErrors.length > 0 && (
                            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 shadow">
                                <p className="mb-1 font-semibold">Please fix the following:</p>
                                <ul className="list-disc pl-5">
                                    {validationErrors.map((msg) => (
                                        <li key={msg}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {error && validationErrors.length === 0 && (
                            <div className="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 shadow">
                                {error}
                            </div>
                        )}

                        {success && successMessage && (
                            <div className="rounded-md bg-green-100 px-4 py-3 text-sm text-green-700 shadow">
                                {successMessage}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------- Footer ---------- */}
                <div className="fixed bottom-0 flex w-[calc(100%-20rem)] justify-between rounded-[8px] bg-dashboardFormBg px-2.25 py-2.25">
                    <Button
                        type="button"
                        onClick={handleBack}
                        disabled={loading || (currentStep === 1 && selectedLotIndex === null)}
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-md border px-5 py-2 disabled:opacity-40"
                    >
                        <ArrowLeft />
                        Back
                    </Button>

                    <div className="flex gap-4">
                        <Button
                            type="button"
                            onClick={() => submitAuction("DRAFT")}
                            disabled={loading}
                            className="cursor-pointer rounded-md bg-white px-5 py-2 text-black disabled:opacity-40"
                        >
                            {loading ? "Saving..." : "Save Draft"}
                        </Button>

                        <Button
                            type="button"
                            onClick={handlePrimaryAction}
                            disabled={loading}
                            className="flex cursor-pointer items-center gap-2 rounded-md bg-dashboardButton px-5 py-2 text-white disabled:opacity-40"
                        >
                            {loading && currentStep === 7 ? "Publishing..." : continueLabel}
                            <ArrowRight />
                        </Button>
                    </div>
                </div>
            </div>
        </FormProvider>
    );
}