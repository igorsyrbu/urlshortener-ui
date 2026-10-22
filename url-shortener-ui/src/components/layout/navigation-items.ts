import {ChartBar, LayoutDashboard, Link as LinkIcon, Settings, Tag, type LucideIcon} from "lucide-react";
import {PAGE_TITLES, ROUTES} from "@/lib/constants";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";
import {isPathWithin} from "@/lib/route-match";

export interface NavigationItem {
    title: string;
    href: string;
    /** Route prefix that keeps the item active and titles its pages; defaults to `href`. */
    matchPrefix?: string;
    icon: LucideIcon;
}

/** The dashboard's sections, in sidebar order; the header takes its page title from the same list. */
export const NAV_ITEMS: readonly NavigationItem[] = [
    {title: PAGE_TITLES.DASHBOARD, href: ROUTES.DASHBOARD, icon: LayoutDashboard},
    {title: PAGE_TITLES.LINKS, href: ROUTES.LINKS, icon: LinkIcon},
    {title: PAGE_TITLES.ANALYTICS, href: ROUTES.ANALYTICS, icon: ChartBar},
    {title: PAGE_TITLES.TAGS, href: ROUTES.TAGS, icon: Tag},
    {title: PAGE_TITLES.SETTINGS, href: SETTINGS_ROUTES.DEFAULT, matchPrefix: ROUTES.SETTINGS, icon: Settings},
];

function getMatchPrefix(item: NavigationItem): string {
    return item.matchPrefix ?? item.href;
}

/** The item whose prefix contains the path; the longest prefix wins, so a nested section beats its parent. */
export function findActiveNavItem(pathname: string): NavigationItem | undefined {
    return NAV_ITEMS
        .filter((item) => isPathWithin(pathname, getMatchPrefix(item)))
        .reduce<NavigationItem | undefined>((best, item) =>
            !best || getMatchPrefix(item).length > getMatchPrefix(best).length ? item : best, undefined);
}
