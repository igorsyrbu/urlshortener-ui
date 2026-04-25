interface FaviconPlaceholderProps {
    className?: string;
}

export function FaviconPlaceholder({className = "size-5"}: FaviconPlaceholderProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width={20} height={20} rx={10} fill="hsl(var(--muted))"/>
            <path
                d="M10 2a8 8 0 100 16 8 8 0 000-16zm-3.2 12a1 1 0 01-1-1v-6a1 1 0 011-1h1.4a1 1 0 01.8.4l2 3v-2.4a1 1 0 011-1h.2a1 1 0 011 1v6a1 1 0 01-1 1h-1.4a1 1 0 01-.8-.4l-2-3v2.4a1 1 0 01-1 1h-.2z"
                fill="hsl(var(--muted-foreground))"
            />
        </svg>
    );
}
