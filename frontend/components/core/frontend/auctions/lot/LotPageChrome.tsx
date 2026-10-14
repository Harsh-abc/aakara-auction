import Link from "next/link";

import { cn } from "@/lib/utils";

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_SOLID, PAGE_MAIN } from "../../storefront";

// the lot couldn't be shown — gone, or the request failed
export function LotPageMessage({ auctionUuid, notFound, message }: { auctionUuid: string; notFound: boolean; message?: string }) {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[]} />
                    <div className="py-24 text-center">
                        <h1 className="text-[24px] leading-8 font-medium text-[#0d0d0d]">{notFound ? "Lot not found" : "Couldn't load this lot"}</h1>
                        <p className={cn(BODY, "mx-auto mt-3 max-w-sm")}>{notFound ? "This lot may have been withdrawn, or the link is incorrect." : message}</p>
                        <Link href={`/auctions/${auctionUuid}`} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "mt-6")}>
                            Back to the sale
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
