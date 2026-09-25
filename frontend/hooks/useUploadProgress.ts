import { useEffect, useState } from "react";

export const useUploadProgress = (active: boolean) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!active) {
            setProgress(0);
            return;
        }

        setProgress(5);
        const id = setInterval(() => {
            // moves quickly at first, then slows down, and stops at 90%
            setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 10) : p));
        }, 300);

        return () => clearInterval(id);
    }, [active]);

    return Math.round(progress);
};