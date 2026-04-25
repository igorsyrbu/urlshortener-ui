"use client";

import {useState} from "react";
import {MapPin} from "lucide-react";
import {FLAG_SERVICE_URL} from "@/lib/constants";

interface LocationIconProps {
    label: string;
    isCountry: boolean;
}

const COUNTRY_CODE_LENGTH = 2;

export function LocationIcon({label, isCountry}: LocationIconProps) {
    const [error, setError] = useState(false);
    const isCode = label && label.length === COUNTRY_CODE_LENGTH;

    if (!isCountry || !isCode || error) {
        return (
            <div
                className="size-6 shrink-0 flex items-center justify-center bg-muted border-[0.5px] border-border rounded-full overflow-hidden">
                <MapPin className="size-3.5 text-muted-foreground"/>
            </div>
        );
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={`${FLAG_SERVICE_URL}/${label.toLowerCase()}.svg`}
            alt={label}
            title={label}
            className="size-5 rounded-full shrink-0 object-cover"
            onError={() => setError(true)}
        />
    );
}

export function getCountryName(countryCode: string): string {
    try {
        const regionNames = new Intl.DisplayNames(["en"], {type: "region"});
        return regionNames.of(countryCode) || countryCode;
    } catch {
        return countryCode;
    }
}
