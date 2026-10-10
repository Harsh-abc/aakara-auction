import { Header } from "@/components/core/frontend/header/header";
import { Footer } from "@/components/core/frontend/footer/footer";
import { AkaraToaster } from "@/components/core/frontend/toast/AkaraToaster";

import { Inter } from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});

export default function FrontendLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={`flex min-h-dvh flex-col ${inter.className}`}>
            <Header />
            {children}
            <Footer />
            <AkaraToaster />
        </div>
    );
}
