"use client";

import { useEffect, useState } from "react";

import { getCategories, getSubCategories } from "@/services/operations/category.api";
import type { Category, SubCategory } from "@/lib/types/category.types";

// Short-lived module cache: the auction wizard asks for the same lists from
// several steps / lots. Expires so categories added meanwhile still show up.
const TTL_MS = 60_000;

type Entry<T> = { at: number; data?: T; inflight?: Promise<T> };

const categoriesEntry: Entry<Category[]> = { at: 0 };
const subEntries = new Map<string, Entry<SubCategory[]>>();

const load = <T,>(entry: Entry<T>, fetcher: () => Promise<{ success: boolean; data: T }>, empty: T) => {
    if (entry.data && Date.now() - entry.at < TTL_MS) return Promise.resolve(entry.data);
    if (!entry.inflight) {
        entry.inflight = fetcher()
            .then((res) => {
                entry.data = res.success ? res.data : empty;
                entry.at = Date.now();
                return entry.data;
            })
            .catch((error) => {
                console.error("Failed to load categories:", error);
                return entry.data ?? empty;
            })
            .finally(() => {
                entry.inflight = undefined;
            });
    }
    return entry.inflight;
};

const fresh = <T,>(entry: Entry<T> | undefined) =>
    entry?.data && Date.now() - entry.at < TTL_MS ? entry.data : undefined;

/** Every active category. */
export function useCategories() {
    const [categories, setCategories] = useState<Category[]>(() => fresh(categoriesEntry) ?? []);
    const [loading, setLoading] = useState(() => !fresh(categoriesEntry));

    useEffect(() => {
        let active = true;
        load(categoriesEntry, getCategories, []).then((list) => {
            if (!active) return;
            setCategories(list);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    return { categories, loading };
}

/** Subcategories of one category ([] while none is picked). */
export function useSubCategories(categoryUuid?: string) {
    const [state, setState] = useState<{ uuid?: string; list: SubCategory[] }>({ list: [] });

    useEffect(() => {
        if (!categoryUuid) return;
        let active = true;

        let entry = subEntries.get(categoryUuid);
        if (!entry) {
            entry = { at: 0 };
            subEntries.set(categoryUuid, entry);
        }

        load(entry, () => getSubCategories(categoryUuid), []).then((list) => {
            if (active) setState({ uuid: categoryUuid, list });
        });
        return () => {
            active = false;
        };
    }, [categoryUuid]);

    // a result for another category (or none yet) doesn't count
    const ready = !!categoryUuid && state.uuid === categoryUuid;
    return {
        subCategories: ready ? state.list : [],
        loading: !!categoryUuid && !ready,
    };
}
