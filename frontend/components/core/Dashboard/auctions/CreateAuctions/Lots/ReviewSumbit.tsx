import { ReactNode } from "react";

export default function ReviewSubmit() {
    return (
        <div className="w-full space-y-3">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-6">

                <LotDetailsCard />

                <UploadImagesCard />

                <PricingValuationCard />

                <ConditionProvenanceCard />

            </div>
            <div className="px-6">

            <CertificatesDocsCard />
            </div>

        </div>
    )
}



interface ReviewCardProps {
    number?: string;
    title: string;
    children: ReactNode;
}

const ReviewCard = ({
    number,
    title,
    children,
}: ReviewCardProps) => {
    return (
        <div className="rounded-xl bg-white border border-slate-100 p-5">

            <div className="flex items-center justify-between mb-5">

                <h3 className="text-sm font-semibold text-slate-800">
                    {number && `${number}. `}
                    {title}
                </h3>

                <button
                    type="button"
                    className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-md
                        border
                        border-slate-200
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-slate-600
                        hover:bg-slate-50
                    "
                >
                    Edit
                </button>

            </div>

            {children}

        </div>
    );
};



const LotDetailsCard = () => {

    const details = [
        ["Master Title", "Untitled (Gopalpur)"],
        ["Artist Profile", "Jamini Roy"],
        ["Category", "Paintings"],
        ["Medium", "Tempera on Canvas"],
        ["Creation Year", "1954"],
        ["Dimensions", "76.2 cm × 101.6 cm × 2.4 cm"],
        ["Edition Typology", "Unique Original"],
    ];

    return (
        <ReviewCard
            number="1"
            title="Lot Details"
        >
            <div className="space-y-3">

                {details.map(([label, value]) => (
                    <div
                        key={label}
                        className="grid grid-cols-[110px_1fr] gap-3 text-xs"
                    >
                        <span className="text-slate-500">
                            {label}
                        </span>

                        <span className="font-medium text-slate-700">
                            {value}
                        </span>
                    </div>
                ))}

            </div>
        </ReviewCard>
    );
};


const UploadImagesCard = () => {

    return (
        <ReviewCard
            number="2"
            title="Upload Images"
        >

            {/* PRIMARY IMAGE */}
            <div className="flex items-center gap-3">

                <div className="h-10 w-14 overflow-hidden rounded-md bg-slate-100">
                    <img
                        src="/images/artwork.jpg"
                        alt="Artwork"
                        className="h-full w-full object-cover"
                    />
                </div>

                <div>
                    <p className="text-xs font-semibold text-slate-700">
                        COA_Cover_JR.jpg
                    </p>

                    <span className="
                        mt-1
                        inline-flex
                        rounded-full
                        bg-orange-50
                        px-2
                        py-0.5
                        text-[9px]
                        font-medium
                        text-orange-600
                    ">
                        Primary Artwork Cover
                    </span>
                </div>

            </div>

            {/* THUMBNAILS */}
            <div className="mt-3 flex items-center gap-2">

                {[1, 2, 3].map((image) => (
                    <div
                        key={image}
                        className="
                            h-9
                            w-12
                            overflow-hidden
                            rounded-md
                            border
                            border-slate-200
                        "
                    >
                        <img
                            src={`/images/artwork-${image}.jpg`}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}

                <div className="
                    flex
                    h-9
                    w-12
                    items-center
                    justify-center
                    rounded-md
                    bg-slate-100
                    text-xs
                    font-medium
                    text-slate-500
                ">
                    +2
                </div>

            </div>

        </ReviewCard>
    );
};


const PricingValuationCard = () => {

    const pricing = [
        ["Starting Bid Price", "₹ 4,50,000"],
        ["Reserve Price", "₹ 6,00,000"],
        ["Estimated Range", "₹ 5,00,000 – ₹ 7,50,000"],
        ["Direct Purchase (Buy Now)", "₹ 9,00,000"],
        ["GST Rate & HSN", "12% / 9701 1010"],
    ];

    return (
        <ReviewCard
            number="3"
            title="Pricing & Valuation"
        >

            <div className="space-y-3">

                {pricing.map(([label, value]) => (
                    <div
                        key={label}
                        className="grid grid-cols-[135px_1fr] gap-3 text-xs"
                    >
                        <span className="text-slate-500">
                            {label}
                        </span>

                        <span className="font-medium text-slate-700">
                            {value}
                        </span>
                    </div>
                ))}

            </div>

        </ReviewCard>
    );
};


const ConditionProvenanceCard = () => {

    const details = [
        ["Overall Condition Class", "Excellent"],
        ["Exhibition History", "Exhibited at Lalit Kala Akademi, 1968"],
        ["Authentication Board", "Jamini Roy Estate Board"],
        ["Acquisition Protocol", "Direct from Artist (2018)"],
    ];

    return (
        <ReviewCard
            number="4"
            title="Condition & Provenance"
        >

            <div className="space-y-3">

                {details.map(([label, value]) => (
                    <div
                        key={label}
                        className="grid grid-cols-[135px_1fr] gap-3 text-xs"
                    >

                        <span className="text-slate-500">
                            {label}
                        </span>

                        <span className="font-medium text-slate-700">
                            {value}
                        </span>

                    </div>
                ))}

            </div>

        </ReviewCard>
    );
};


const CertificatesDocsCard = () => {

    const documents = [
        "Certificate of Authenticity (COA) Uploaded",
        "Provenance Dossier Verified",
        "Condition Survey complete",
        "Artist Monograph Reference appended",
    ];

    return (
        <ReviewCard
            number=""
            title="Certificates & Docs"
        >

            <div className="flex flex-wrap gap-3">

                {documents.map((document) => (
                    <div
                        key={document}
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-md
                            bg-emerald-50
                            px-3
                            py-2.5
                            text-[11px]
                            font-medium
                            text-emerald-600
                        "
                    >

                        <span className="text-emerald-500">
                            ✓
                        </span>

                        {document}

                    </div>
                ))}

            </div>

        </ReviewCard>
    );
};