import { cn } from "@/lib/utils";
import { BODY, Breadcrumb, PAGE_MAIN, PAGE_TITLE } from "@/components/core/frontend/storefront";

// the small "back to log in" style links under the forms (same as "Forgot your password?" on the login box)
export const PASSWORD_LINK = "text-center text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase hover:text-[#0d0d0d]";

/**
 * The forgot / reset password pages: same layout as Log in / Sign up — breadcrumb, 48px title and intro,
 * then the 420px bordered box the login form sits in.
 */
export function PasswordPageShell({ crumb, title, intro, children }: { crumb: string; title: string; intro: React.ReactNode; children: React.ReactNode }) {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Log in", href: "/registration" }, { label: crumb }]} />
                    <h1 className={cn(PAGE_TITLE, "mt-6")}>{title}</h1>
                    <p className={cn(BODY, "mt-3 max-w-168.5")}>{intro}</p>
                </div>
            </section>

            <section>
                <div className="page-container">
                    <div className="max-w-105 mx-auto border border-[#333] bg-white p-5 sm:p-6.5">{children}</div>
                </div>
            </section>
        </main>
    );
}
