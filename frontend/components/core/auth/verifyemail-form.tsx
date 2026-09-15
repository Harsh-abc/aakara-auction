
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldGroup,
} from "@/components/ui/field";
import OtpInput from "react-otp-input";
import { CircleCheck, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { AppDispatch, RootState } from "@/redux/store";
import { verifySignupOtp } from "@/services/operations/auth.api"; 

export function VerifyEmailForm({
    className,
    ...props
}: React.ComponentProps<"form">) {

    const [otp, setOtp] = useState("");

    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    // Get signup email stored by sendSignupOtp
    const signupEmail = useSelector(
        (state: RootState) => state.auth.signupEmail
    );

    // Get loading state from Redux
    const loading = useSelector(
        (state: RootState) => state.auth.loading
    );

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        // Make sure email exists
        if (!signupEmail) {
            toast.error(
                "Registration session not found. Please register again."
            );
            return;
        }

        // Make sure OTP is complete
        if (otp.length !== 6) {
            toast.error("Please enter the 6-digit OTP.");
            return;
        }

        try {
            const response = await dispatch(
                verifySignupOtp({
                    email: signupEmail,
                    otp: otp,
                })
            ).unwrap();

            toast.success(
                response.message ||
                "Email verified successfully!"
            );

            // Registration completed
            router.push("/login");

        } catch (error) {
            toast.error(
                typeof error === "string"
                    ? error
                    : "OTP verification failed. Please try again."
            );
        }
    };

    const handleEditEmail = () => {
        router.push("/signup");
    };

    return (
        <form
            className={cn(
                "flex flex-col gap-6 w-full",
                className
            )}
            onSubmit={handleSubmit}
            {...props}
        >
            <FieldGroup>

                {/* Header */}
                <div className="flex flex-col items-start gap-1 text-start">
                    <h1 className="text-[30px] font-semibold text-text-secondary">
                        Email ID Verification
                    </h1>
                </div>

                {/* Email */}
                <Field className="relative">
                    <Input
                        id="email"
                        type="email"
                        value={signupEmail || ""}
                        placeholder="test@gmail.com"
                        readOnly
                        className="bg-background pr-10"
                    />

                    <div
                        className="absolute left-90 top-1/2 -translate-y-1/2 text-[#414141]"
                        tabIndex={-1}
                    >
                        <CircleCheck className="w-4 h-4" />
                    </div>
                </Field>

                {/* OTP */}
                <Field>

                    <div className="mb-2 flex items-baseline justify-between">

                        <div>
                            <span className="text-sm font-medium text-text-secondary">
                                We&apos;ve shared an OTP verification code on
                                <br />
                                {signupEmail || "your email address"}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleEditEmail}
                            className="text-sm font-bold text-text-secondary flex items-center gap-1 cursor-pointer"
                        >
                            Edit
                            <PenLine className="w-4 h-4" />
                        </button>

                    </div>

                    {/* OTP Inputs */}
                    <div className="flex justify-start w-full">

                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            numInputs={6}
                            shouldAutoFocus
                            renderInput={(inputProps) => (
                                <input {...inputProps} />
                            )}
                            containerStyle="flex gap-6 justify-start"
                            inputStyle={cn(
                                "!w-[45px] !h-[45px]",
                                "text-lg font-semibold text-center",
                                "rounded-md border border-input",
                                "bg-background text-foreground",
                                "focus:outline-none",
                                "focus:ring-1 focus:ring-ring",
                                "transition-colors"
                            )}
                        />

                    </div>

                    {/* Resend */}
                    <div className="flex flex-row items-center justify-between gap-3.75">

                        <span className="text-xs font-normal mt-2 block">
                            Didn&apos;t receive the code?
                        </span>

                        <button
                            type="button"
                            className="underline text-xs mt-2 cursor-pointer"
                        >
                            Resend OTP
                        </button>

                    </div>

                    {/* Verify */}
                    <Button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-[#4141411A] text-text-secondary cursor-pointer disabled:opacity-50"
                    >
                        {loading
                            ? "Verifying..."
                            : "Verify OTP"}
                    </Button>

                </Field>

            </FieldGroup>
        </form>
    );
}
