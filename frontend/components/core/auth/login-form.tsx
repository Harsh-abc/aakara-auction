"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [showPassword, setShowPassword] = useState(false)
    const [loginMode, setLoginMode] = useState<"email" | "mobile">("email")
    const [countryCode, setCountryCode] = useState("+91")
    const items = [
        { label: "India", value: "+91" },
        { label: "United States", value: "+1" },
        { label: "United Kingdom", value: "+44" },
    ]

    const toggleLoginMode = () => {
        setLoginMode((prev) => (prev === "email" ? "mobile" : "email"))
    }

    return (
        <form className={cn("flex flex-col gap-6 w-full", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-[30px] font-semibold text-text-secondary">
                        {loginMode === "email" ? "Login with Email" : "Login with Mobile Number"}
                    </h1>
                </div>

                {loginMode === "email" ? (
                    <>
                        <Field>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Email ID"
                                required
                                className="bg-background"
                            />
                        </Field>

                        <Field>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    required
                                    className="bg-background pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </Field>
                    </>
                ) : (
                    <Field className="flex items-center flex-row w-full">
                        <div className="flex-1 h-11.25">
                            <Select value={countryCode} onValueChange={(value) => {
                                if (value !== null) {
                                    setCountryCode(value)
                                }
                            }}>
                                <SelectTrigger className="w-24 h-11.25">
                                    <SelectValue placeholder="Code">
                                        {countryCode}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {items.map((item) => (
                                            <SelectItem key={item.label} value={item.value}>
                                                {item.value} {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-4 w-full">
                            <Input
                                id="mobile-number"
                                type="tel"
                                placeholder="Phone Number"
                                required
                                className="bg-background"
                            />
                        </div>
                    </Field>
                )}

                <Field className="w-full flex flex-row items-start justify-center gap-0">
                    <div className="w-[8%]!">
                        <Checkbox id="terms-conditions" name="terms-conditions" />
                    </div>
                    <div className="w-[90%] flex items-start flex-col gap-1">
                        <label htmlFor="terms-conditions" className="text-sm text-muted-foreground">
                            I agree to the <a href="/terms" className="text-primary underline">
                                Terms of Service
                            </a>
                        </label>
                    </div>
                </Field>
                <Field>
                    <Button type="submit" className="w-full bg-[#4141411A] text-text-secondary  cursor-pointer">
                        {
                            loginMode === "email" ? "Continue" : "Get OTP"
                        }
                    </Button>
                    <span
                        onClick={toggleLoginMode}
                        className="text-xs font-semibold  mt-2 block text-center underline text-text-secondary cursor-pointer"
                    >
                        {loginMode === "email"
                            ? "Login with Mobile Number Instead"
                            : "Login with Email ID Instead"}
                    </span>
                    <span className="text-xs font-normal  mt-2 block text-center">
                        Don't have an account? <Link href="/signup" className="underline text-[#76A3A5]">Sign Up</Link>
                    </span>
                </Field>

            </FieldGroup>
        </form >
    )
}