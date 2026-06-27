import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getJwtTTL(token: string): string | null {
    try {
        const {iat, exp} = JSON.parse(atob(token.split(".")[1]));
        if (!iat || !exp) throw new Error("Missing iat or exp claims");

        const totalMinutes = Math.floor((exp - iat) / 60);
        const minutes = totalMinutes % 60;
        const hours = Math.floor(totalMinutes / 60) % 24;
        const days = Math.floor(totalMinutes / (60 * 24));

        if (days > 0) return `${days} days ${hours} hours ${minutes} minutes`;
        if (hours > 0) return `${hours} hours ${minutes} minutes`;
        return `${totalMinutes} minutes`;
    } catch {
        return null;
    }
}

export function generateTitleFromHostname(hostname: string): string {
    // bracketed IPv6 with optional port: [2001:db8::1]:8080
    const bracketedIPv6 = hostname.match(/^\[([^\]]+)\]/);
    if (bracketedIPv6) return bracketedIPv6[1];

    // bare IPv6: contains more than one colon
    const isIPv6 = (hostname.match(/:/g) ?? []).length > 1;
    if (isIPv6) return hostname;

    const withoutPort = hostname.replace(/:\d+$/, "");

    const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(withoutPort);
    if (isIPv4) return withoutPort;

    const segments = withoutPort
        .replace(/^www\./, "")
        .split(".");

    const meaningful =
        segments.length >= 3 ? segments.slice(0, -2) :
            segments.length === 2 ? segments.slice(0, -1) :
                segments;

    const cleaned = meaningful.join(" ");

    const decoded = (() => {
        try {
            return decodeURIComponent(cleaned);
        } catch {
            return cleaned;
        }
    })();

    const readable = decoded
        .replace(/[-_]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const titled = readable
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

    return titled || withoutPort;
}

export function isModalOpen(): boolean {
    if (typeof document === "undefined") return false;
    return document.querySelector('[role="dialog"], [role="alertdialog"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"]') !== null;
}

