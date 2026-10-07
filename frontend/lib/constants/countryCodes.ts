// dialling codes offered next to phone inputs (signup, my profile)
export const COUNTRY_CODES = [
    { label: "India", value: "+91" },
    { label: "United States", value: "+1" },
    { label: "United Kingdom", value: "+44" },
]

export const DEFAULT_COUNTRY_CODE = "+91"

// phones are stored with their code (e.g. +919876543210); split one back into code + national number.
// longest code first, so a +1 code can't swallow the start of a longer one
export function splitPhone(phone: string | null | undefined) {
    if (!phone) return { countryCode: DEFAULT_COUNTRY_CODE, number: "" }

    const match = [...COUNTRY_CODES]
        .sort((a, b) => b.value.length - a.value.length)
        .find((code) => phone.startsWith(code.value))

    if (!match) return { countryCode: DEFAULT_COUNTRY_CODE, number: phone.replace(/\D/g, "") }

    return { countryCode: match.value, number: phone.slice(match.value.length) }
}
