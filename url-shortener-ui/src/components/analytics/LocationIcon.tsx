import type {StaticImageData} from "next/image";
import {MapPin} from "lucide-react";
import flagSprite from "@/components/analytics/flags/circle-flags.svg";
import {FLAG_CODES} from "@/components/analytics/flags/flag-codes";
import {formatRegionName} from "@/lib/format";

interface LocationIconProps {
    label: string;
    isCountry: boolean;
}

/** Next.js imports the sprite as `StaticImageData` (hashed, cached for good); Vitest imports it as a URL string. */
function resolveAssetUrl(asset: StaticImageData | string): string {
    return typeof asset === "string" ? asset : asset.src;
}

const FLAG_SPRITE_URL = resolveAssetUrl(flagSprite);

export function LocationIcon({label, isCountry}: LocationIconProps) {
    const flagCode = label.toLowerCase();

    if (!isCountry || !FLAG_CODES.has(flagCode)) {
        return (
            <div
                className="size-6 shrink-0 flex items-center justify-center bg-muted border-[0.5px] border-border rounded-full overflow-hidden">
                <MapPin className="size-3.5 text-muted-foreground"/>
            </div>
        );
    }

    return (
        <svg role="img" aria-label={label} className="size-5 rounded-full shrink-0">
            <use href={`${FLAG_SPRITE_URL}#${flagCode}`}/>
        </svg>
    );
}

export function getCountryName(countryCode: string): string {
    return formatRegionName(countryCode);
}
