"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldGroup,

} from "@/components/ui/field"
import OtpInput from "react-otp-input";
import { Edit, PenLine } from "lucide-react"

export function VerifyOTPForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [otp, setOtp] = useState("");
    const items = [
        { label: "India", value: "+91" },
        { label: "United States", value: "+1" },
        { label: "United Kingdom", value: "+44" },
    ]

    return (
        <form className={cn("flex flex-col gap-6 w-full", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-start gap-1 text-start">
                    <h1 className="text-[30px] font-semibold text-text-secondary">Enter OTP </h1>
                </div>

                <Field>
                    <div className="mb-2 flex items-baseline justify-between">
                        <div>
                            <span className="text-sm font-medium text-text-secondary">
                                We're Shared an OTP verification code on <br /> +91 1234567890.
                            </span>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-text-secondary flex items-center gap-1 cursor-pointer">
                                Edit
                                <PenLine className="w-4.5 h-4.5" />
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-start w-full">
                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            numInputs={6}
                            renderInput={(props) => <input {...props} />}
                            containerStyle="flex gap-6 justify-start"
                            inputStyle={cn(
                                "!w-[45px] !h-[45px] text-lg font-semibold text-start rounded-md border border-input bg-background text-foreground",
                                "focus:outline-none",
                                "transition-colors"
                            )}
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between gap-3.75">
                        <span className="text-xs font-normal  mt-2 block text-center">
                            Didn't receive the code?
                        </span>
                        <a href="/resend-otp" className="underline text-xs mt-2">Resend OTP</a>
                    </div>
                    <Button type="submit" className="w-full bg-[#4141411A] text-text-secondary  cursor-pointer">
                        Verify OTP
                    </Button>
                </Field>

            </FieldGroup>
        </form >
    )
}
