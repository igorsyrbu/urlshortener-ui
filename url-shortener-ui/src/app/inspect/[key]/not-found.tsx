import Link from "next/link";
import {Button} from "@/components/ui/button";
import {NotFoundView} from "@/components/layout/NotFoundView";

export default function LinkNotFound() {
    return (
        <NotFoundView
            title="Link not found"
            description="This short link doesn't exist or has been removed. Check the address you were given."
        >
            <Button asChild>
                <Link href="/">Go to Short Links</Link>
            </Button>
        </NotFoundView>
    );
}
