// Figma "Terms and Conditions | Akara" — the copy for /terms, kept apart from the layout so it can be edited
// (or later fetched) without touching the page.

export const TERMS_UPDATED = "01 October 2026"

export type TermsSection =
    | { id: string; title: string; kind: "definitions"; items: { term: string; text: string; list?: string[] }[] }
    | { id: string; title: string; kind: "clauses"; items: string[] }

export const TERMS_SECTIONS: TermsSection[] = [
    {
        id: "definitions",
        title: "Definitions",
        kind: "definitions",
        items: [
            {
                term: "Buyer",
                text: "shall mean a person who is registered as a user to access the Website and buys an Object from the Website.",
            },
            {
                term: "Description",
                text: "means all the details of an Object as set out in the Website and may include, without limitation, the name of the artist, designer or manufacturer, the title of the Object, and the following additional details:",
                list: [
                    "For artworks: the signature of the artist / date of the Object (if any), the surface, medium and dimensions, year, provenance and any additional information related to the Object.",
                    "For jewellery, watches and precious stones: any other features or weight or characteristics of the Object mentioned on the Website.",
                ],
            },
            {
                term: "Object",
                text: "means the artwork, jewellery, watches, loose precious stones and other such articles offered by Akara for sale either individually or collectively (as a single unit) through the Website.",
            },
        ],
    },
    {
        id: "general-terms",
        title: "General terms",
        kind: "clauses",
        items: [
            "The Object made available for sale on the Website may not always be in the physical possession of Akara and may be physically located anywhere in the world.",
            "All Objects made available for sale on the Website will be sold at the price listed and no discounts will be granted to the Buyer. The price of the Object listed does not include duties, taxes, shipping and handling, which will be charged as applicable and would depend on the physical location of the Object as well as the shipping address provided by the Buyer. The information provided during registration or amended at the time of finalizing a purchase shall be the final billing address and shipping address for delivery of the Object.",
            "The Buyer agrees that the Buyer is liable for any duties and taxes that might be applicable on the purchase as per clause 2 above and such charges shall be payable in addition to the price of the Object.",
            "All invoices will be raised by Akara based on the registration information provided by the Buyer or amended at the time of finalizing a purchase and payments will be accepted only from the Buyer so registered. In the event that a payment is sent from elsewhere, it may either be returned or could result in a delay in the processing of the order until management decides whether a variation from the registration details may be accepted.",
            "Placing an order on www.akaraart.com constitutes an irrevocable acceptance of the purchase. Unless rescinded / cancelled by Akara within 2 working days on account of a default by the seller or any prior or continuing breach by the Buyer, such acceptance results in an enforceable contract of sale. The contract of sale is between Akara (acting as the agent of the seller) and the Buyer.",
            "Akara shall have the right to cancel any order placed on the website www.akaraart.com, at any time prior to the delivery of the Object, without assigning any reason whatsoever.",
            "Akara shall assume no responsibility for any errors or omissions that may occur in the Description, pricing or other content related to the Object. In the event of such an error, Akara reserves the right to cancel the order placed by the Buyer by informing the Buyer in writing.",
            "The Object will be delivered / shipped to the Buyer once all necessary documentation, relating to transportation, tax, etc. as may be reasonably requested for by Akara are completed and payment has been realized in full including any additional charges. Transit insurance costs will be included in such additional charges, unless specifically advised otherwise by the Buyer. In the event that the Buyer chooses to himself collect the Object from Akara he must do so within two weeks of Akara receiving the payment. In the event that the Object is not so collected within a period of two weeks, storage and insurance costs will be applicable on the purchase and will be determined at the complete discretion of Akara.",
            "You agree to abide by all provisions prescribed in these terms and conditions. In particular, you warrant that all information that you submit will be true and accurate (including without limitation your credit card number and expiration date), and you agree to pay all costs, charges plus all applicable taxes for the purchases made by you.",
            "Akara is authorized by the sellers to exercise complete discretion in (i) the illustration and descriptions of Object for viewing and sale and (ii) acceptance or rejection of orders received.",
        ],
    },
    {
        id: "related-policies",
        title: "Related policies",
        kind: "clauses",
        // placeholder from the design (repeats general term 10) until the real policy links are written
        items: [
            "Akara is authorized by the sellers to exercise complete discretion in (i) the illustration and descriptions of Object for viewing and sale and (ii) acceptance or rejection of orders received.",
        ],
    },
]
