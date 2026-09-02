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