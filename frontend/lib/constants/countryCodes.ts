import {
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
    type CountryCode,
} from "libphonenumber-js"

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

// every country offered next to phone inputs (signup, my profile), e.g. { country: "IN", name: "India", dialCode: "+91" }.
// names come from Intl, so render them with suppressHydrationWarning in case server and browser ICU differ
export const COUNTRY_CODES = getCountries()
    .map((country) => ({
        country,
        name: regionNames.of(country) ?? country,
        dialCode: `+${getCountryCallingCode(country)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

export const DEFAULT_COUNTRY: CountryCode = "IN"

export const isPhoneCountry = (value: string): value is CountryCode =>
    COUNTRY_CODES.some((item) => item.country === value)

export const dialCodeOf = (country: CountryCode) => `+${getCountryCallingCode(country)}`

export const countryNameOf = (country: CountryCode) => regionNames.of(country) ?? country

// the number in E.164 (e.g. +919876543210) when it's valid for that country, otherwise null.
// also drops a typed trunk prefix, e.g. UK 07911… becomes +447911…
export function toE164(number: string, country: CountryCode) {
    const parsed = parsePhoneNumberFromString(number, country)
    return parsed?.isValid() ? parsed.number : null
}

// phones are stored in E.164; split one back into its country and national number.
// numbers saved without a + are read as Indian, the only code offered before
export function splitPhone(phone: string | null | undefined): { countryCode: CountryCode; number: string } {
    if (!phone) return { countryCode: DEFAULT_COUNTRY, number: "" }

    const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY)
    if (!parsed) return { countryCode: DEFAULT_COUNTRY, number: phone.replace(/\D/g, "") }

    // a code shared by several countries (+1, +7, …) may not resolve to one; take the first that uses it
    const country =
        parsed.country ??
        COUNTRY_CODES.find((item) => item.dialCode === `+${parsed.countryCallingCode}`)?.country ??
        DEFAULT_COUNTRY

    return { countryCode: country, number: parsed.nationalNumber }
}
