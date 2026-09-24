"use client"

import { StatsCard } from "@/components/common/StatsCard";
import { User } from "@/lib/types/user.types";

interface UserProfileProps {
    user: User
}

interface InfoRowProps {
    label: string
    value: string
    valueClassName?: string
}

function InfoRow({
    label,
    value,
    valueClassName = "text-[#414141]",
}: InfoRowProps) {
    return (
        <div className="grid grid-cols-[1fr_1fr] items-center">
            <p className="text-[14px] font-normal text-[#414141]">
                {label}
            </p>

            <p className={`text-[14px] font-bold ${valueClassName}`}>
                {value}
            </p>
        </div>
    )
}

const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

// BIDDER -> Bidder, SUPER_ADMIN -> Super Admin
const formatRole = (role: string) =>
    role
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ")

const getRiskLevel = (user: User) => {
    const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date()
    if (user.status === "SUSPENDED" || isLocked) return { label: "High (Locked/Suspended)", className: "text-[#DC2626]" }
    if (user.failedLoginAttempts >= 3) return { label: "Medium", className: "text-orange-500" }
    return { label: "Low (Trusted)", className: "text-[#16A34A]" }
}

export default function UserProfile({ user }: UserProfileProps) {

    const profile = user.profile
    const userName = user.username
    const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || user.username

    console.log(fullName)
    const cityState = [profile?.city, profile?.state].filter(Boolean).join(", ") || "-"

    const kycStatus = user.kyc?.status ?? "Not Uploaded"
    const isKycVerified = user.kyc?.status === "VERIFIED"

    const totalBids = user._count.bids
    const wonAuctions = user._count.auctionsWon
    const joinedAuctions = user._count.auctionParticipations
    const successRate = joinedAuctions > 0 ? ((wonAuctions / joinedAuctions) * 100).toFixed(1) : "0"

    const risk = getRiskLevel(user)

    return (
        <div>
            <div
                className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            lg:grid-cols-4
                            py-6
                          "
            >

                {
                    isKycVerified && (
                        <>
                            <StatsCard
                                title="Total Bids Placed"
                                value={String(totalBids)}
                                description={`Joined ${joinedAuctions} auctions`}
                                image={"/admin/statscard05.png"}
                                imageClassName="text-slate-600"
                            />

                            <StatsCard
                                title="Won Auctions"
                                value={String(wonAuctions)}
                                description={`Success Rate: ${successRate}%`}
                                image={"/admin/statscard06.png"}
                                imageClassName="text-emerald-500"
                            />

                            <StatsCard
                                title="Auctions Joined"
                                value={String(joinedAuctions)}
                                description="Registered as participant"
                                image={"/admin/statscard07.png"}
                                imageClassName="text-orange-500"
                            />

                            <StatsCard
                                title="Total Value Acquired"
                                value="-"
                                description="Available after settlement"
                                image={"/admin/statscard08.png"}
                                imageClassName="text-slate-600"
                            />
                        </>
                    )
                }

            </div>

            <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-2">

                <div className="w-full rounded-[12px] bg-dashboardFormBg p-6">

                    <h2 className="mb-5 text-[24px] font-bold text-[#0F172A]">
                        Personal Information
                    </h2>

                    <div className="space-y-4">
                        <InfoRow label="Full Name" value={fullName} />
                        <InfoRow label="Email Address" value={user.email} />
                        <InfoRow label="Contact Number" value={user.phone ?? "-"} />
                        <InfoRow label="Date of Birth" value={formatDate(profile?.dateOfBirth ?? null)} />
                        <InfoRow label="City / State" value={cityState} />
                        <InfoRow label="Postal Code" value={profile?.pincode ?? "-"} />
                        <InfoRow label="Country" value={profile?.country ?? "-"} />
                    </div>

                </div>

                <div className="w-full rounded-[12px] bg-dashboardFormBg p-6">

                    <h2 className="mb-5 text-[24px] font-bold text-[#0F172A]">
                        Account Security Details
                    </h2>

                    <div className="space-y-4">

                        <InfoRow label="Username" value={user.username} />

                        <InfoRow label="Registration Date" value={formatDate(user.createdAt)} />

                        <InfoRow label="Account Role" value={formatRole(user.role.name)} />

                        <InfoRow
                            label="KYC Status"
                            value={kycStatus}
                            valueClassName={isKycVerified ? "text-[#16A34A]" : "text-[#DC2626]"}
                        />

                        <InfoRow
                            label="Risk Level"
                            value={risk.label}
                            valueClassName={risk.className}
                        />

                        <InfoRow label="Last Active IP" value={user.lastLoginIp ?? "-"} />

                        <InfoRow label="Last Login" value={formatDate(user.lastLoginAt)} />

                        <InfoRow
                            label="Email Verified"
                            value={user.emailVerified ? "Yes" : "No"}
                            valueClassName={user.emailVerified ? "text-[#16A34A]" : "text-[#DC2626]"}
                        />

                    </div>

                </div>

            </div>

        </div>
    )
}