import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { Header } from "@/components/core/frontend/header/header"
import { Footer } from "@/components/core/frontend/footer/footer"
import { NotFoundView } from "@/components/core/frontend/NotFoundView"

// same font as the storefront layout — this page renders outside it
const inter = Inter({
    subsets: ["latin"],
    display: "swap",
})

export const metadata: Metadata = {
    title: "Page not found | Akara",
}

/** The site-wide 404: any address that doesn't exist (storefront or dashboard) lands here. */
export default function NotFound() {
    return (
        <div className={`flex min-h-dvh flex-col bg-white ${inter.className}`}>
            <Header />
            <NotFoundView />
            <Footer />
        </div>
    )
}
