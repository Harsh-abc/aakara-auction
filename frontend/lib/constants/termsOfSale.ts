// Akara Auctions' Terms and Conditions of Sale, shown in full in the sign-up and
// register-to-bid dialogs. Users must scroll to the end before they can accept.
//
// `version` is sent with every sign-up and auction registration and stored on the
// user / participant row.
// When the text changes, bump it here AND TERMS_OF_SALE_VERSION in
// backend/src/utils/termsOfSale.js — the server rejects any other version.

export type TermsClause = {
    no: string;
    /** bold lead-in, e.g. "No warranty." */
    title?: string;
    text?: string;
    /** 1.1 only: defined term → meaning */
    definitions?: [string, string][];
    /** (a), (b), ... sub-items */
    items?: string[];
    /** text that follows the sub-items */
    after?: string[];
};

export type TermsSection = {
    no: number;
    heading: string;
    clauses: TermsClause[];
};

export const TERMS_OF_SALE: { version: string; title: string; notice: string; sections: TermsSection[] } = {
    version: "2026-10-31",
    title: "Terms and Conditions of Sale",
    notice: "Important notice to Bidders. These Terms and Conditions of Sale govern every auction and private sale conducted by Akara Auctions Private Limited. By registering to bid, bidding or buying, you agree to be bound by them. Please read them carefully before bidding, in particular Clause 7 (Description, Condition and Inspection), Clause 8 (Authenticity), Clause 12 (Payment), Clause 14 (Buyer Default), Clause 17 (Limitation of Liability) and Clause 19 (Governing Law and Dispute Resolution).",
    sections: [
        {
            no: 1,
            heading: "Definitions and Interpretation",
            clauses: [
                {
                    no: "1.1",
                    text: "In these Conditions, the following terms have the meanings given below:",
                    definitions: [
                        ["Antiquities Act", "means the Antiquities and Art Treasures Act, 1972."],
                        ["Applicable Law", "means all laws, regulations, orders and binding governmental requirements applicable to the relevant person or transaction."],
                        ["Artwork", "means each artwork offered for sale through the Auction House and identified in the relevant Catalogue or written sale confirmation."],
                        [
                            "Auction",
                            "means any sale process conducted or managed by the Auction House in respect of the Artworks, whether by way of a live physical auction or an online or hybrid electronic bidding event.",
                        ],
                        [
                            "Auction House",
                            "means Akara Auctions Private Limited, a company incorporated under the Companies Act, 2013, with its office at 3C, Amarchand Mansion, Madam Cama Road, Colaba, Mumbai 400001, India, and includes its successors and permitted assigns.",
                        ],
                        ["Auctioneer", "means the person authorised by the Auction House to conduct an Auction."],
                        [
                            "Bid",
                            "means an offer by a Bidder to buy an Artwork at an Auction, made in person, by telephone, online, by absentee or written bid, or by any other method approved by the Auction House.",
                        ],
                        ["Bidder", "means any person who registers to bid, makes a bid or purchases an Artwork through the Auction House, whether on its own account or for another person."],
                        ["Business Day", "means a day other than a Saturday, Sunday or public holiday on which banks are generally open for business in Mumbai, India."],
                        [
                            "Buyer",
                            "means the Bidder whose Bid is accepted as the Successful Bid for an Artwork, or the person who buys an Artwork by Private Sale. Where the Buyer is an individual, the term includes the Buyer’s heirs, executors and administrators.",
                        ],
                        ["Buyer’s Premium", "means the fee payable by the Buyer under Clause 11.1, exclusive of applicable taxes for the services rendered by the Auction House."],
                        ["Catalogue", "means this catalogue and any other printed or electronic catalogue or online listing issued by the Auction House that describes the Artworks offered for sale."],
                        [
                            "Collection Period",
                            "means 14 Business Days after the Auction House receives the Total Purchase Price in cleared funds, or such later date as the Auction House notifies in writing.",
                        ],
                        ["Conditions", "means these Terms and Conditions of Sale."],
                        ["Condition Report", "means a written report, description or photographic record issued by or on behalf of the Auction House about an Artwork’s apparent physical condition."],
                        ["Estimate", "means the Auction House’s indicative price range for an Artwork. An Estimate is not a valuation or a guarantee of sale or price."],
                        ["Event of Default", "has the meaning given in Clause 14.1."],
                        [
                            "Hammer Price",
                            "means the amount of the Successful Bid for an Artwork, excluding the Buyer’s Premium, applicable taxes and any packing, insurance or shipping charges. For a Private Sale, it means the agreed sale price.",
                        ],
                        ["KYC", "means know-your-customer, anti-money laundering, sanctions and similar checks required by Applicable Law or by the Auction House’s compliance policies."],
                        ["Platform", "means any website, mobile application or electronic bidding system operated or used by the Auction House for Auctions."],
                        ["Private Sale", "means a sale of an Artwork by private treaty under Clause 6.3."],
                        [
                            "Reserve Price",
                            "means the confidential minimum price agreed in writing between the relevant Seller and the Auction House, below which the corresponding Artwork shall not ordinarily be sold.",
                        ],
                        [
                            "Sale Date",
                            "means: (a) for an Auction, the date on which the Successful Bid is accepted; and (b) for a Private Sale, the date of the Auction House’s written acceptance of the Buyer’s offer.",
                        ],
                        ["Saleroom Notice", "means any addendum, notice or announcement about a specific Artwork that the Auction House makes available to Bidders before the Sale Date."],
                        ["Seller", "means the person on whose behalf the Auction House offers the relevant Artwork for sale."],
                        [
                            "Successful Bid",
                            "means the highest Bid accepted by the Auctioneer on the fall of the hammer or, for an online or hybrid Auction, by the Auction House’s electronic confirmation.",
                        ],
                        ["Total Purchase Price", "means, for an Artwork, the Hammer Price, the Buyer’s Premium and all applicable taxes and charges payable by the Buyer."],
                    ],
                },
                {
                    no: "1.2",
                    text: "In these Conditions, unless the context requires otherwise:",
                    items: [
                        "references to Clauses are to the clauses of these Conditions;",
                        "headings are for convenience only and do not affect interpretation;",
                        '"including" and similar words mean "including without limitation";',
                        "the singular includes the plural and vice versa;",
                        '"writing" and "written" include email; and',
                        "a reference to a Bidder includes the Buyer, and a reference to the Buyer includes any person who is jointly and severally liable with the Buyer under Clause 3.3.",
                    ],
                },
            ],
        },
        {
            no: 2,
            heading: "Application of these Conditions and Role of the Auction House",
            clauses: [
                {
                    no: "2.1",
                    text: "These Conditions govern each Bidder’s registration for and participation in every Auction, and every purchase of an Artwork through the Auction House (including any Private Sale).",
                },
                {
                    no: "2.2",
                    text: "These Conditions and the applicable Catalogue, Condition Reports and Saleroom Notices shall be made available before bidding or purchase. By registering, bidding or buying thereafter, the Bidder accepts those terms. The Auction House shall obtain and retain signed or recorded electronic acceptance identifying these Conditions and expressly incorporating the arbitration agreement in Clause 19.",
                },
                {
                    no: "2.3",
                    text: "Unless expressly stated otherwise, the Auction House acts only as the Seller’s agent. It does not act for the Bidder or the Buyer and does not own the Artwork. The contract of sale is between the Seller and the Buyer only. A related company of the Auction House may own, wholly or partly, or otherwise have a financial interest in certain Artworks offered for sale. In such cases, the Auction House acts as agent for the relevant Seller, and these Conditions apply to the sale.",
                },
                {
                    no: "2.4",
                    text: "In the event of inconsistency, these Conditions prevail over any Saleroom Notice, Catalogue, Condition Report, registration form or bidding instruction. A separate purchase agreement or other transaction-specific agreement overrides these Conditions only to the extent that it expressly identifies the provision being varied and is agreed in writing by the Buyer and an authorised representative of the Auction House.",
                },
                { no: "2.5", text: "An invoice or sale confirmation does not vary the terms of a completed sale unless the Buyer and the Auction House agree in writing." },
            ],
        },
        {
            no: 3,
            heading: "Registration and Eligibility of Bidders",
            clauses: [
                {
                    no: "3.1",
                    text: "Before bidding, each Bidder shall complete the Auction House’s registration process and provide all information, documents and declarations the Auction House requires. The Auction House may accept or refuse any registration at its discretion. New Bidders should submit their registration and KYC documents at least 72 hours before the Auction. Bidding access is subject to approval by the Auction House and completion of its required checks. The Auction House does not guarantee that late applications will be processed before the Auction.",
                },
                {
                    no: "3.2",
                    text: "Each Bidder is responsible for the accuracy of all information it supplies. Any Bid made using a Bidder’s registration details, paddle number or login credentials is treated as made by that Bidder.",
                },
                {
                    no: "3.3",
                    text: "A Bidder bidding for another person must tell the Auction House before the relevant Auction and provide evidence of its authority. Unless the Auction House agrees otherwise in writing, the Bidder and that person are jointly and severally liable for all amounts payable under these Conditions. The Auction House may impose limits on the number or value of Bids and require a deposit, payment guarantee or financial reference as a condition of granting or continuing bidding access. Any such limits shall be notified to the Bidder. The Auction House may reject Bids exceeding those limits.",
                },
                {
                    no: "3.4",
                    text: "Each Bidder shall provide complete and accurate invoicing details at registration, including details of any principal approved under Clause 3.3. Invoices shall be issued using those details. Any change requires the Auction House’s prior written approval and completion of any additional KYC or tax requirements.",
                },
            ],
        },
        {
            no: 4,
            heading: "Conduct of the Auction and Bidding",
            clauses: [
                {
                    no: "4.1",
                    text: "Subject to Applicable Law, the Auction House may decide how an Auction is conducted. It may reject any Bid, withdraw, combine or divide lots, and suspend, reopen or continue bidding to resolve a dispute, manifest error or technical failure. The Auction House may determine bidding increments and, before concluding a sale, may decline to accept the highest or any other Bid.",
                },
                {
                    no: "4.2",
                    text: "A Bidder may bid in person, online, by telephone or by any other method approved by the Auction House. A Bidder may withdraw a Bid only by notice received by the Auction House before that Bid is accepted as the Successful Bid. Once its Bid is accepted as the Successful Bid, the Bidder becomes the Buyer and is bound to buy the Artwork. Clause 17.3 governs liability for bidding errors and failures.",
                },
                {
                    no: "4.3",
                    text: "The Auctioneer’s decision on the conduct of the Auction and on the Successful Bid is final, except in the case of manifest error or fraud. In the absence of evidence to the contrary, the Auction House’s records shall establish the Bids received, their timing and the outcome of the Auction.",
                },
                {
                    no: "4.4",
                    text: "In the event of a technical interruption, the Auction House may extend closing times or reopen affected bidding and shall announce the revised arrangements on the Platform or through another appropriate channel. In the absence of evidence to the contrary, the system records of the Auction House shall establish the timing of interruptions and receipt of Bids. Bids received after the applicable closing time may be rejected, even if sent before that time. Liability for technical failures, including any resulting loss of information, is governed by Clause 17.3.",
                },
            ],
        },
        {
            no: 5,
            heading: "Reserve Price",
            clauses: [
                { no: "5.1", text: "An Artwork may be offered subject to a Reserve Price. The Reserve Price is confidential and will not be disclosed to any Bidder or third party." },
                {
                    no: "5.2",
                    text: "The right to bid on behalf of the Seller is expressly reserved. The Auctioneer may exercise that right only at amounts below the Reserve Price. If the Reserve Price is not met, the Auctioneer may withdraw the Artwork and declare it unsold. Except for bids placed by the Auctioneer as expressly permitted under this Clause, neither the Seller nor any person acting on its behalf may bid on the Seller’s Artwork. The Auction House may reject or disregard any Bid made in breach of this restriction.",
                },
                {
                    no: "5.3",
                    text: "Neither the Auction House nor any Seller is liable to any Bidder in relation to the existence, non-disclosure, revision, waiver or application of a Reserve Price.",
                },
            ],
        },
        {
            no: 6,
            heading: "Sale and Title",
            clauses: [
                {
                    no: "6.1",
                    text: "A binding contract of sale between the Seller and the Buyer is formed when the Buyer’s Bid is accepted as the Successful Bid. Unless expressly stated otherwise, the Auction House concludes that contract only as the Seller’s agent.",
                },
                {
                    no: "6.2",
                    text: "Title to an Artwork passes to the Buyer only when: (a) the Auction House has received the Total Purchase Price in cleared funds; and (b) all applicable KYC, tax and regulatory requirements have been met. Until then, the Auction House may keep possession of the Artwork.",
                },
                {
                    no: "6.3",
                    text: "If an Artwork remains unsold at Auction, the Auction House may arrange a Private Sale within the period and authority granted by the Seller under the applicable consignment agreement or any subsequent written authorisation. A binding sale is formed when the Auction House, acting within that authority, accepts the Buyer’s offer in writing. These Conditions apply to every Private Sale, including the obligation to pay the Buyer’s Premium.",
                },
                {
                    no: "6.4",
                    text: "If the Seller cannot transfer good title to the Artwork, the Auction House may rescind the sale. Any refund is subject to Clause 8.6 and Clause 8.7. The time limit in Clause 8.4 does not apply to a claim about title. For a refund under this Clause, the return requirements in Clause 8.5 apply subject to Applicable Law and the rights of any person with superior title to the Artwork.",
                },
                { no: "6.5", text: "The Auction House shall raise the invoices on the winning bidder for the hammer price along with the applicable taxes." },
            ],
        },
        {
            no: 7,
            heading: "Description, Condition and Inspection",
            clauses: [
                {
                    no: "7.1",
                    text: "Catalogue descriptions, illustrations, Estimates, provenance details, Condition Reports and other information about an Artwork are statements of opinion for the Bidder’s guidance only. They are not a representation, warranty or guarantee by the Auction House as to authenticity, condition, quality, provenance, attribution, age, origin, medium, size, value or suitability. Claims about authenticity are dealt with only under Clause 8, subject to any rights that cannot lawfully be excluded.",
                },
                { no: "7.2", text: "Every Artwork is sold on an “as is, where is” basis, with all faults and imperfections existing on the Sale Date, except as expressly provided in Clause 8." },
                {
                    no: "7.3",
                    text: "Each Bidder confirms, on making a Bid or agreeing to a Private Sale, that it has had a reasonable opportunity to inspect the Artwork and to take independent advice, and that it is satisfied with the Artwork’s condition, quality and suitability. A failure to inspect an Artwork or to obtain a Condition Report does not entitle the Buyer to cancel the sale or to delay or withhold payment.",
                },
                { no: "7.4", text: "Nothing in this Clause 7 excludes or limits any right of a Bidder or the Buyer that cannot be excluded or limited under Applicable Law." },
                {
                    no: "7.5",
                    text: "Subject to Clauses 8 and 17.1, the Auction House shall not be liable for errors or omissions in Catalogue descriptions, Condition Reports or other information concerning an Artwork. The exclusions and limitations of liability under these Conditions extend to the Auction House’s affiliates, directors, employees, agents and representatives when acting on its behalf.",
                },
            ],
        },
        {
            no: 8,
            heading: "Authenticity",
            clauses: [
                {
                    no: "8.1",
                    title: "No warranty.",
                    text: "The Auction House does not guarantee the authenticity of any Artwork. The Buyer may bring a claim under this Clause 8 (an “Authenticity Claim”) only if the artist’s name, stated without qualification in the heading of the Catalogue entry, is materially incorrect.",
                },
                {
                    no: "8.2",
                    title: "Exclusions.",
                    text: "An Authenticity Claim may not be based on:",
                    items: [
                        "the condition of the Artwork, including any restoration, damage, repair or framing;",
                        "provenance, exhibition history or literature references;",
                        "a description that was consistent with generally accepted expert opinion on the Sale Date; or",
                        "any matter that, on the Sale Date, could only have been established by a test or analysis that was not generally accepted, was unreasonably expensive or impracticable, or was likely to damage the Artwork.",
                    ],
                },
                {
                    no: "8.3",
                    title: "Who may claim.",
                    text: "Only the Buyer who bought the Artwork through the Auction House may bring an Authenticity Claim. The right cannot be assigned to, or used by, any later owner.",
                },
                {
                    no: "8.4",
                    title: "Time limit and evidence.",
                    text: "The Auction House must receive written notice of an Authenticity Claim, together with reasonable supporting evidence, within six (6) months after the Sale Date. The Auction House may require examination of the Artwork and an opinion from an independent expert selected by it, at the Buyer’s cost. A claim notified with reasonable supporting evidence within that period may be investigated and resolved afterwards. This notification period governs the contractual procedure under this Clause and does not exclude rights or liabilities that cannot lawfully be excluded.",
                },
                {
                    no: "8.5",
                    title: "Decision and return.",
                    text: "The Auction House may rescind the sale if, after reviewing the evidence and giving the Seller a reasonable opportunity to respond, it is reasonably satisfied that the claim is established. It may make that decision whether or not the Seller responds. Unless the Auction House agrees otherwise in writing, the Buyer must return the Artwork before any refund is paid. The Artwork must be returned in the same condition as on the Sale Date and free of any lien, encumbrance or third-party claim.",
                },
                {
                    no: "8.6",
                    title: "Refund.",
                    text: "Subject to Clause 8.7, if the sale is rescinded, the Buyer’s only remedy under this Clause 8 is a refund of the Hammer Price and Buyer’s Premium actually paid. Applicable taxes are refunded only to the extent they are recovered or can lawfully be adjusted. No interest, costs or other compensation is payable, and the Buyer may not recover the same amount twice.",
                },
                {
                    no: "8.7",
                    title: "Refund limited to recovery from the Seller.",
                    text: "The Auction House will pay a refund only to the extent it recovers funds from the Seller for that purpose. This includes amounts it lawfully applies from funds held for the Seller, and it applies to every part of the refund, including the Buyer’s Premium. The Auction House will pay each amount it recovers promptly after the Buyer has complied with Clause 8.5. It does not guarantee recovery from the Seller and is not required to use its own funds or to start legal proceedings.",
                },
                { no: "8.8", title: "Other rights.", text: "Nothing in this Clause 8 limits the Buyer’s rights against the Seller or any right or liability that cannot lawfully be excluded." },
            ],
        },
        {
            no: 9,
            heading: "Bidder’s Representations and Undertakings",
            clauses: [
                {
                    no: "9.1",
                    title: "Representations.",
                    text: "Each Bidder represents and warrants to the Auction House, on the date of registration and again on the date of each Bid and each purchase, that:",
                    items: [
                        "it has full capacity and authority to bid and to enter into each purchase;",
                        "all information and documents it provides to the Auction House are accurate and complete in all respects;",
                        "its participation in each Auction, and each purchase, complies with Applicable Law; and",
                        "any arrangement under which it bids for another person complies with Clause 3.3.",
                    ],
                },
                {
                    no: "9.2",
                    title: "Compliance.",
                    text: "Each Bidder shall comply with these Conditions, Applicable Law and all reasonable directions of the Auction House relating to any Auction or purchase.",
                },
                { no: "9.3", title: "Reliance.", text: "The Auction House accepts each registration and Bid, and concludes each contract of sale, in reliance on this Clause 9." },
            ],
        },
        {
            no: 10,
            heading: "KYC, Anti-Money Laundering and Sanctions",
            clauses: [
                {
                    no: "10.1",
                    title: "Information.",
                    text: "Each Bidder shall promptly give the Auction House all identity, address, tax, bank, beneficial ownership, source-of-funds and other information that the Auction House reasonably requires for KYC purposes or to complete a transaction. The Bidder shall also inform the Auction House promptly if any of that information changes.",
                },
                {
                    no: "10.2",
                    title: "Lawful funds.",
                    text: "On the date of each purchase, the Buyer represents and warrants that the funds used for that purchase come from lawful sources and that neither the Buyer nor any of its beneficial owners is prohibited from transacting under Applicable Law.",
                },
                {
                    no: "10.3",
                    title: "Auction House’s rights.",
                    text: "The Auction House may carry out any due diligence it reasonably considers necessary. It may refuse or suspend a registration, reject a Bid, suspend a transaction, withhold delivery or rescind a sale if:",
                    items: [
                        "the Bidder fails to provide information or documents that satisfy the Auction House;",
                        "the Bidder breaches this Clause 10; or",
                        "the Auction House reasonably believes that completing the transaction may breach Applicable Law.",
                    ],
                    after: ["The Auction House is not liable to any Bidder for any action it takes in good faith under this Clause 10.3."],
                },
                {
                    no: "10.4",
                    title: "Disclosure to authorities.",
                    text: "The Auction House may disclose any information about a Bidder or a transaction to any governmental, regulatory or law enforcement authority where Applicable Law requires it.",
                },
            ],
        },
        {
            no: 11,
            heading: "Buyer’s Premium and Taxes",
            clauses: [
                {
                    no: "11.1",
                    title: "Buyer’s Premium.",
                    text: "The Buyer shall pay the Buyer’s Premium of 20% of the Hammer Price, plus applicable GST, on every purchase, whether at an Auction or by Private Sale. The Buyer’s Premium belongs to the Auction House, subject to the express refund provisions of these Conditions.",
                },
                {
                    no: "11.2",
                    title: "Taxes.",
                    text: "The Buyer shall pay all taxes (including GST), duties and governmental charges on the purchase, collection, transport, import or export of an Artwork, at the rates applicable under Applicable Law. No amount shall be charged twice. The Auction House shall issue invoices and tax documents as required by Applicable Law.",
                },
                {
                    no: "11.3",
                    title: "Other charges.",
                    text: "The Buyer shall also pay all reasonable storage, packing, handling, insurance and delivery costs incurred for its Artworks, and all bank and payment charges on its payments along with applicable taxes.",
                },
                {
                    no: "11.4",
                    title: "Application of payments.",
                    text: "Subject to Applicable Law, the Auction House may apply any payment it receives from the Buyer against any amount the Buyer owes, in the order the Auction House decides.",
                },
                {
                    no: "11.5",
                    title: "Foreign-currency.",
                    text: "Foreign-currency equivalents displayed in the Catalogue or on the Platform are indicative only, may be rounded and do not determine the amount payable. If payment in another currency is approved, the applicable conversion rate shall be agreed in writing before the purchase.",
                },
            ],
        },
        {
            no: 12,
            heading: "Payment",
            clauses: [
                {
                    no: "12.1",
                    text: "The Buyer shall pay the Total Purchase Price and all other amounts due under these Conditions in cleared funds within 14 Business Days after the invoice date. Time for payment is of the essence.",
                },
                {
                    no: "12.2",
                    text: "Payment shall be made in Indian Rupees unless the Auction House approves another currency in writing before the purchase. The invoice shall specify the agreed currency. Payment shall be made from an account in the Buyer’s name by NEFT, RTGS or bank wire transfer to the Auction House’s designated account. Payment by cheque or demand draft requires prior written approval. The Auction House does not accept payment by credit card, debit card, UPI, digital wallet or online payment gateway. Payment is received only when cleared funds are credited to the designated account.",
                    after: [
                        "Buyers outside India may pay in US Dollars (USD). The equivalent USD amount will be provided for payment by wire transfer and will be calculated at the exchange rate prevailing on the date of the invoice. The currency and amount payable will be stated on the invoice, and bidders are responsible for complying with all applicable foreign exchange regulations.",
                    ],
                },
                {
                    no: "12.3",
                    text: "The Buyer shall make all payments without any deduction, withholding, counterclaim or set-off, except as required by Applicable Law. If the Buyer is required by law to withhold tax, it shall promptly give the Auction House the relevant withholding tax certificate.",
                },
                {
                    no: "12.4",
                    text: "Subject to Applicable Law, the Auction House may charge simple interest at 1% per month on overdue amounts from the due date until payment in full, along with the applicable taxes.",
                },
            ],
        },
        {
            no: 13,
            heading: "Collection, Shipping and Export",
            clauses: [
                {
                    no: "13.1",
                    text: "The Auction House shall release an Artwork for collection only after it has received the Total Purchase Price and all other amounts due in cleared funds and all applicable KYC and compliance requirements have been met.",
                },
                {
                    no: "13.2",
                    text: "The Buyer shall collect the Artwork within the Collection Period. If it does not, the Auction House may store the Artwork at the Buyer’s risk and cost and charge reasonable storage, handling and insurance costs until the Artwork is collected.",
                },
                {
                    no: "13.3",
                    text: "Any packing, shipping or delivery arranged by the Auction House is provided only as a convenience to the Buyer and is at the Buyer’s risk and cost. The Auction House is not liable for any act or omission of any third-party carrier or service provider.",
                },
                {
                    no: "13.4",
                    text: "The Buyer is responsible for obtaining all export, import, customs and other governmental approvals and for complying with Applicable Law, including the Antiquities Act and the Foreign Exchange Management Act, 1999.",
                },
                {
                    no: "13.5",
                    text: "If the Auction House knows, or has reason to believe, that an Artwork is an antiquity or art treasure under the Antiquities Act, it shall say so in the Catalogue entry or in a Saleroom Notice before the Sale Date. Each Bidder acknowledges that:",
                    items: ["such an Artwork may not be exported from India; and", "any transfer of its ownership must be notified to the registering officer as required by the Antiquities Act."],
                    after: [
                        "The Buyer shall co-operate with the Auction House and the Seller in completing that registration. No restriction on export, and no refusal or delay of any approval, entitles the Buyer to rescind the sale, withhold payment or claim a refund. It is clarified that Artworks qualifying as antiquities under the Antiquities Act, including paintings and other works of art at least 100 years old, and works notified by the Central Government as “national art treasures” marked as ⌘ are non-exportable from India, whether or not registered with the Archaeological Survey of India, except as expressly permitted under the Antiquities Act.",
                    ],
                },
                {
                    no: "13.6",
                    text: "Risk of loss of or damage to an Artwork passes to the Buyer on the earliest of:",
                    items: [
                        "collection of the Artwork by the Buyer or its authorised representative;",
                        "delivery of the Artwork to the Buyer’s nominated carrier or shipping agent; or",
                        "expiry of 14 Business Days after the invoice date, whether or not the Buyer has paid or collected the Artwork, unless the Auction House expressly agrees a later risk-transfer date in writing.",
                    ],
                    after: [
                        "Transfer of risk does not transfer title or entitle the Buyer to delivery before the requirements of Clause 13.1 have been satisfied. The Auction House’s liability while retaining custody remains subject to Clauses 13.8 and 17.",
                    ],
                },
                {
                    no: "13.7",
                    text: "From the time risk passes under Clause 13.6, the Buyer is solely responsible for insuring the Artwork, and the Auction House has no further obligation to insure it.",
                },
                {
                    no: "13.8",
                    text: "While an Artwork remains in the Auction House’s custody after risk has passed, it is held at the Buyer’s sole risk and cost. Subject to Clause 17, the Auction House is not liable for any loss of or damage to the Artwork unless caused by its gross negligence or wilful misconduct.",
                },
            ],
        },
        {
            no: 14,
            heading: "Buyer Default",
            clauses: [
                {
                    no: "14.1",
                    text: "Each of the following is an “Event of Default”:",
                    items: [
                        "the Buyer fails to pay any amount when due;",
                        "a Bidder fails to meet any KYC or other compliance requirement of the Auction House;",
                        "any representation or warranty given by a Bidder is untrue or misleading in any material respect;",
                        "a Bidder commits any other material breach of these Conditions; or",
                        "a Bidder becomes insolvent, or any insolvency, bankruptcy or winding-up proceeding is started by or against a Bidder.",
                    ],
                },
                {
                    no: "14.2",
                    text: "If an Event of Default occurs, the Auction House may do any one or more of the following:",
                    items: [
                        "cancel the sale;",
                        "resell the Artwork, at auction or privately, and recover from the Buyer any shortfall against the Total Purchase Price, plus the costs of resale;",
                        "keep and apply any deposit or part payment against amounts due;",
                        "keep the Artwork, or any other property of the Bidder in its possession, as security until all amounts due are paid, to the extent permitted by Applicable Law;",
                        "recover all reasonable storage, handling, insurance, transport, administrative and legal costs caused by the default;",
                        "set off any amount the Bidder owes against any amount payable to the Bidder;",
                        "disclose the Bidder’s identity and the default to the Seller, so that the Seller can pursue its own claim;",
                        "suspend or cancel the Bidder’s registration with immediate effect and refuse its participation in any Auction; and",
                        "refuse the Bidder’s future Bids or require a deposit before accepting them.",
                    ],
                },
                {
                    no: "14.3",
                    text: "These remedies are in addition to interest and any other right under these Conditions or Applicable Law. However, the Auction House shall not recover the same loss more than once.",
                },
            ],
        },
        {
            no: 15,
            heading: "Assignment",
            clauses: [
                {
                    no: "15.1",
                    text: "No Bidder shall assign, transfer, delegate, pledge or encumber any of its rights or obligations under these Conditions or any contract of sale without the Auction House’s prior written consent. Any purported assignment in breach of this Clause 15.1 is void.",
                },
                {
                    no: "15.2",
                    text: "To the extent permitted by Applicable Law, the Auction House may assign or transfer its rights and obligations under these Conditions to an affiliate, or to a successor to all or substantially all of its business, by written notice to the Bidder. Each Bidder consents to any such transfer and shall sign any documents reasonably required to give effect to it.",
                },
            ],
        },
        {
            no: 16,
            heading: "Indemnity",
            clauses: [
                {
                    no: "16.1",
                    text: "Each Bidder shall indemnify the Auction House, the Seller, the Auctioneer and their respective directors, officers, employees and agents (each an “Indemnified Person”) against all claims, losses, liabilities, costs and expenses arising out of:",
                    items: [
                        "any breach of these Conditions by the Bidder;",
                        "any inaccurate information provided by the Bidder;",
                        "any breach of Applicable Law by the Bidder;",
                        "any third-party claim arising from the Buyer’s ownership, use, export, sale or other dealing with an Artwork after title or risk has passed to the Buyer; or",
                        "any negligence, fraud or wilful misconduct of the Bidder.",
                    ],
                },
                {
                    no: "16.2",
                    title: "Exception.",
                    text: "Clause 16.1 does not apply to the extent a loss is caused by the fraud, gross negligence or wilful misconduct of the relevant Indemnified Person.",
                },
                { no: "16.3", title: "Enforcement.", text: "The Auction House may enforce this Clause 16 on behalf of any other Indemnified Person." },
            ],
        },
        {
            no: 17,
            heading: "Limitation of Liability",
            clauses: [
                {
                    no: "17.1",
                    text: "Nothing in these Conditions excludes or limits liability for fraud or fraudulent misrepresentation, or any other liability to the extent that it cannot lawfully be excluded or limited.",
                },
                {
                    no: "17.2",
                    text: "Subject to Clause 17.1, the Auction House is not liable for any indirect, incidental, special or consequential loss, or for any loss of profit, opportunity or appreciation in value.",
                },
                {
                    no: "17.3",
                    text: "Subject to Clause 17.1, and except where caused by its gross negligence or wilful misconduct, the Auction House is not liable for any loss arising from any error, delay, interruption or failure affecting live, online, hybrid, telephone or absentee bidding. This includes any failure of internet connectivity, the Platform, audio or video transmission, equipment or communications, and any failure to receive, transmit or record a Bid accurately or on time. Sending a Bid does not mean that it has been received or accepted. The Auction House may use its powers under Clause 4.1 to deal with any such event.",
                },
                {
                    no: "17.4",
                    text: "Subject to Clause 17.1, and except in the case of wilful misconduct, the Auction House’s total liability arising out of or in connection with an Artwork, whether in contract, tort (including negligence), breach of statutory duty or otherwise, shall not exceed the Buyer’s Premium actually received by it for that Artwork. This cap does not reduce any refund payable under Clause 6.4 or Clause 8, which is governed by those Clauses (including the Seller-recovery condition in Clause 8.7).",
                },
            ],
        },
        {
            no: 18,
            heading: "Confidentiality and Personal Data",
            clauses: [
                {
                    no: "18.1",
                    text: "The Auction House and each Bidder shall keep confidential the non-public terms of any sale and any non-public information it receives in connection with an Auction, except where disclosure is required by Applicable Law or is reasonably required to complete, administer or enforce a transaction.",
                },
                {
                    no: "18.2",
                    text: "The Auction House may collect, use and disclose each Bidder’s personal data for registration, KYC, auction administration, completing sales, processing payments, delivery, legal and tax compliance, fraud prevention and managing disputes, in accordance with its privacy notice and Applicable Law (including the Digital Personal Data Protection Act, 2023 and its rules, and the EU or UK GDPR, in each case to the extent applicable and in force). The Auction House may retain such data for as long as reasonably necessary for the purpose stated in this Clause or required by Applicable Law. Subject to Applicable Law, the exclusions and the limitations of liability in Clause 17 apply to the collection, use, storage and disclosure of personal data under this clause.",
                },
                {
                    no: "18.3",
                    text: "Notwithstanding Clause 18.1 and subject to the relevant agreement with the Seller, the Auction House may publish and retain Artwork images, Catalogue descriptions and sale results, including Hammer Prices, on the Platform and in its publications and archives following the sale. Unless required by Applicable Law, the Auction House is not obliged to remove such information at the Buyer’s request. This Clause does not authorise publication of the Buyer’s identity.",
                },
            ],
        },
        {
            no: 19,
            heading: "Governing Law and Dispute Resolution",
            clauses: [
                { no: "19.1", text: "These Conditions, and any non-contractual obligation arising out of or in connection with them, are governed by the laws of India." },
                {
                    no: "19.2",
                    text: "Any dispute between the Auction House and a Bidder arising out of or in connection with these Conditions, including any question about their existence, validity or termination, shall be finally resolved by arbitration under the Arbitration and Conciliation Act, 1996.",
                },
                {
                    no: "19.3",
                    text: "The arbitral tribunal shall consist of a sole arbitrator appointed by agreement between the Auction House and the Bidder or, failing agreement, under Section 11 of the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration is Mumbai, India, and the language of arbitration is English.",
                },
                {
                    no: "19.4",
                    text: "Nothing in this Clause 19 prevents the Auction House or a Bidder from seeking interim relief. Subject to the arbitration agreement in Clause 19.2, the courts at Mumbai, Maharashtra have exclusive jurisdiction.",
                },
            ],
        },
        {
            no: 20,
            heading: "General",
            clauses: [
                {
                    no: "20.1",
                    title: "Severability.",
                    text: "If any provision of these Conditions is invalid, illegal or unenforceable, it shall be severed to the minimum extent necessary and the rest of these Conditions remains in effect.",
                },
                {
                    no: "20.2",
                    title: "Entire agreement.",
                    text: "These Conditions, the documents incorporated under Clause 2.2, any completed registration or bidding form and any separate purchase agreement constitute the entire agreement between the Auction House and the Bidder concerning their subject matter, subject to Clause 2.4. Nothing in this Clause excludes liability referred to in Clause 17.1.",
                },
                {
                    no: "20.3",
                    title: "Force majeure.",
                    text: "Neither the Auction House nor any Bidder is liable for any delay or failure to perform caused by events beyond its reasonable control. However, no such event excuses or suspends the Buyer’s obligation to pay any amount due under these Conditions.",
                },
                {
                    no: "20.4",
                    title: "Amendments.",
                    text: "The Auction House may amend these Conditions for future Auctions by publishing the amended terms before registration or bidding. Amendments do not affect an existing sale or accrued rights. Lot-specific factual corrections may be made by Saleroom Notice before completion of the relevant sale. Any other variation is subject to Clause 2.4.",
                },
                {
                    no: "20.5",
                    title: "Notices.",
                    text: "Any notice under these Conditions must be in writing and delivered by hand, registered post or email: to the Auction House, at its office set out in Clause 1.1 or an email address designated by it in writing; and to a Bidder, at the postal or email address in its registration details (or, in either case, any other address notified in writing). A notice is treated as received on delivery or, if sent by email, on the next Business Day after sending, unless the sender receives a delivery failure message.",
                },
                {
                    no: "20.6",
                    title: "Waiver.",
                    text: "A delay in exercising, or a partial exercise of, any right does not waive that right. A waiver is effective only if it is in writing and signed by the person granting it, and it applies only to the instance stated.",
                },
                {
                    no: "20.7",
                    title: "Continuing effect.",
                    text: "These Conditions continue to apply to each sale after it is completed. Any refusal, suspension or cancellation of a Bidder’s registration does not affect any completed sale, any Bid already accepted, any payment obligation or any accrued right or liability.",
                },
            ],
        },
    ],
};
