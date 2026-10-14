import type { MyAccount } from "@/lib/types/profile.types"

// signup stores "First Last" as the username and leaves the profile names empty
export const hasProfileName = (account: Pick<MyAccount, "profile">) =>
    !!(account.profile?.firstName || account.profile?.lastName)

/** The account's first / last name, read from the username until the profile has its own. */
export function accountName(account: Pick<MyAccount, "profile" | "username">) {
    const [usernameFirst = "", ...usernameRest] = hasProfileName(account) ? [] : account.username.trim().split(/\s+/)

    return {
        firstName: account.profile?.firstName || usernameFirst,
        lastName: account.profile?.lastName || usernameRest.join(" "),
    }
}
