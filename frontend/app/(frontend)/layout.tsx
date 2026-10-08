import { Header } from "@/components/core/frontend/header/header";
import { Footer } from "@/components/core/frontend/footer/footer";

export default function FrontendLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-dvh flex-col">
            <Header />
            <main id="main-content" className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
