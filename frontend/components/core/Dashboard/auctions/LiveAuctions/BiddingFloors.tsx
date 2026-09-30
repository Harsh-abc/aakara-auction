"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import { Button } from "@/components/ui/button";
import { DownloadCloudIcon, Gavel, Radio } from "lucide-react";
import LiveAuctionsCard from "./LiveAuctionsCard";
import Carousel from "@/components/common/Carousel/Carousel";
import CarouselSlide from "@/components/common/Carousel/CarouselSlide";

import { useRouter } from "next/navigation";
import { LiveAuctionDataTable } from "./LiveAuctionDataTable";




import { auctionLots, liveAuctions } from "@/lib/data";



export default function BiddingFloors() {
    const router = useRouter();

    const activeAuctions = liveAuctions.filter(
        (auction) => auction.status === "LIVE"
    );

    return (
        <div className="my-9 mx-8">
            <div className="flex w-full items-center justify-between gap-4">
                <DashboardFormText
                    text="Active Bidding Floors"
                    className="text-[24px]"
                />

                <Button
                    variant="outline"
                    className="rounded-[8px] border-gray-300 bg-transparent text-black"
                >
                    <DownloadCloudIcon />
                    Export Live Report
                </Button>
            </div>

            <div className="my-6 overflow-x-hidden">
                {activeAuctions.length > 0 ? (
                    <Carousel
                        className="w-full"
                        options={{
                            align: "start",
                            loop: activeAuctions.length > 2,
                        }}
                        showButtons={false}
                        showDots={false}
                        autoplay={activeAuctions.length > 2}
                        autoplayDelay={4000}
                    >
                        {activeAuctions.map((auction) => (
                            <CarouselSlide
                                key={auction.id}
                                className="min-w-0 flex-[0_0_100%] pr-6 md:flex-[0_0_50%]"
                            >
                                <LiveAuctionsCard
                                    auction={auction}
                                    onManage={(selectedAuction) => {
                                        router.push(
                                            `/dashboard/auctions/manage-lots/${selectedAuction.id}`
                                        );
                                    }}
                                />
                            </CarouselSlide>
                        ))}
                    </Carousel>
                ) : (
                    <div className="flex min-h-65 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                            <Gavel
                                className="h-7 w-7 text-gray-500"
                                strokeWidth={1.5}
                            />
                        </div>

                        <h3 className="text-lg font-semibold text-[#414141]">
                            No Live Auctions Right Now
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                            There are currently no auctions in progress.
                            Upcoming or scheduled auctions will be available
                            when they are ready to go live.
                        </p>

                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                            <Radio className="h-3.5 w-3.5" />
                            <span>Live bidding is currently inactive</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 bg-[#F4F4F4] rounded-[8px]">
                <div className="mx-6">
                    <DashboardFormText
                        text="Lot Management"
                        className="text-[24px] pt-6"
                    />

                </div>
                <LiveAuctionDataTable data={auctionLots} />
            </div>
        </div>
    );
}