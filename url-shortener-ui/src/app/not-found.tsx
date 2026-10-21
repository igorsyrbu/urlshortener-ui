"use client";

import {Button} from "@/components/ui/button";
import {NotFoundView} from "@/components/layout/NotFoundView";
import {useRouter} from "next/navigation";

export default function NotFoundPage() {
    const router = useRouter();

    return (
        <NotFoundView
            title="Page not found"
            description="The page you're looking for doesn't exist or may have been moved."
        >
            <Button variant="outline" onClick={() => router.back()}>
                Go back
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
            </Button>
        </NotFoundView>
    );
}
