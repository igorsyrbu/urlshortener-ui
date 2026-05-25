


"use client";

import { Button } from "@/components/ui/button";
import { LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
    const router = useRouter();

    return (
        <section className="flex min-h-screen w-full flex-col items-center justify-center bg-sidebar px-4">
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border-[0.5px] border-border bg-muted">
                    <LinkIcon className="size-7 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-8xl font-bold tracking-tight text-foreground">404</span>
                    <p className="text-lg font-medium text-foreground">Page not found</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        Go back
                    </Button>
                    <Button onClick={() => router.push("/dashboard")}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        </section>
    );
}