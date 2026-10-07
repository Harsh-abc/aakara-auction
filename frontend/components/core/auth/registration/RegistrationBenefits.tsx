const benefits = [
    {
        title: "Track your gallery",
        description: "Every lot you save appears in your auction gallery, with alerts before bidding closes.",
    },
    {
        title: "Bid from anywhere",
        description: "Place live or proxy bids online. All estimates, bids and hammer prices are in INR.",
    },
    {
        title: "Stay informed",
        description: "Outbid notices, invoices and shipping updates arrive by email and in your account.",
    },
]

export function RegistrationBenefits() {
    return (
        <section>
            <h2 className="border-b border-neutral-200 pb-4 text-lg text-neutral-900">
                Bidding with Akara
            </h2>

            <ol className="mt-8 flex flex-col gap-10 md:pl-4">
                {benefits.map((benefit, index) => (
                    <li key={benefit.title} className="flex items-start gap-8">
                        <span className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center border border-neutral-900 text-sm text-neutral-900">
                            {index + 1}
                        </span>

                        <div>
                            <h3 className="text-[15px] text-neutral-900">{benefit.title}</h3>
                            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                                {benefit.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    )
}
