const steps = [
    {
        title: "Register & verify",
        body: "Create an account with your details and upload a valid ID. Verification is usually completed within one business day, ahead of the sale opening.",
    },
    {
        title: "Browse the lots",
        body: "Explore the full catalogue with images, provenance, condition notes and estimates in INR, USD and GBP. Add works to your watchlist for alerts.",
    },
    {
        title: "Place your bid",
        body: "Enter your maximum bid and we will bid on your behalf in set increments. You will be notified instantly if you are outbid or if the lot is yours.",
    },
]

export function HowToBid() {
    return (
        <section>
            <header className="border-b border-neutral-200 pb-4">
                <h2 className="text-lg font-normal text-neutral-950">How to bid</h2>
            </header>
            <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
                {steps.map((step, index) => (
                    <li key={step.title}>
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#C9A24B]">
                            Step {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mt-4 text-sm font-medium text-neutral-950">{step.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-500">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    )
}
