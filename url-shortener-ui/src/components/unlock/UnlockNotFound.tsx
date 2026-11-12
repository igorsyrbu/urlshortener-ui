import Link from "next/link";
import {NotFoundView} from "@/components/layout/NotFoundView";
import {Button} from "@/components/ui/button";
import {ROUTES, UNLOCK_COPY} from "@/lib/constants";

export function UnlockNotFound() {
    return (
        <NotFoundView title={UNLOCK_COPY.NOT_FOUND_TITLE} description={UNLOCK_COPY.NOT_FOUND_DESCRIPTION}>
            <Button asChild>
                <Link href={ROUTES.HOME}>{UNLOCK_COPY.NOT_FOUND_ACTION}</Link>
            </Button>
        </NotFoundView>
    );
}
