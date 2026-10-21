import type {ReactNode} from "react";
import {LinkIcon} from "lucide-react";

interface NotFoundViewProps {
    title: string;
    description: string;
    children: ReactNode;
}

export function NotFoundView({title, description, children}: NotFoundViewProps) {
    return (
        <section className="flex min-h-screen w-full flex-col items-center justify-center bg-sidebar px-4">
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-xl border-[0.5px] border-border bg-muted">
                    <LinkIcon className="size-7 text-muted-foreground"/>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-8xl font-bold tracking-tight text-foreground">404</span>
                    <h1 className="text-lg font-medium text-foreground">{title}</h1>
                    <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex gap-2">{children}</div>
            </div>
        </section>
    );
}
