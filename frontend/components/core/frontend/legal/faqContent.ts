// The copy for /faq ("FINAL FAQS"), kept apart from the layout so it can be edited without touching the page.
// An answer is a list of blocks: a paragraph, a bulleted list, or a small sub-heading over the paragraphs after it.
// Wrap words in **double asterisks** to set them in bold.

export const FAQ_TITLE = "Frequently asked questions";

export const FAQ_INTRO =
    "Everything you need to know about buying at AKARA, from viewing the lots and registering to bid, to payment, delivery and Special Lots.";

export type FaqBlock = string | { list: string[] } | { heading: string };

export type FaqItem = { question: string; answer: FaqBlock[] };

export type FaqSection = { id: string; title: string; items: FaqItem[] };

export const FAQ_SECTIONS: FaqSection[] = [
    {
        id: "the-lots",
        title: "The lots",
        items: [
            {
                question: "How can I view the lots?",
                answer: [
                    "Every work in the auction is listed in the auction catalogue and identified by a unique lot number. Please quote this number whenever you refer to a lot or make an enquiry.",
                    "You can view the lots in any of the following ways:",
                    {
                        list: [
                            "**In person:** at the scheduled viewing",
                            "**Online:** through the online auction catalogue",
                            "**In print:** through the printed catalogue",
                        ],
                    },
                    "Viewing dates and timings are listed in the **Sales & Enquiries** section.",
                ],
            },
            {
                question: "What does the condition of a lot mean?",
                answer: [
                    "All lots are sold “as is”, meaning in their existing condition, including any faults, imperfections, wear or other characteristics.",
                    "We strongly encourage prospective bidders to inspect works in person wherever possible, and to request and review the relevant condition report before placing a bid. Condition reports are available upon request.",
                    "Please note that images in the catalogue are provided for reference only and are not a substitute for viewing the actual work. Colours, scale and surface details may appear differently in reproduction.",
                    "A condition report is offered as a guide and reflects the opinion of the author at the time it was prepared. It is not a complete or exhaustive description of the work. The absence of a reference to a fault or imperfection does not mean the work is free from them, and AKARA accepts no liability for any such omission. Bidders remain responsible for satisfying themselves as to the condition of a lot before bidding.",
                ],
            },
            {
                question: "What are Special Lots?",
                answer: [
                    "Some works in the auction may be classified as “National Art Treasures” under the Antiquities and Art Treasures Act, 1972, or other applicable legislation. These are referred to as Special Lots and are marked with an (⌘) in the catalogue.",
                    "Special Lots may be subject to restrictions on export from India. Buyers are responsible for complying with all applicable laws, regulations and requirements relating to the purchase, possession, transfer and export of such works.",
                ],
            },
            {
                question: "What are price estimates?",
                answer: [
                    "Each lot carries a low and a high estimate, which together give a guide to the value the work is expected to achieve at auction. Estimates may reflect factors such as the work’s condition, quality, rarity and provenance.",
                    "Estimates do not include the Buyer’s Premium, applicable taxes, shipping, insurance or any other charges, which are payable in addition to the final price.",
                    "Estimates may be revised before the auction.",
                ],
            },
            {
                question: "What is a Reserve Price?",
                answer: [
                    "The Reserve Price is the confidential minimum price at which a lot may be sold. It is agreed in advance with the consignor and is not disclosed to bidders.",
                    "Unless stated otherwise, all lots are offered subject to a Reserve Price. If the highest bid does not reach the Reserve Price, the lot will be treated as unsold.",
                ],
            },
        ],
    },
    {
        id: "registering-to-bid",
        title: "Registering to bid",
        items: [
            {
                question: "How do I register to bid?",
                answer: [
                    "First-time bidders are advised to register at least 72 hours before the auction, so that there is enough time for verification and approval.",
                    "To register, you may be asked to provide:",
                    {
                        list: [
                            "Full name",
                            "Address",
                            "Mobile number",
                            "Email address",
                            "KYC documentation",
                            "Credit card details, financial references and/or a deposit, where applicable",
                        ],
                    },
                    "In certain cases, AKARA may set a bidding limit for a bidder.",
                    "If you have registered with AKARA before, you may use your existing account credentials, where applicable.",
                    "Please make sure that all invoicing details are accurate at the time of registration, as they cannot be amended after the auction.",
                ],
            },
        ],
    },
    {
        id: "bidding",
        title: "Bidding",
        items: [
            {
                question: "How can I bid?",
                answer: [
                    "You may bid through the following methods, subject to availability.",
                    { heading: "Online Bidding" },
                    "Select the lot you wish to bid on and click “Place a Bid”. You may enter the next valid bid.",
                    "With regular bidding, you will need to place a new bid each time you are outbid. The platform will show the next valid bid based on the applicable bidding increment.",
                    "You can also view the bid history for each lot on the platform.",
                    { heading: "Telephone Bidding" },
                    "Registered bidders may request to bid by telephone. This is subject to the availability of telephone lines and confirmation from AKARA.",
                    { heading: "Mobile Bidding" },
                    "Mobile App bidding is not available for this auction. Registered bidders may bid online, by telephone, or by absentee/proxy bid, as described above.",
                    { heading: "Absentee / Proxy Bidding" },
                    "You may submit an absentee or proxy bid before the auction, either online or using the prescribed bidding form. The form is available at the back of the printed catalogue and can also be downloaded online.",
                ],
            },
            {
                question: "What are bidding increments?",
                answer: [
                    "A bidding increment is the minimum amount by which each new bid must exceed the current highest bid. The increment depends on the value of the current highest bid, and this determines the next valid bid.",
                    "The applicable bidding increments are shown on the auction platform and on the absentee/proxy bidding form.",
                ],
            },
            {
                question: "Can I cancel a bid?",
                answer: [
                    "Once the auction has begun, bidders cannot ordinarily cancel or withdraw a bid. Please bid carefully, as a bid is a binding commitment to purchase.",
                    "Absentee or proxy bids may be amended before the auction begins, subject to the applicable auction terms and platform functionality.",
                    "AKARA reserves the right to reject or cancel a bid where it considers this necessary.",
                ],
            },
            {
                question: "What currencies can I bid in?",
                answer: [
                    "All lots are sold in Indian Rupees (INR). Bidding takes place in INR only.",
                    "Buyers outside India may pay in US Dollars (USD). The equivalent USD amount will be provided for payment by wire transfer, and will be calculated at the exchange rate prevailing on the date of the invoice.",
                    "The currency and amount payable will be stated on your invoice.",
                    "Bidders are responsible for complying with all applicable foreign exchange regulations.",
                ],
            },
            {
                question: "What is the Opening Bid?",
                answer: [
                    "The Opening Bid is the amount at which bidding for a lot begins.",
                    "Absentee and proxy bids submitted before the auction are recorded in accordance with the applicable bidding rules. Where several absentee or proxy bids are received, the highest eligible bid determines the current bidding position. If two bids are for the same amount, priority may be given to the bid received first.",
                    "A proxy bid is placed automatically on your behalf, in the minimum increments needed to keep you in the lead, up to the maximum amount you have set. It will never exceed that maximum.",
                ],
            },
            {
                question: "How can I track my bids?",
                answer: [
                    "You can monitor your bids in the **My Bids / My Auction Gallery** section of the auction platform. The bid history for each lot shows the bids recorded during the auction.",
                    "Please refresh the auction page regularly to make sure you are viewing the latest bid and timing information.",
                ],
            },
        ],
    },
    {
        id: "closing-of-lots",
        title: "Closing of lots",
        items: [
            {
                question: "When does a lot sell?",
                answer: [
                    "The Closing Bid is the highest bid recorded when bidding on a lot closes.",
                    "A lot is sold only if the Closing Bid meets or exceeds its Reserve Price. If the Closing Bid is below the Reserve Price, the lot is considered unsold.",
                    "Where a proxy bidder’s maximum bid meets or exceeds the Reserve Price, the lot may be sold to that bidder at the Reserve Price, subject to the applicable auction terms.",
                    "Auction results will be published after the conclusion of the auction.",
                ],
            },
            {
                question: "What happens if a bid is placed just before the closing time?",
                answer: [
                    "To give all bidders a fair chance to respond, a bid placed within the final minute before a lot is scheduled to close extends the closing time by one minute. The lot stays open until a full minute passes with no further bids.",
                    "Please monitor the auction page closely during the closing period to follow any changes to the current bid and closing time.",
                ],
            },
        ],
    },
    {
        id: "buyers-premium-and-charges",
        title: "Buyer’s premium & additional charges",
        items: [
            {
                question: "What is the Buyer’s Premium?",
                answer: [
                    "The Buyer’s Premium is an additional charge payable by the successful bidder, over and above the winning bid.",
                    "For this auction, the Buyer’s Premium is 20% of the winning bid value.",
                    "GST is charged on the Buyer’s Premium at the applicable rate, in accordance with the location of the lot and its destination. GST is not applicable to buyers outside India.",
                ],
            },
            {
                question: "What will I be charged if I win a lot?",
                answer: [
                    "If you win a lot, the final amount payable may include:",
                    {
                        list: [
                            "Winning bid",
                            "Buyer’s Premium",
                            "Applicable GST and taxes",
                            "Shipping and handling",
                            "Insurance",
                            "Customs duties and import taxes, where applicable",
                            "Any other applicable charges",
                        ],
                    },
                    "All applicable charges will be itemised on your final invoice.",
                ],
            },
            {
                question: "Are there additional shipping and handling charges?",
                answer: [
                    "Yes. The buyer is responsible for the costs of packing, insurance, shipping and handling.",
                    "Shipping charges depend on factors such as the size, value and origin of the work, and its destination. Local deliveries may be charged at actual cost.",
                    "Where permitted, buyers may arrange their own shipping, provided that all applicable documentation and delivery requirements are met.",
                ],
            },
        ],
    },
    {
        id: "taxes-and-customs",
        title: "Taxes & customs",
        items: [
            {
                question: "What duties and taxes apply to my purchase?",
                answer: [
                    "All duties, taxes, customs charges and other government levies are the responsibility of the buyer. The amount payable depends on the value and origin of the work and on where it is being delivered.",
                    "For works originating in India and delivered within India, GST will be charged on the winning bid and on the Buyer’s Premium, in accordance with prevailing regulations.",
                    "For international shipments, the destination country may impose customs duties, VAT, import taxes or other charges.",
                    "Buyers are responsible for checking the import requirements of their own country before placing a bid.",
                ],
            },
        ],
    },
    {
        id: "invoicing-and-payment",
        title: "Invoicing & payment",
        items: [
            {
                question: "How will I receive my invoice?",
                answer: [
                    "Successful bidders will receive an invoice by email after the auction closes.",
                    "The invoice will itemise the winning bid, Buyer’s Premium and any applicable taxes, shipping, handling and other charges.",
                    "Invoices are issued using the details submitted during bidder registration. Please make sure your billing information is correct at the time of registration, as these details cannot be amended after the auction.",
                ],
            },
            {
                question: "When do I need to make payment?",
                answer: [
                    "Payment must be made within 7 business days of receiving the invoice.",
                    "A purchased work will not be released or shipped until payment has been received in cleared funds and all required documentation has been completed.",
                ],
            },
            {
                question: "How can I make payment?",
                answer: [
                    { heading: "Buyers in India" },
                    "Payment is made in INR. The accepted methods are stated on your invoice and may include:",
                    { list: ["Cheque / Demand Draft", "RTGS / NEFT"] },
                    { heading: "Buyers outside India" },
                    "Payment is made in USD by bank / wire transfer. The USD amount is calculated at the exchange rate prevailing on the date of the invoice, as described under currencies.",
                ],
            },
        ],
    },
    {
        id: "delivery-and-collection",
        title: "Delivery & collection",
        items: [
            {
                question: "When will my purchase be delivered?",
                answer: [
                    "Purchases are generally dispatched within 10-15 business days after payment has been received in cleared funds, subject to completion of all required documentation.",
                ],
            },
            {
                question: "What documentation will I receive?",
                answer: [
                    "The buyer will receive the invoice and any documentation associated with the purchased lot.",
                    "For Special Lots (marked with ⌘), this may include registration or other statutory documentation, where applicable.",
                    "Please note that AKARA does not issue separate certificates of authenticity unless this is specifically stated in the lot description.",
                ],
            },
            {
                question: "What should I do if my purchase arrives damaged?",
                answer: [
                    "All auction purchases are final.",
                    "If a work arrives damaged, please notify AKARA as soon as possible, and no later than five days after receipt. Include photographs and any other information our team requests.",
                    "Claims received after this period may not be considered.",
                ],
            },
        ],
    },
    {
        id: "special-lots",
        title: "Special lots",
        items: [
            {
                question: "Can Special Lots be exported from India?",
                answer: [
                    "No. Works classified as “National Art Treasures” (Special Lots, marked with ⌘) are legally non-exportable from India and must remain in the country after purchase.",
                    "Works that are more than 100 years old may also be subject to restrictions under the Antiquities and Art Treasures Act, 1972, and related regulations.",
                    "Buyers are responsible for understanding and complying with all applicable laws before bidding.",
                ],
            },
        ],
    },
    {
        id: "future-auctions",
        title: "Future auctions",
        items: [
            {
                question: "How can I participate in future AKARA auctions?",
                answer: [
                    "To register for an upcoming auction or to enquire about consigning a work, please contact the AKARA team. You can also subscribe to our mailing list to receive news of forthcoming auctions, exhibitions and other AKARA events.",
                ],
            },
        ],
    },
];
