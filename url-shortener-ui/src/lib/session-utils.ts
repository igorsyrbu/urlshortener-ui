import {HelpCircle, Laptop, LucideIcon, Monitor, Smartphone} from "lucide-react";

export interface UserSession {
    id: string;
    city: string;
    country: string;
    region: string;
    device: string;
    os: string;
    current: boolean;
}

const UNKNOWN = "unknown";
const UNKNOWN_LOCATION_LABEL = "unknown location";

function isUnknown(value: string | undefined): boolean {
    return !value || value.toLowerCase() === UNKNOWN;
}

export function getIconForDevice(device: string, os: string): LucideIcon {
    const d = (device || "").toLowerCase();
    const o = (os || "").toLowerCase();

    if (d === UNKNOWN && o === UNKNOWN) return HelpCircle;
    if (!device && !os) return HelpCircle;

    if (d.includes("mac") || d.includes("pc") || d.includes("desktop") || d.includes("window")) return Monitor;
    if (d.includes("iphone") || d.includes("mobile") || d.includes("android")) return Smartphone;
    return Laptop;
}

export function formatLocation(session: UserSession): string {
    const parts = [session.city, session.region, session.country].filter(
        (part) =>
            part &&
            part.trim() !== "" &&
            part.toLowerCase() !== UNKNOWN &&
            part.toLowerCase() !== UNKNOWN_LOCATION_LABEL,
    );
    return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

export function formatDeviceText(session: UserSession): string {
    const deviceUnknown = isUnknown(session.device);
    const osUnknown = isUnknown(session.os);

    if (deviceUnknown && osUnknown) return "Unknown Device";
    if (deviceUnknown) return session.os;
    if (osUnknown) return session.device;
    return `${session.device} (${session.os})`;
}
