"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { loginUser } from "@/services/operations/auth.api"
import { canAccessDashboard } from "@/lib/constants/roles"
import { AuthField, AuthSubmitButton } from "./AuthField"

type RegistrationLoginFormProps = {
    redirectTo: string | null
    // set when arriving here straight after signing up
    newAccountEmail?: string
}

export function RegistrationLoginForm({ redirectTo, newAccountEmail }: RegistrationLoginFormProps) {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const { loading } = useAppSelector((state) => state.auth)

    const [formData, setFormData] = useState({
        email: newAccountEmail ?? "",
        password: "",
    })

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const email = formData.email.trim()

        if (!email) {
            toast.error("Please enter your email address.")
            return
        }

        if (!formData.password) {
            toast.error("Please enter your password.")
            return
        }

        try {
            const response = await dispatch(
                loginUser({ email, password: formData.password })
            ).unwrap()

            toast.success(response.message || "Login successful!")

            // only staff roles go to the dashboard; BIDDER (and anything else) goes to the auctions
            const fallback = canAccessDashboard(response.data.role) ? "/dashboard" : "/"
            router.push(redirectTo ?? fallback)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Login failed. Please try again.")
        }
    }

    return (
        <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
            {newAccountEmail && (
                <p role="status" className="border border-[#cea25a] bg-[#fdf1e3] px-3.5 py-3 text-[12px] leading-[19.5px] text-[#0d0d0d]">
                    Your account has been created. Log in with your new password to continue.
                </p>
            )}

            {/* ids are prefixed because the signup panel stays mounted alongside and uses email/password too */}
            <AuthField
                id="login-email"
                name="email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
            />

            <AuthField
                id="login-password"
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                autoFocus={Boolean(newAccountEmail)}
                value={formData.password}
                onChange={handleChange}
            />

            <div className="flex flex-col gap-3">
                <AuthSubmitButton loading={loading} loadingText="Logging in...">
                    Log in
                </AuthSubmitButton>

                {/* carries over the email typed above, so it isn't asked for twice */}
                <Link
                    href={`/forgot-password${formData.email.trim() ? `?email=${encodeURIComponent(formData.email.trim())}` : ""}`}
                    className="text-center text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase hover:text-[#0d0d0d]"
                >
                    Forgot your password? Reset here
                </Link>
            </div>
        </form>
    )
}
