import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge removes clashing classes (e.g. "text-sm text-lg" → keeps "text-lg").
 * It needs to know our custom text sizes from app/globals.css, otherwise it would think
 * "text-button" (a size) and "text-white" (a colour) clash and delete one of them.
 */
const mergeTailwindClasses = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: ["caption", "label", "button", "body-small"] }],
            tracking: [{ tracking: ["label", "button"] }],
        },
    },
});

/**
 * Combine class names. Later classes win when two clash.
 * Example: joinClassNames("px-4 text-ink", isActive && "text-white") → "px-4 text-white"
 */
export function joinClassNames(...classNames: ClassValue[]) {
    return mergeTailwindClasses(clsx(classNames));
}
