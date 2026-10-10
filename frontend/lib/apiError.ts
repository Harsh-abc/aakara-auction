import axios from "axios"

type StatusMessages = Partial<Record<number, string>>

// used when the server answers without a readable `message` (e.g. Express's default HTML error page),
// so the user never sees "Request failed with status code 409"
const STATUS_MESSAGES: StatusMessages = {
    400: "Some details are missing or invalid. Check them and try again.",
    401: "Your session has expired. Please log in again.",
    403: "You don't have permission to do this.",
    404: "We couldn't find what you were looking for. It may have been removed.",
    409: "This conflicts with existing data. It may already exist or have just been changed by someone else. Refresh and try again.",
    410: "This has expired. Please start again.",
    413: "The file is too large. Try a smaller one.",
    423: "This account is temporarily locked. Try again later.",
    429: "Too many attempts. Please wait a few minutes and try again.",
}

/**
 * A message that is safe to show the user, from any error a request can throw.
 * The backend's own `message` wins; otherwise `byStatus`, then a generic message for the status, then `fallback`.
 */
export function getErrorMessage(
    error: unknown,
    fallback = "Something went wrong. Please try again.",
    byStatus: StatusMessages = {}
): string {
    // thunks reject with the message already extracted
    if (typeof error === "string" && error.trim()) return error

    if (axios.isAxiosError(error)) {
        if (!error.response) return "Can't reach the server. Check your internet connection and try again."

        const { status, data } = error.response
        const message = (data as { message?: unknown } | undefined)?.message
        if (typeof message === "string" && message.trim()) return message

        if (byStatus[status]) return byStatus[status]
        if (status >= 500) return "Something went wrong on our side. Please try again in a moment."
        return STATUS_MESSAGES[status] ?? fallback
    }

    return fallback
}
