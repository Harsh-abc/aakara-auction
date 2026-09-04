"use client";

import { Check } from "lucide-react";
import { auctionSteps } from "@/lib/constants/AuctionsSteps";

type StepperProps = {
    currentStep: number;
    onStepChange: (step: number) => void;
};

export default function Stepper({
    currentStep,
    onStepChange,
}: StepperProps) {
    return (
        <div className="flex items-center w-full">
            {auctionSteps.map((step, index) => {

                const isCurrent = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                const canClick = step.id <= currentStep;

                return (
                    <div
                        key={step.id}
                        className="flex items-center flex-1"
                    >

                        <button
                            type="button"
                            disabled={!canClick}
                            onClick={() => onStepChange(step.id)}
                            className="flex items-center gap-2"
                        >
                            <span
                                className={`
                                    flex
                                    items-center
                                    justify-center
                                    w-6
                                    h-6
                                    rounded-full
                                    text-sm
                                    ${isCurrent
                                        ? "bg-dashboardTextPrimary text-white"
                                        : isCompleted
                                            ? "bg-dashboardTextPrimary  text-white"
                                            : "bg-gray-200 text-gray-500"
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <Check size={14} />
                                ) : (
                                    step.id
                                )}
                            </span>

                            <span
                                className={`
                                    text-xs
                                    whitespace-nowrap
                                    ${isCurrent
                                        ? "font-semibold text-dashboardTextPrimary"
                                        : "text-gray-500"
                                    }
                                `}
                            >
                                {step.title}
                            </span>
                        </button>

                        {index < auctionSteps.length - 1 && (
                            <div className="flex-1 h-px bg-gray-300 mx-3" />
                        )}

                    </div>
                );
            })}
        </div>
    );
}