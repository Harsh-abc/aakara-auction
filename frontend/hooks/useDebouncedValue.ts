import { useEffect, useState } from "react"

// value, but only after it has stopped changing for `delay` ms — for search-as-you-type
export function useDebouncedValue<T>(value: T, delay = 350): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay)
        return () => window.clearTimeout(id)
    }, [value, delay])

    return debounced
}
