import { Header } from "@/components/core/frontend/header/header";
import { Footer } from "@/components/core/frontend/footer/footer";
import { AkaraToaster } from "@/components/core/frontend/toast/AkaraToaster";
import { ContentProtection } from "@/components/core/frontend/ContentProtection";
import { WinnerCelebration } from "@/components/core/frontend/auctions/lot/WinnerCelebration";

import { GoogleAnalytics } from "@next/third-parties/google";

export default function FrontendLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="site-frontend flex min-h-dvh flex-col">
            <Header />
            {children}
            <Footer />
            <AkaraToaster />
            {/* "Congratulations, you've won" — only to the buyer, when their lot sells */}
            <WinnerCelebration />
            {/* blocks right-click / drag / save & DevTools shortcuts on artwork images */}
            <ContentProtection />
            {/* Google Analytics (gtag.js) — public site only, the dashboard isn't tracked */}
            <GoogleAnalytics gaId="G-2Y5CK9E41W" />
        </div>
    );
}
