const FAQS = [
    {
        question: "How do I place a bid on this lot?",
        answer: "Register and verify your account, then enter your maximum bid on the lot page. We bid on your behalf in set increments up to that amount.",
    },
    {
        question: "What happens if I am outbid?",
        answer: "You are notified by email and in your account as soon as another bidder passes you, with a direct link back to the lot to raise your bid.",
    },
    {
        question: "Are there additional costs beyond the hammer price?",
        answer: "Yes — a buyer's premium, applicable taxes and shipping are added to the hammer price. Full details are listed in the Conditions of auction.",
    },
    {
        question: "Can I request a condition report or more images?",
        answer: "Certainly. Contact the specialist listed alongside this lot and we will share a written condition report and additional photographs.",
    },
]

export function LotFaqs({ className }: { className?: string }) {
    return (
        <section className={className}>
            <div className="border-b border-[#cecece] pb-3.25">
                <h2 className="flex items-baseline gap-3">
                    <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">Help</span>
                    <span className="text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">FAQs</span>
                </h2>
            </div>

            <dl className="mt-6 divide-y divide-[#cecece] bg-white text-[14px]">
                {FAQS.map(({ question, answer }) => (
                    <div key={question} className="px-4 py-4">
                        <dt className="leading-5 font-medium text-[#0d0d0d]">{question}</dt>
                        <dd className="mt-2 leading-[22.75px] text-[#717171]">{answer}</dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}
