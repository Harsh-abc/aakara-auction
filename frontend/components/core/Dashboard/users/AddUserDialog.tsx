"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { createUser } from "@/services/operations/user.api";

const countryCodes = [
    { label: "India", value: "+91" },
    { label: "United States", value: "+1" },
    { label: "United Kingdom", value: "+44" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
};

// Label that sits on the input's top border
function FloatingField({
    id,
    label,
    className,
    children,
}: {
    id: string;
    label: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn("relative", className)}>
            <Label
                htmlFor={id}
                className="absolute -top-2 left-2.5 z-10 bg-white px-1 text-xs font-normal text-slate-700"
            >
                {label}
            </Label>
            {children}
        </div>
    );
}

function PasswordInput({
    id,
    placeholder,
    value,
    onChange,
}: {
    id: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <Input
                id={id}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete="new-password"
                className="h-11 bg-white pr-10"
            />
            <button
                type="button"
                onClick={() => setShow((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

export default function AddUserDialog() {
    const dispatch = useAppDispatch();
    const { creatingUser } = useAppSelector((state) => state.user);

    const [open, setOpen] = useState(false);
    const [countryCode, setCountryCode] = useState("+91");
    const [formData, setFormData] = useState(initialForm);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) {
            setFormData(initialForm);
            setCountryCode("+91");
        }
    };

    const isFilled = Object.values(formData).every((v) => v.trim() !== "");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const phoneNumber = formData.phone.replace(/\D/g, "");

        if (!formData.fullName.trim()) {
            toast.error("Please enter the full name");
            return;
        }
        if (!emailRegex.test(formData.email.trim())) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (phoneNumber.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }
        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            await dispatch(
                createUser({
                    fullName: formData.fullName.trim(),
                    email: formData.email.trim(),
                    phone: `${countryCode}${phoneNumber}`,
                    password: formData.password,
                })
            ).unwrap();

            toast.success("User created successfully");
            handleOpenChange(false);
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not create user. Try again.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button className="px-3 py-4.5 text-[15px] bg-dashboardButton hover:bg-amber-500" />
                }
            >
                <Plus />
                Add Users
            </DialogTrigger>

            <DialogContent
                className="gap-6 bg-white p-6 sm:max-w-md [&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:border"
            >
                <DialogHeader className="pr-10">
                    <DialogTitle className="text-2xl font-bold">Add New User</DialogTitle>
                    <DialogDescription className="text-[13px] text-[#62666F]">
                        Create a website login account on behalf of a user so they can explore the platform.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-5">
                        <FloatingField id="fullName" label="Full name">
                            <Input
                                id="fullName"
                                placeholder="Enter full name"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="h-11 bg-white"
                            />
                        </FloatingField>

                        <div className="flex items-center gap-2">
                            <Select
                                value={countryCode}
                                onValueChange={(value) => value !== null && setCountryCode(value)}
                            >
                                <SelectTrigger className="h-11! w-20 bg-white" aria-label="Country code">
                                    <SelectValue>{countryCode}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectGroup>
                                        {countryCodes.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.value} {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <FloatingField id="phone" label="Phone number" className="flex-1">
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="h-11 bg-white"
                                />
                            </FloatingField>
                        </div>

                        <FloatingField id="email" label="Email Address">
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter email address"
                                value={formData.email}
                                onChange={handleChange}
                                className="h-11 bg-white"
                            />
                        </FloatingField>
                    </div>

                    <div className="flex flex-col gap-5 rounded-[8px] bg-[#F4F4F4] p-4">
                        <div>
                            <h4 className="text-base font-semibold">Security &amp; access</h4>
                            <p className="text-xs text-[#62666F]">
                                Set the password and activation state for the new account.
                            </p>
                        </div>

                        <FloatingField id="password" label="Password">
                            <PasswordInput
                                id="password"
                                placeholder="Create password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </FloatingField>

                        <FloatingField id="confirmPassword" label="Confirm Password">
                            <PasswordInput
                                id="confirmPassword"
                                placeholder="Confirm password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </FloatingField>
                    </div>

                    <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-t-0 bg-transparent p-0">
                        <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>
                            Cancel
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={!isFilled || creatingUser}
                            className="h-11 bg-dashboardButton text-black hover:bg-amber-500 disabled:bg-[#E5E5E5] disabled:text-[#9A9A9A] disabled:opacity-100"
                        >
                            {creatingUser ? "Creating..." : "Create User"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
