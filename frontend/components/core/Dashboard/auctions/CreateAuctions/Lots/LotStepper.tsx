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
        <div className="flex items-center w-full overflow-x-auto m-0">

            {lotSteps.map((step, index) => {

                const isCurrent = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                const canClick = step.id <= currentStep;

                return (
                    <div
                        key={step.id}
                        className="flex items-center flex-1 py-6 bg-dashboardFormBg px-6 rounded-t-[8px] rounded-tr-[8px]"
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
                                    w-6
                                    h-6
                                    rounded-full
                                    text-xs
                                    font-medium
                                    shrink-0

                                    ${isCurrent
                                        ? "bg-dashboardTextPrimary text-white"
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

                        {index < lotSteps.length - 1 && (
                            <div className="flex-1 h-px bg-gray-300 ml-1 mx-auto" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}