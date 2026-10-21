"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {FOCUS_RING_CLASS} from "@/lib/constants";
import {LinkPendingIndicator} from "@/components/ui/link-pending-indicator";
import {SETTINGS_LABELS, SETTINGS_SECTIONS} from "@/lib/settings-constants";

export function SettingsTabs() {
    const pathname = usePathname();
    return (
        <nav aria-label={SETTINGS_LABELS.NAVIGATION} className="flex h-10 min-w-0 items-stretch gap-6 border-b-[0.5px] border-border">
            {SETTINGS_SECTIONS.map((section) => {
                const isActive = pathname === section.href;
                return (
                    <Link
                        key={section.href}
                        href={section.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "relative inline-flex items-center rounded-sm text-sm font-medium outline-none transition-colors",
                            FOCUS_RING_CLASS,
                            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {section.label}
                        <LinkPendingIndicator className="absolute -right-2.5 top-2"/>
                        {isActive && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground"/>}
                    </Link>
                );
            })}
        </nav>
    );
}
