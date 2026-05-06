"use client";

import {Button} from "@/components/ui/button";
import {GoogleIcon} from "@/components/icons/GoogleIcon";

interface LoginGoogleSignInButtonProps {
    onClick: () => void;
}

export function LoginGoogleSignInButton({onClick}: LoginGoogleSignInButtonProps) {
    return (
        <Button
            type="button"
            variant="outline"
            onClick={onClick}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl font-semibold hover:bg-muted hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
        >
            <GoogleIcon/>
            Sign in with Google
        </Button>
    );
}
