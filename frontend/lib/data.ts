import { AuctionLot } from "./types/auction.types"

export type Auction = {
    id: number
    auctionName: string
    type: string
    category: string
    artworks: number
    startDate: string
    endDate: string
    status: "Live" | "Scheduled" | "Draft" | "Completed"
    image: string
}

export type AuctionLotsList = {
    id: string
    lotImage: string
    artworkName: string
    artist: string
    artworkId: number | string
    category: string
    startingBid: string
    reserveBid: string
    status: "Ready"
}

export type User = {
    id: number
    fullName: string
    email: string
    contactNo: string
    createdOn: string
    status: "Suspended" | "Verified" | "Pending Verification" | "KYC Not Uploaded"
}


export const auctionData: Auction[] = [
    {
        id: 1,
        auctionName: "Modern Masters of India",
        type: "Timed Auction",
        category: "Paintings",
        artworks: 14,
        startDate: "Oct 12, 10:00 AM",
        endDate: "Oct 15, 06:00 PM",
        status: "Live",
        image: "/images/auction-1.jpg",
    },
    {
        id: 2,
        auctionName: "Contemporary South Asian Art",
        type: "Live Auction",
        category: "Photography",
        artworks: 22,
        startDate: "Oct 20, 04:00 PM",
        endDate: "Oct 20, 08:00 PM",
        status: "Scheduled",
        image: "/images/auction-2.jpg",
    },
    {
        id: 3,
        auctionName: "Digital Art & Generative Works",
        type: "Timed Auction",
        category: "Digital Art",
        artworks: 35,
        startDate: "Nov 02, 12:00 PM",
        endDate: "Nov 09, 12:00 PM",
        status: "Draft",
        image: "/images/auction-3.jpg",
    },
    {
        id: 4,
        auctionName: "Pre-War Impressionists",
        type: "Online Auction",
        category: "Paintings",
        artworks: 8,
        startDate: "Oct 01, 09:00 AM",
        endDate: "Oct 05, 06:00 PM",
        status: "Completed",
        image: "/images/auction-4.jpg",
    },
    {
        id: 5,
        auctionName: "S.H. Raza & Progressive Artists",
        type: "Live Auction",
        category: "Paintings",
        artworks: 11,
        startDate: "Nov 15, 07:00 PM",
        endDate: "Nov 15, 11:00 PM",
        status: "Scheduled",
        image: "/images/auction-5.jpg",
    },
    {
        id: 6,
        auctionName: "Satyajit Ray Heritage Collection",
        type: "Online Auction",
        category: "Collectibles",
        artworks: 19,
        startDate: "Sep 22, 10:00 AM",
        endDate: "Sep 26, 06:00 PM",
        status: "Completed",
        image: "/images/auction-6.jpg",
    },
    {
        id: 7,
        auctionName: "Contemporary Indian Sculptures",
        type: "Live Auction",
        category: "Sculptures",
        artworks: 15,
        startDate: "Oct 18, 05:00 PM",
        endDate: "Oct 18, 09:00 PM",
        status: "Live",
        image: "/images/auction-7.jpg",
    },
]



// export const users: User[] = [
//     {
//         id: 10,
//         fullName: "Alice Smith",
//         email: "alice.smith@artbid.com",
//         contactNo: "91+9372815064",
//         createdOn: "Oct 15, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 11,
//         fullName: "Bob Johnson",
//         email: "bob.johnson@artbid.com",
//         contactNo: "91+8614029573",
//         createdOn: "Mar 10, 2025",
//         status: "Verified",
//     },
//     {
//         id: 12,
//         fullName: "Emily Davis",
//         email: "emily.davis@artbid.com",
//         contactNo: "91+7250983416",
//         createdOn: "Jan 5, 2026",
//         status: "Pending Verification",
//     },
//     {
//         id: 13,
//         fullName: "Michael Wilson",
//         email: "michael.wilson@artbid.com",
//         contactNo: "91+9183647205",
//         createdOn: "Feb 28, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 14,
//         fullName: "Sarah Thompson",
//         email: "sarah.thompson@artbid.com",
//         contactNo: "91+8407562139",
//         createdOn: "Mar 15, 2025",
//         status: "Verified",
//     },
//     {
//         id: 15,
//         fullName: "David Chen",
//         email: "david.chen@artbid.com",
//         contactNo: "91+7931048256",
//         createdOn: "Apr 10, 2025",
//         status: "Verified",
//     },
//     {
//         id: 16,
//         fullName: "Emily Garcia",
//         email: "emily.garcia@artbid.com",
//         contactNo: "91+9568201374",
//         createdOn: "May 20, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 17,
//         fullName: "James Lee",
//         email: "james.lee@artbid.com",
//         contactNo: "91+8245713690",
//         createdOn: "Jun 30, 2025",
//         status: "Suspended",
//     },
// ]

// export const newUsers: User[] = [
//     {
//         id: 18,
//         fullName: "John Anderson",
//         email: "john.anderson@artbid.com",
//         contactNo: "91+9876543210",
//         createdOn: "Jul 5, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 19,
//         fullName: "Olivia Martinez",
//         email: "olivia.martinez@artbid.com",
//         contactNo: "91+9123456780",
//         createdOn: "Jul 18, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 20,
//         fullName: "Daniel Brown",
//         email: "daniel.brown@artbid.com",
//         contactNo: "91+9988776655",
//         createdOn: "Aug 2, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 21,
//         fullName: "Sophia Wilson",
//         email: "sophia.wilson@artbid.com",
//         contactNo: "91+9090909090",
//         createdOn: "Aug 14, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 22,
//         fullName: "William Taylor",
//         email: "william.taylor@artbid.com",
//         contactNo: "91+9345678123",
//         createdOn: "Sep 1, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 23,
//         fullName: "Emma Anderson",
//         email: "emma.anderson@artbid.com",
//         contactNo: "91+8765432109",
//         createdOn: "Sep 12, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 24,
//         fullName: "James Miller",
//         email: "james.miller@artbid.com",
//         contactNo: "91+9456123780",
//         createdOn: "Oct 3, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 25,
//         fullName: "Charlotte Davis",
//         email: "charlotte.davis@artbid.com",
//         contactNo: "91+9812345670",
//         createdOn: "Oct 21, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 26,
//         fullName: "Benjamin Moore",
//         email: "benjamin.moore@artbid.com",
//         contactNo: "91+9234567810",
//         createdOn: "Nov 8, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 27,
//         fullName: "Mia Thompson",
//         email: "mia.thompson@artbid.com",
//         contactNo: "91+9567890123",
//         createdOn: "Nov 19, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 28,
//         fullName: "Lucas Harris",
//         email: "lucas.harris@artbid.com",
//         contactNo: "91+9341205678",
//         createdOn: "Dec 4, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 29,
//         fullName: "Amelia Clark",
//         email: "amelia.clark@artbid.com",
//         contactNo: "91+9876123450",
//         createdOn: "Dec 18, 2025",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 30,
//         fullName: "Henry Lewis",
//         email: "henry.lewis@artbid.com",
//         contactNo: "91+9123987654",
//         createdOn: "Jan 7, 2026",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 31,
//         fullName: "Isabella Walker",
//         email: "isabella.walker@artbid.com",
//         contactNo: "91+9988123456",
//         createdOn: "Jan 22, 2026",
//         status: "KYC Not Uploaded",
//     },
//     {
//         id: 32,
//         fullName: "Alexander Hall",
//         email: "alexander.hall@artbid.com",
//         contactNo: "91+9345678901",
//         createdOn: "Feb 10, 2026",
//         status: "KYC Not Uploaded",
//     },
// ]



// export const suspended: User[] = [
//     {
//         id: 33,
//         fullName: "John Anderson",
//         email: "john.anderson@artbid.com",
//         contactNo: "91+9876543210",
//         createdOn: "Jul 5, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 34,
//         fullName: "Olivia Martinez",
//         email: "olivia.martinez@artbid.com",
//         contactNo: "91+9123456780",
//         createdOn: "Jul 18, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 35,
//         fullName: "Daniel Brown",
//         email: "daniel.brown@artbid.com",
//         contactNo: "91+9988776655",
//         createdOn: "Aug 2, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 36,
//         fullName: "Sophia Wilson",
//         email: "sophia.wilson@artbid.com",
//         contactNo: "91+9090909090",
//         createdOn: "Aug 14, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 37,
//         fullName: "William Taylor",
//         email: "william.taylor@artbid.com",
//         contactNo: "91+9345678123",
//         createdOn: "Sep 1, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 38,
//         fullName: "Emma Anderson",
//         email: "emma.anderson@artbid.com",
//         contactNo: "91+8765432109",
//         createdOn: "Sep 12, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 39,
//         fullName: "James Miller",
//         email: "james.miller@artbid.com",
//         contactNo: "91+9456123780",
//         createdOn: "Oct 3, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 40,
//         fullName: "Charlotte Davis",
//         email: "charlotte.davis@artbid.com",
//         contactNo: "91+9812345670",
//         createdOn: "Oct 21, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 41,
//         fullName: "Benjamin Moore",
//         email: "benjamin.moore@artbid.com",
//         contactNo: "91+9234567810",
//         createdOn: "Nov 8, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 42,
//         fullName: "Mia Thompson",
//         email: "mia.thompson@artbid.com",
//         contactNo: "91+9567890123",
//         createdOn: "Nov 19, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 43,
//         fullName: "Lucas Harris",
//         email: "lucas.harris@artbid.com",
//         contactNo: "91+9341205678",
//         createdOn: "Dec 4, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 44,
//         fullName: "Amelia Clark",
//         email: "amelia.clark@artbid.com",
//         contactNo: "91+9876123450",
//         createdOn: "Dec 18, 2025",
//         status: "Suspended",
//     },
//     {
//         id: 45,
//         fullName: "Henry Lewis",
//         email: "henry.lewis@artbid.com",
//         contactNo: "91+9123987654",
//         createdOn: "Jan 7, 2026",
//         status: "Suspended",
//     },
//     {
//         id: 46,
//         fullName: "Isabella Walker",
//         email: "isabella.walker@artbid.com",
//         contactNo: "91+9988123456",
//         createdOn: "Jan 22, 2026",
//         status: "Suspended",
//     },
//     {
//         id: 47,
//         fullName: "Alexander Hall",
//         email: "alexander.hall@artbid.com",
//         contactNo: "91+9345678901",
//         createdOn: "Feb 10, 2026",
//         status: "Suspended",
//     },
// ]


export interface LiveAuction {
    id: number;
    title: string;
    status: "LIVE" | "UPCOMING" | "PAST";
    currentLot: number;
    activeBidders: number;
    estimatedTotal: string;
    auctioneer: string;
    image: string;
}

export const liveAuctions: LiveAuction[] = [
    {
        id: 1,
        title: "Contemporary Evening Sale",
        status: "LIVE",
        currentLot: 2,
        activeBidders: 1204,
        estimatedTotal: "$14.2M",
        auctioneer: "J. Smith",
        image: "/images/auction-artwork.jpg",
    },
    {
        id: 2,
        title: "Modern Masters Auction",
        status: "LIVE",
        currentLot: 8,
        activeBidders: 856,
        estimatedTotal: "$8.6M",
        auctioneer: "A. Sharma",
        image: "/images/modern-artwork.jpg",
    },
    {
        id: 3,
        title: "Fine Art & Collectibles",
        status: "LIVE",
        currentLot: 12,
        activeBidders: 642,
        estimatedTotal: "$5.4M",
        auctioneer: "R. Mehta",
        image: "/images/fine-artwork.jpg",
    },
    {
        id: 4,
        title: "Indian Contemporary Art",
        status: "LIVE",
        currentLot: 5,
        activeBidders: 978,
        estimatedTotal: "$11.8M",
        auctioneer: "P. Kapoor",
        image: "/images/indian-artwork.jpg",
    },
];





export const auctionLots: AuctionLot[] = [
    {
        id: "lot-001",
        uuid: "a1000001-0000-4000-8000-000000000001",
        itemNumber: 1,
        title: "Untitled - Abstract Composition",
        description: "An expressive abstract artwork with layered colors.",
        artistName: "Rameshwar Broota",
        medium: "Acrylic on Canvas",
        yearCreated: "2020",
        editionType: "UNIQUE",
        status: "ACTIVE",

        startingPrice: "250000",
        reservePrice: "300000",
        estimateLow: "300000",
        estimateHigh: "450000",
        currentBid: "325000",
        bidCount: 12,
        isFeatured: true,

        insureanceValue: "350000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Professional art packing and insured shipping.",

        overallCondition: "Excellent",
        frameCondition: "Good",
        detailedConditionNotes: "Minor signs of handling; artwork is well preserved.",
        restorationHistory: "No known restoration.",

        previousOwner: "Private Collector",
        acquisitionMethod: "Private Collection",
        acquisitionDate: "2022-05-10",
        exhibitionHistory: "Contemporary Art Exhibition, Mumbai",

        authenticateBy: "Gallery Authentication Department",
        auctheticateDate: "2024-01-15",

        dimension: null,

        images: [
            {
                id: "img-001",
                url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
    {
        id: "lot-002",
        uuid: "a1000002-0000-4000-8000-000000000002",
        itemNumber: 2,
        title: "The Blue Horizon",
        description: "A contemporary painting featuring blue and earthy tones.",
        artistName: "Anjolie Ela Menon",
        medium: "Oil on Canvas",
        yearCreated: "2018",
        editionType: "UNIQUE",
        status: "ACTIVE",

        startingPrice: "180000",
        reservePrice: "220000",
        estimateLow: "220000",
        estimateHigh: "350000",
        currentBid: "245000",
        bidCount: 8,
        isFeatured: false,

        insureanceValue: "275000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Insured shipping available across India.",

        overallCondition: "Very Good",
        frameCondition: "Excellent",
        detailedConditionNotes: "Well-maintained with no visible major damage.",
        restorationHistory: null,

        previousOwner: "Art Collector",
        acquisitionMethod: "Gallery Purchase",
        acquisitionDate: "2021-08-20",
        exhibitionHistory: "Modern Indian Art Showcase",

        authenticateBy: "Independent Art Expert",
        auctheticateDate: "2023-11-05",

        dimension: null,

        images: [
            {
                id: "img-002",
                url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
    {
        id: "lot-003",
        uuid: "a1000003-0000-4000-8000-000000000003",
        itemNumber: 3,
        title: "Village Life",
        description: "A colorful composition inspired by everyday life.",
        artistName: "M. F. Husain",
        medium: "Mixed Media on Canvas",
        yearCreated: "2005",
        editionType: "UNIQUE",
        status: "ACTIVE",

        startingPrice: "500000",
        reservePrice: "600000",
        estimateLow: "600000",
        estimateHigh: "900000",
        currentBid: "675000",
        bidCount: 21,
        isFeatured: true,

        insureanceValue: "750000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Specialist packing recommended.",

        overallCondition: "Good",
        frameCondition: "Good",
        detailedConditionNotes: "Light wear consistent with age.",
        restorationHistory: "Professionally inspected.",

        previousOwner: "Private Art Collection",
        acquisitionMethod: "Auction Purchase",
        acquisitionDate: "2019-03-12",
        exhibitionHistory: "Indian Modernism Retrospective",

        authenticateBy: "Authorized Art Specialist",
        auctheticateDate: "2022-06-18",

        dimension: null,

        images: [
            {
                id: "img-003",
                url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
    {
        id: "lot-004",
        uuid: "a1000004-0000-4000-8000-000000000004",
        itemNumber: 4,
        title: "Serenity in Nature",
        description: "A landscape artwork inspired by nature.",
        artistName: "A. Ramachandran",
        medium: "Oil on Canvas",
        yearCreated: "2016",
        editionType: "UNIQUE",
        status: "SCHEDULED",

        startingPrice: "350000",
        reservePrice: "400000",
        estimateLow: "400000",
        estimateHigh: "550000",
        currentBid: null,
        bidCount: 0,
        isFeatured: false,

        insureanceValue: "400000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Shipping arranged after auction completion.",

        overallCondition: "Excellent",
        frameCondition: "Excellent",
        detailedConditionNotes: "No visible damage.",
        restorationHistory: null,

        previousOwner: "Private Collector",
        acquisitionMethod: "Estate Acquisition",
        acquisitionDate: "2020-10-10",
        exhibitionHistory: null,

        authenticateBy: "Gallery Authentication Department",
        auctheticateDate: "2024-03-20",

        dimension: null,

        images: [
            {
                id: "img-004",
                url: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
    {
        id: "lot-005",
        uuid: "a1000005-0000-4000-8000-000000000005",
        itemNumber: 5,
        title: "Golden Reflections",
        description: "An abstract work with warm golden tones.",
        artistName: "V. S. Gaitonde",
        medium: "Oil on Canvas",
        yearCreated: "1990",
        editionType: "UNIQUE",
        status: "SOLD",

        startingPrice: "750000",
        reservePrice: "800000",
        estimateLow: "800000",
        estimateHigh: "1200000",
        currentBid: "920000",
        bidCount: 17,
        isFeatured: true,

        insureanceValue: "1000000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Insured shipping arranged with the buyer.",

        overallCondition: "Very Good",
        frameCondition: "Good",
        detailedConditionNotes: "Well-preserved artwork.",
        restorationHistory: "Condition reviewed by an art specialist.",

        previousOwner: "Private Collector",
        acquisitionMethod: "Private Sale",
        acquisitionDate: "2017-07-25",
        exhibitionHistory: "Modern Masters Exhibition",

        authenticateBy: "Independent Art Expert",
        auctheticateDate: "2021-09-14",

        dimension: null,

        images: [
            {
                id: "img-005",
                url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
    {
        id: "lot-006",
        uuid: "a1000006-0000-4000-8000-000000000006",
        itemNumber: 6,
        title: "Modern Landscape",
        description: "A modern interpretation of the natural landscape.",
        artistName: "S. H. Raza",
        medium: "Acrylic on Canvas",
        yearCreated: "2012",
        editionType: "UNIQUE",
        status: "UNSOLD",

        startingPrice: "120000",
        reservePrice: "150000",
        estimateLow: "150000",
        estimateHigh: "200000",
        currentBid: "145000",
        bidCount: 5,
        isFeatured: false,

        insureanceValue: "160000",
        gstRate: "12",
        hsnCode: "97019100",
        shippingInfo: "Shipping subject to buyer arrangements.",

        overallCondition: "Good",
        frameCondition: "Fair",
        detailedConditionNotes: "Minor frame wear.",
        restorationHistory: null,

        previousOwner: "Private Collection",
        acquisitionMethod: "Gallery Purchase",
        acquisitionDate: "2018-02-14",
        exhibitionHistory: null,

        authenticateBy: "Gallery Authentication Department",
        auctheticateDate: "2020-12-01",

        dimension: null,

        images: [
            {
                id: "img-006",
                url: "https://images.unsplash.com/photo-1577083288073-40892c0860a4?w=400",
                mediaType: "IMAGE",
                isPrimary: true,
            },
        ],
        documents: [],

        currency: {
            code: "INR",
            symbol: "₹",
        },
    },
];

