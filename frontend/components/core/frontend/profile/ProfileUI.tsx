import axios from "axios"

export const getErrorMessage = (err: unknown) =>
    axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : "Something went wrong"

export function ProfileSection({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <section className="border border-neutral-200 bg-white p-5 md:p-6">
            <header className="border-b border-neutral-200 pb-4">
                <h2 className="text-lg font-normal text-neutral-950">{title}</h2>
                {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
            </header>
            <div className="pt-6">{children}</div>
        </section>
    )
}

// compact black button used at the bottom of each profile form
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
        <button
            type="submit"
            disabled={loading}
            className="h-11 cursor-pointer bg-neutral-950 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
            {loading ? loadingText : children}
        </button>
    )
}
