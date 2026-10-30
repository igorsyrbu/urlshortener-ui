"use client";

import {useQuery} from "@tanstack/react-query";
import {currentUserQueryOptions} from "@/lib/query/user-queries";
import type {UserProfile} from "@/lib/types";

/** The signed-in user, or `null` while the profile is loading (the dashboard renders before it arrives). */
export function useCurrentUser(): UserProfile | null {
    const {data} = useQuery(currentUserQueryOptions);
    return data ?? null;
}
