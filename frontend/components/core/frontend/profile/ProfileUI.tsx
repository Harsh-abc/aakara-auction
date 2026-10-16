import { cn } from "@/lib/utils"

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_SOLID } from "../storefront"

// a profile tab section: 18px title on a hairline (optional button on the right), then its fields.
// Field labels inside a profile section are set in ink (the auth forms use grey).
export function ProfileSection({
    title,
    description,
    action,
    children,
}: {
    title: string
    description?: string
    action?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <section className="flex flex-col gap-6">
            <header>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#cecece] pb-3.25">
                    <h2 className="text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">{title}</h2>
                    {action}
                </div>
                {description && <p className={cn(BODY, "mt-3")}>{description}</p>}
            </header>
            <div className="[&_label]:text-[#0d0d0d]">{children}</div>
        </section>
    )
}

// 44px black button at the bottom of each profile form
export function ProfileButton({
    loading,
    loadingText,
    children,
}: {
    loading: boolean
    loadingText: string
    children: React.ReactNode
}) {
    return (
        <button type="submit" disabled={loading} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
            {loading ? loadingText : children}
        </button>
    )
}
