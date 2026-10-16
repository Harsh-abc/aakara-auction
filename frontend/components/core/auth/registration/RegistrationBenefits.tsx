import { SectionHeading } from "@/components/core/frontend/storefront"

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
        <section aria-labelledby="registration-benefits-heading">
            <SectionHeading id="registration-benefits-heading" title="Bidding with Akara" />

            <ol className="mt-6 flex flex-col gap-4">
                {benefits.map((benefit, index) => (
                    <li key={benefit.title} className="flex items-start gap-5 bg-white p-5.25">
                        <span className="flex size-10 shrink-0 items-center justify-center border border-[#333] bg-white text-[14px] leading-5 text-[#0d0d0d]">
                            {index + 1}
                        </span>

                        <div className="flex min-w-0 flex-col gap-2">
                            <h3 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{benefit.title}</h3>
                            <p className="text-[12px] leading-[19.5px] text-[#717171]">{benefit.description}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    )
}
