"use client"

import { StatsCard } from "@/components/common/StatsCard";


interface UserProfileProps {
    user: {
        fullName: string
        email: string
        contactNo: string
        createdOn: string,
        status: string
    }
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

            <p
                className={`text-[14px] font-bold ${valueClassName}`}
            >
                {value}
            </p>
        </div>
    )
}



export default function UserProfile({ user }: UserProfileProps) {


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
                    user.status === 'Verified' && (
                        <>
                            <StatsCard
                                title="Total Bids Placed"
                                value="47"
                                description="Active in 3 live rooms"
                                image={"/admin/statscard05.png"}
                                imageClassName="text-slate-600"
                            />



                            <StatsCard
                                title="Won Auctions"
                                value="12"
                                description="Success Rate: 25.5%"
                                image={"/admin/statscard06.png"}
                                imageClassName="text-emerald-500"
                            />


                            <StatsCard
                                title="Active Bids"
                                value="3"
                                description="Awaiting final hammer "
                                image={"/admin/statscard07.png"}
                                imageClassName="text-orange-500"
                            />


                            <StatsCard
                                title="Total Value Acquired"
                                value="$24,500"
                                description="Fully paid & Settled "
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

                        <InfoRow
                            label="Full Name"
                            value={user.fullName}
                        />

                        <InfoRow
                            label="Email Address"
                            value={user.email}
                        />

                        <InfoRow
                            label="Contact Number"
                            value={user.contactNo}
                        />

                        <InfoRow
                            label="Date of Birth"
                            value="November 12, 1994"
                        />

                        <InfoRow
                            label="City / State"
                            value="New Delhi, Delhi"
                        />

                        <InfoRow
                            label="Postal Code"
                            value="110001"
                        />

                        <InfoRow
                            label="Country"
                            value="India"
                        />

                    </div>

                </div>
                <div className="w-full rounded-[12px] bg-dashboardFormBg p-6">

                    <h2 className="mb-5 text-[24px] font-bold text-[#0F172A]">
                        Account Security Details
                    </h2>

                    <div className="space-y-4">

                        <InfoRow
                            label="Paddle No."
                            value="AK-8871-34"
                        />

                        <InfoRow
                            label="Registration Date"
                            value={user.createdOn}
                        />

                        <InfoRow
                            label="Account Role"
                            value="Verified Bidder"
                        />

                        <InfoRow
                            label="KYC Status"
                            value={user.status}
                            // valueClassName="text-[#16A34A]"
                            valueClassName={`${user.status === 'Verified' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
                        />

                        <InfoRow
                            label="Risk Level"
                            value="Low (Trusted)"
                            valueClassName="text-[#16A34A]"
                        />

                        <InfoRow
                            label="Last Active IP"
                            value="192.168.12.102"
                        />

                        <InfoRow
                            label="Two-Factor Auth"
                            // value="Enabled (Email/OTP)"
                            value={`${user.status === 'Verified' ? 'Enable ' : 'Disabled'}`}
                            // valueClassName="text-[#16A34A]"
                            valueClassName={`${user.status === 'Verified' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
                        />

                    </div>

                </div>

            </div>


        </div>
    )
}