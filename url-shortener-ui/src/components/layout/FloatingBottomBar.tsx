import type {ReactNode} from "react";

interface FloatingBottomBarProps {
    ariaLabel: string;
    children: ReactNode;
}

/**
 * The bar that floats at the bottom of a list page, beside the sidebar; the links page shows pagination or its selection.
 * On phones it spans the content width, so both bars are the same size, and sits 1.5rem above the home indicator (the
 * blurred fade under it grows to match); from `sm` it fits its content. In dark mode a
 * brighter top edge and a soft dark halo keep it apart from the cards, which share its fill.
 */
export function FloatingBottomBar({ariaLabel, children}: FloatingBottomBarProps) {
    return (
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:h-20 bg-linear-to-t from-sidebar via-sidebar/60 to-transparent backdrop-blur-md mask-[linear-gradient(to_top,black,transparent)] lg:hidden"
            />
            <div
                className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-4 lg:left-60">
                <nav
                    aria-label={ariaLabel}
                    className="pointer-events-auto flex w-full max-w-full items-center gap-1 sm:inline-flex sm:w-auto rounded-xl border-[0.5px] border-border bg-background/90 px-2 py-1 shadow-lg shadow-black/10 backdrop-blur-md dark:shadow-lg dark:shadow-black/50 dark:border-t-foreground/20"
                >
                    {children}
                </nav>
            </div>
        </>
    );
}
