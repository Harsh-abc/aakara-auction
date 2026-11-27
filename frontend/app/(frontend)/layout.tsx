import { Header } from "@/components/core/frontend/header/header";
import { Footer } from "@/components/core/frontend/footer/footer";
import { AkaraToaster } from "@/components/core/frontend/toast/AkaraToaster";
import { ContentProtection } from "@/components/core/frontend/ContentProtection";
import { LivePipHost } from "@/components/core/frontend/auctions/lot/LivePipHost";
import { LotClosedNotice } from "@/components/core/frontend/auctions/lot/LotClosedNotice";
import { LotLiveNotice } from "@/components/core/frontend/auctions/lot/LotLiveNotice";
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
            {/* the live auction video in picture in picture — keeps playing while the user browses the site */}
            <LivePipHost />
            {/* "Congratulations, you've won" — only to the buyer, when their lot sells */}
            <WinnerCelebration />
            {/* "Lot 01 has closed" — to everyone else in the live room, after each hammer */}
            <LotClosedNotice />
            {/* "Lot 06 is live" — on any page, with a link to the lot in the live room */}
            <LotLiveNotice />
            {/* blocks right-click / drag / save & DevTools shortcuts on artwork images */}
            <ContentProtection />
            {/* Google Analytics (gtag.js) — public site only, the dashboard isn't tracked */}
            <GoogleAnalytics gaId="G-2Y5CK9E41W" />
        </div>
    );
}
