import Link from "next/link";
import {LinkIcon} from "lucide-react";
import {APP_NAME, ROUTES} from "@/lib/constants";

/** The quiet "Short Links" link home at the bottom of the full-page public screens (login, unlock). */
export function PublicPageFooter() {
    return (
        <footer>
            <Link href={ROUTES.HOME} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <LinkIcon className="size-3.5"/>
                {APP_NAME}
            </Link>
        </footer>
    );
}
