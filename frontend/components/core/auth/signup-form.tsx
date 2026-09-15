
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { sendSignupOtp } from "@/services/operations/auth.api";

import type { SignupPayload } from "@/lib/types/auth.types";
import Link from "next/link";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const router = useRouter();
  const dispatch = useAppDispatch();

  const { loading } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countryCode, setCountryCode] = useState("+91");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const items = [
    {
      label: "India",
      value: "+91",
    },
    {
      label: "United States",
      value: "+1",
    },
    {
      label: "United Kingdom",
      value: "+44",
    },
  ];

  // -----------------------------
  // Handle Input Change
  // -----------------------------

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // -----------------------------
  // Handle Signup
  // -----------------------------

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // -----------------------------
    // Basic Validation
    // -----------------------------

    if (!formData.firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    if (!formData.lastName.trim()) {
      toast.error("Please enter your last name");
      return;
    }



    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Please enter your phone number");
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

    if (!formData.terms) {
      toast.error("Please accept the Terms of Service");
      return;
    }

    // -----------------------------
    // Create Username
    // -----------------------------

    const username =
      `${formData.firstName} ${formData.lastName}`.trim();

    // -----------------------------
    // Create Phone Number
    // -----------------------------
    const phoneNumber = formData.phone.replace(/\D/g, "");

    if (phoneNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    const phone = `${countryCode}${formData.phone}`;

    // -----------------------------
    // API Payload
    // -----------------------------

    const payload: SignupPayload = {
      username,
      email: formData.email.trim(),
      password: formData.password,
      phone,
    };

    console.log("SIGNUP PAYLOAD:", payload);

    // -----------------------------
    // Call Redux API
    // -----------------------------

    // const result = await dispatch(sendSignupOtp(payload));

    // // -----------------------------
    // // Navigate after success
    // // -----------------------------

    // if (result?.success) {
    //   router.push("/verify-email");
    // }

    try {
      await dispatch(sendSignupOtp(payload)).unwrap();

      toast.success("OTP sent successfully");

      router.push("/verify-email");

    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : "Could not send OTP. Please try again."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-6 w-full",
        className
      )}
      {...props}
    >
      <FieldGroup>

        {/* =========================
            Heading
        ========================== */}

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[30px] font-semibold text-text-secondary">
            Create Account
          </h1>
        </div>

        {/* =========================
            First Name / Last Name
        ========================== */}

        <div className="flex items-center gap-3.75">

          <Field>
            <Input
              id="firstName"
              type="text"
              placeholder="First Name"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="bg-background"
            />
          </Field>

          <Field>
            <Input
              id="lastName"
              type="text"
              placeholder="Last Name"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="bg-background"
            />
          </Field>

        </div>

        {/* =========================
            Email
        ========================== */}

        <Field>
          <Input
            id="email"
            type="email"
            placeholder="Email ID"
            required
            value={formData.email}
            onChange={handleChange}
            className="bg-background"
          />
        </Field>

        {/* =========================
            Phone
        ========================== */}

        <Field className="flex items-center flex-row w-full">

          <div className="flex-1 h-11.25">

            <Select
              value={countryCode}
              onValueChange={(value) => {
                if (value !== null) {
                  setCountryCode(value);
                }
              }}
            >

              <SelectTrigger className="w-24 h-11.25">
                <SelectValue placeholder="Code">
                  {countryCode}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>

                <SelectGroup>

                  {items.map((item) => (
                    <SelectItem
                      key={item.label}
                      value={item.value}
                    >
                      {item.value} {item.label}
                    </SelectItem>
                  ))}

                </SelectGroup>

              </SelectContent>

            </Select>

          </div>

          <div className="flex-4 w-full">

            <Input
              id="phone"
              type="tel"
              placeholder="Phone Number"
              required
              value={formData.phone}
              onChange={handleChange}
              className="bg-background"
            />

          </div>

        </Field>

        {/* =========================
            Password
        ========================== */}

        <Field>

          <div className="relative">

            <Input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="bg-background pr-10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (prev) => !prev
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>

          </div>

        </Field>

        {/* =========================
            Confirm Password
        ========================== */}

        <Field>

          <div className="relative">

            <Input
              id="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm Password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="bg-background pr-10"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (prev) => !prev
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>

          </div>

        </Field>

        {/* =========================
            Terms
        ========================== */}

        <Field className="w-full flex flex-row items-start justify-center gap-0">

          <div className="w-[8%]!">

            <Checkbox
              id="terms"
              checked={formData.terms}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  terms: checked === true,
                }))
              }
            />

          </div>

          <div className="w-[90%] flex items-start flex-col gap-1">

            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground"
            >
              I agree to the{" "}

              <a
                href="/terms"
                className="text-primary underline"
              >
                Terms of Service
              </a>

            </label>

          </div>

        </Field>

        {/* =========================
            Submit
        ========================== */}

        <Field>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4141411A] text-text-secondary cursor-pointer"
          >
            {loading
              ? "Sending OTP..."
              : "Create Account"}
          </Button>

          <span className="text-xs font-normal mt-2 block text-center">

            Already have an account?{" "}

            <Link
              href="/login"
              className="underline text-[#76A3A5]"
            >
              Login
            </Link>

          </span>

        </Field>

      </FieldGroup>
    </form>
  );
}
