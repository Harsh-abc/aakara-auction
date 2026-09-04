"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ComponentType } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import LotsList from "./LotsList";
import LotsDetail from "./LotsDetails";
import UploadImages from "./UploadImages";
import PricingValuation from "./PricingValution";
import ConditionProvenance from "./ConditionProvenance";
import CertificatesDocs from "./CertificatesDocs";
import ReviewSubmit from "./ReviewSumbit";
import LotStepper from "./LotStepper";

type LotStepProps = {
    lotIndex: number;
};

type AddLotsProps = {
    selectedLotIndex: number | null;

    setSelectedLotIndex: Dispatch<
        SetStateAction<number | null>
    >;

    currentLotStep: number;

    setCurrentLotStep: Dispatch<
        SetStateAction<number>
    >;
};

const renderLotStep = (
    Component: ComponentType<LotStepProps>,
    lotIndex: number
) => {
    return <Component lotIndex={lotIndex} />;
};

export default function AddLots({
    selectedLotIndex,
    setSelectedLotIndex,
    currentLotStep,
    setCurrentLotStep,
}: AddLotsProps) {

    const { control } = useFormContext<AuctionFormData>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lots",
    });

  
    const handleAddNewLot = () => {
        const newLotIndex = fields.length;

        append({
            status: "draft",

            details: {
                title: "",
                artist: "",
                description: "",
            },

            images: [],

            pricing: {
                startingPrice: null,
                estimateFrom: null,
                estimateTo: null,
            },

            condition: {
                condition: "",
                provenance: "",
            },

            certificates: [],
        });

        setSelectedLotIndex(newLotIndex);
        setCurrentLotStep(1);
    };

  
    const handleEditLot = (index: number) => {
        setSelectedLotIndex(index);
        setCurrentLotStep(1);
    };

   
    const handleRemoveLot = (index: number) => {
        remove(index);

        if (selectedLotIndex === index) {
            setSelectedLotIndex(null);
            setCurrentLotStep(1);
        }
    };

 
    if (selectedLotIndex === null) {
        return (
            <div className="space-y-6">

                <LotsList
                    lots={fields}
                    onAddLot={handleAddNewLot}
                    onSelectLot={handleEditLot}
                    onRemoveLot={handleRemoveLot}
                />

            </div>
        );
    }

  
    return (
        <div className="space-y-6">

            <LotStepper
                currentStep={currentLotStep}
                onStepChange={setCurrentLotStep}
            />

       
            <div className="mt-8">

                {currentLotStep === 1 && (
                    renderLotStep(
                        LotsDetail,
                        selectedLotIndex
                    )
                )}

                {currentLotStep === 2 && (
                    renderLotStep(
                        UploadImages,
                        selectedLotIndex
                    )
                )}

                {currentLotStep === 3 && (
                    renderLotStep(
                        PricingValuation,
                        selectedLotIndex
                    )
                )}

                {currentLotStep === 4 && (
                    renderLotStep(
                        ConditionProvenance,
                        selectedLotIndex
                    )
                )}

                {currentLotStep === 5 && (
                    renderLotStep(
                        CertificatesDocs,
                        selectedLotIndex
                    )
                )}

                {currentLotStep === 6 && (
                    renderLotStep(
                        ReviewSubmit,
                        selectedLotIndex
                    )
                )}

            </div>

        </div>
    );
}