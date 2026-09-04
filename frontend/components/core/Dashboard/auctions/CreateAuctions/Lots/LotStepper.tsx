"use client";

import { Check } from "lucide-react";
import { lotSteps } from "@/lib/constants/LotsSteps";

type LotStepperProps = {
    currentStep: number;
    onStepChange: (step: number) => void;
};

export default function LotStepper({
    currentStep,
    onStepChange,
}: LotStepperProps) {
    return (
        <div className="flex items-center w-full overflow-x-auto">

            {lotSteps.map((step, index) => {

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
                            onClick={() => {
                                if (canClick) {
                                    onStepChange(step.id);
                                }
                            }}
                            className="flex items-center gap-2 whitespace-nowrap"
                        >
                            <span
                                className={`
                                    flex
                                    items-center
                                    justify-center
                                    w-7
                                    h-7
                                    rounded-full
                                    text-xs
                                    font-medium
                                    shrink-0

                                    ${isCurrent
                                        ? "bg-black text-white"
                                        : isCompleted
                                            ? "bg-green-600 text-white"
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
                                    text-sm
                                    ${isCurrent
                                        ? "font-semibold text-black"
                                        : "text-gray-500"
                                    }
                                `}
                            >
                                {step.title}
                            </span>
                        </button>

                        {index < lotSteps.length - 1 && (
                            <div className="flex-1 h-px bg-gray-300 mx-3" />
                        )}
                    </div>
                );
            })}

        </div>
    );
}