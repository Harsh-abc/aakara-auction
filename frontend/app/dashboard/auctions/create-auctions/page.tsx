
"use client";

import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import Stepper from "@/components/core/Dashboard/auctions/AuctionStepper";

import AuctionSchedule from "@/components/core/Dashboard/auctions/CreateAuctions/AuctionSchedule";
import BasicInfo from "@/components/core/Dashboard/auctions/CreateAuctions/BasicInfo";
import AddLots from "@/components/core/Dashboard/auctions/CreateAuctions/Lots";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import FeeConfiguration from "@/components/core/Dashboard/auctions/CreateAuctions/FeeConfigurations";
import ShippingInfo from "@/components/core/Dashboard/auctions/CreateAuctions/ShippingInfo";
import AuctionVisibility from "@/components/core/Dashboard/auctions/CreateAuctions/AuctionVisbility";

import { createAuction } from "@/services/operations/auction.api";
import { buildAuctionFormData } from "@/utils/buildAuctionFormData";

import { RootState, AppDispatch } from "@/redux/store";

export default function CreateAuctions() {
    const dispatch = useDispatch<AppDispatch>();

    const { loading, error, success } = useSelector(
        (state: RootState) => state.auction
    );

    const [currentStep, setCurrentStep] = useState(1);

    const [selectedLotIndex, setSelectedLotIndex] =
        useState<number | null>(null);

    const [currentLotStep, setCurrentLotStep] = useState(1);

    const form = useForm<AuctionFormData>({
        shouldUnregister: false,

        defaultValues: {
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

            fees: [],

            shipping: {
                shippingStrategy:
                    "SHIPPING_CALCULATED_SEPARATELY",
                isOnline: true,
                venue: "",
                shippingInfo: "",
            },

            visibility: {
                visibility: "REGISTERED_USERS_ONLY",
                termsAndConditions: "",
            },
        },
    });

    /**
     * Back button
     */
    const handleBack = () => {
        if (
            currentStep === 3 &&
            selectedLotIndex !== null
        ) {
            if (currentLotStep === 1) {
                setSelectedLotIndex(null);
                setCurrentLotStep(1);
                return;
            }

            setCurrentLotStep((prev) => prev - 1);
            return;
        }

        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    /**
     * Move to next step
     */
    const handleNext = () => {
        if (
            currentStep === 3 &&
            selectedLotIndex !== null
        ) {
            if (currentLotStep < 6) {
                setCurrentLotStep((prev) => prev + 1);
                return;
            }

            setSelectedLotIndex(null);
            setCurrentLotStep(1);

            return;
        }

        if (currentStep < 7) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    /**
     * Create / Publish Auction
     */
    const handlePublish = async () => {
        try {
            const data = form.getValues();

            console.log("========== AUCTION FORM DATA ==========");
            console.log(data);

            const formData = buildAuctionFormData(data);

            console.log("========== FORMDATA ==========");

            for (const [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(key, value.name);
                } else {
                    console.log(key, value);
                }
            }

            await dispatch(createAuction(formData)).unwrap();

        } catch (error) {
            console.error("Create auction failed:", error);
        }
    };

    /**
     * Button label
     */
    const continueLabel =
        currentStep === 3 &&
            selectedLotIndex !== null &&
            currentLotStep === 6
            ? "Save Lot"
            : currentStep === 7
                ? "Publish"
                : "Continue";

    /**
     * Continue / Publish button
     */
    const handlePrimaryAction = () => {
        if (currentStep === 7) {
            handlePublish();
            return;
        }

        handleNext();
    };

    return (
        <FormProvider {...form}>
            <div className="p-6">

                <Stepper
                    currentStep={currentStep}
                    onStepChange={setCurrentStep}
                />

                <div className="mt-10">

                    {currentStep === 1 && (
                        <BasicInfo />
                    )}

                    {currentStep === 2 && (
                        <AuctionSchedule />
                    )}

                    {currentStep === 3 && (
                        <AddLots
                            selectedLotIndex={selectedLotIndex}
                            setSelectedLotIndex={setSelectedLotIndex}
                            currentLotStep={currentLotStep}
                            setCurrentLotStep={setCurrentLotStep}
                        />
                    )}

                    {currentStep === 4 && (
                        <FeeConfiguration />
                    )}

                    {currentStep === 5 && (
                        <ShippingInfo />
                    )}

                    {currentStep === 6 && (
                        <AuctionVisibility />
                    )}

                    {currentStep === 7 && (
                        <div>
                            {/* Final review can be added here later */}
                        </div>
                    )}

                </div>

                <div className="fixed bottom-0 flex justify-between w-[calc(100%-20rem)] bg-dashboardFormBg px-2.25 py-2.25 rounded-[8px]">

                    <Button
                        type="button"
                        onClick={handleBack}
                        disabled={
                            currentStep === 1 &&
                            selectedLotIndex === null
                        }
                        className="
                            flex items-center gap-2
                            border
                            h-10
                            px-5
                            py-2
                            rounded-md
                            disabled:opacity-40
                            cursor-pointer
                        "
                    >
                        <ArrowLeft />
                        Back
                    </Button>

                    <div className="flex gap-4">

                        {/* Save Draft */}
                        <Button
                            type="button"
                            onClick={handleNext}
                            disabled={loading}
                            className="
                                bg-white
                                text-black
                                px-5
                                py-2
                                rounded-md
                                disabled:opacity-40
                                cursor-pointer
                            "
                        >
                            Save Draft
                        </Button>

                        {/* Continue / Publish */}
                        <Button
                            type="button"
                            onClick={handlePrimaryAction}
                            disabled={loading}
                            className="
                                flex items-center gap-2
                                bg-dashboardButton
                                text-white
                                px-5
                                py-2
                                rounded-md
                                disabled:opacity-40
                                cursor-pointer
                            "
                        >
                            {loading ? "Creating..." : continueLabel}
                            <ArrowRight />
                        </Button>

                    </div>

                </div>

                {/* API Error */}
                {/* {error && (
                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-red-100 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )} */}

                {/* API Success */}
                {/* {success && (
                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-green-100 px-4 py-3 text-sm text-green-700">
                        Auction created successfully.
                    </div>
                )} */}

            </div>
        </FormProvider>
    );
}
