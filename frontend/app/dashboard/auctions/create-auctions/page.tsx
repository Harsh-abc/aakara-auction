"use client";

import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import Stepper from "@/components/core/Dashboard/auctions/AuctionStepper";

import AuctionSchedule from "@/components/core/Dashboard/auctions/CreateAuctions/AuctionSchedule";
import BasicInfo from "@/components/core/Dashboard/auctions/CreateAuctions/BasicInfo";
import AddLots from "@/components/core/Dashboard/auctions/CreateAuctions/Lots";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateAuctions() {

    const [currentStep, setCurrentStep] = useState(1);


    const [selectedLotIndex, setSelectedLotIndex] =
        useState<number | null>(null);

    const [currentLotStep, setCurrentLotStep] = useState(1);

    const form = useForm<AuctionFormData>({
        shouldUnregister: false,

        defaultValues: {
            basicInfo: {
                name: "",
                reference: "",
                auctionType: "",
                description: "",
            },

            schedule: {
                startDate: "",
                startTime: "",
                endDate: "",
                endTime: "",
            },

            lots: [],
        },
    });


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

        if (currentStep < 8) {
            setCurrentStep((prev) => prev + 1);
        }
    };


    const continueLabel =
        currentStep === 3 &&
            selectedLotIndex !== null &&
            currentLotStep === 6
            ? "Save Lot"
            : currentStep === 8
                ? "Publish"
                : "Continue";

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
                        <div>
                            Bidding Settings
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div>
                            Payments
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div>
                            Shipping
                        </div>
                    )}

                    {currentStep === 7 && (
                        <div>
                            Visibility
                        </div>
                    )}

                    {currentStep === 8 && (
                        <div>
                            Publish
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
                        <Button
                            type="button"
                            onClick={handleNext}

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
                        <Button
                            type="button"
                            onClick={handleNext}
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
                            {continueLabel}
                            <ArrowRight />
                        </Button>
                    </div>

                </div>
            </div>
        </FormProvider>
    );
}