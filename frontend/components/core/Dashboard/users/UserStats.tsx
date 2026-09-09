import { StatsCard } from "@/components/common/StatsCard";
import Link from "next/link";

export default function UserStats() {
    return (
        <div
            className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-4
                py-6
              "
        >

            <StatsCard
                title="Total User"
                value="1284"
                description="+24 this month"
                image={"/admin/statscard05.png"}
                imageClassName="text-slate-600"
                href={'/dashboard/users/all-users'}
            />



            <StatsCard
                title="Active Users"
                value="982"
                description="Currently Online"
                image={"/admin/statscard06.png"}
                imageClassName="text-emerald-500"
                href={'/dashboard/bidder'}
            />


            <StatsCard
                title="New User"
                value="145"
                description="Target met : 120%"
                image={"/admin/statscard07.png"}
                imageClassName="text-orange-500"
                href={'/dashboard/users/new-users'}
            />


            <StatsCard
                title="Suspended"
                value="12"
                description="Needs Verifications"
                image={"/admin/statscard08.png"}
                imageClassName="text-slate-600"
                href={'/dashboard/users/suspended'}
            />


        </div>
    )
}