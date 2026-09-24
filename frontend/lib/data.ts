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