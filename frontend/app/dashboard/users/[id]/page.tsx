
import { users, newUsers, suspended } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { KycUpload } from "@/components/core/Dashboard/users/KycUpload"
import UserProfile from "@/components/core/Dashboard/users/UserProfiile"
import DashboardFormText from "@/components/common/DashboardFormText"

interface UserPageProps {
    params: Promise<{
        id: string
    }>
}




export default async function UserPage({
    params,
}: UserPageProps) {
    const allUsers = [...users, ...newUsers, ...suspended]

    const { id } = await params

    const user = allUsers.find(
        (user) => user.id === Number(id)
    )

    if (!user) {
        return (
            <div className="p-6">
                User not found
            </div>
        )
    }



    return (
        <div className="p-6">

            {
                user.status === "Suspended" && (
                    <div className="w-full h-18.5 bg-[#FEE2E2] rounded-[12px] p-3.5 mb-6">
                        <div className="flex items-center">
                            <h1 className="text-[#DC2626] text-[16px] font-bold">Account Suspended</h1>
                        </div>
                        <div>
                            <p className="text-[13px]">Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia, </p>
                        </div>
                    </div>
                )
            }

            <div className="w-full rounded-[8px] bg-[#f8f8f8] px-5 py-4 h-40.75">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <Avatar className="h-14 w-14">
                            <AvatarImage
                                src="/images/user-avatar.png"
                                alt={user.fullName}
                            />

                            <AvatarFallback className="bg-[#e5e5e5] text-sm font-semibold text-[#414141]">
                                {user.fullName
                                    .split(" ")
                                    .map((name) => name[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <h1 className="text-[24px] font-bold text-[#0F172A]">
                            {user.fullName}
                        </h1>

                    </div>

                    <Badge
                        variant="secondary"
                        className="rounded-full bg-[#e7e7e7] px-3 py-1 text-[10px] font-medium text-[#414141] hover:bg-[#e7e7e7]"
                    >
                        {user.status}
                    </Badge>

                </div>

                <div className="my-2 border-t border-[#e3e3e3]" />
                <div className="flex items-center gap-8 mt-3">
                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">
                            Email address
                        </p>

                        <p className="mt-0.5 text-[14px] text-[#414141]">
                            {user.email}
                        </p>
                    </div>
                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">
                            Contact no.
                        </p>

                        <p className="mt-0.5 text-[14px] text-[#414141]">
                            {user.contactNo}
                        </p>
                    </div>

                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">
                            Created on
                        </p>

                        <p className="mt-0.5 text-[14px] text-[#414141]">
                            {user.createdOn}
                        </p>
                    </div>

                </div>

            </div>


            {user.status === "KYC Not Uploaded" && (
                <KycUpload />
            )}

            {user.status === "Verified" && (
                <UserProfile user={user} />
            )}

            {user.status === "Suspended" && (
                <UserProfile user={user} />
            )}



        </div>
    )
}






