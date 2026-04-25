"use client";

import React, {useState} from "react";
import {Card, CardContent, CardDescription, CardHeader} from "@/components/ui/card";
import {API_BASE_URL} from "@/lib/api";
import {LoginMagicLinkForm} from "@/components/auth/LoginMagicLinkForm";
import type {LoginMessage} from "@/components/auth/LoginStatusMessage";
import {LoginStatusMessage} from "@/components/auth/LoginStatusMessage";
import {LoginOAuthDivider} from "@/components/auth/LoginOAuthDivider";
import {LoginGoogleSignInButton} from "@/components/auth/LoginGoogleSignInButton";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<LoginMessage | null>(null);

    const handleMagicLinkSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email) {
            setMessage({type: "error", text: "Please enter your email address"});
            return;
        }

        try {
            setLoading(true);
            setMessage(null);

            const response = await fetch(`${API_BASE_URL}/ott/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `username=${encodeURIComponent(email)}`,
            });

            if (!response.ok) {
                throw new Error(`Failed to generate magic link: ${response.status}`);
            }

            setMessage({
                type: "success",
                text: "Magic link sent! Check your email to continue.",
            });
            setEmail("");
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Failed to send magic link",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md border-border shadow-lg">
                <CardHeader className="space-y-3 pb-6 text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                    <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <LoginMagicLinkForm
                        email={email}
                        loading={loading}
                        onEmailChange={setEmail}
                        onSubmit={handleMagicLinkSubmit}
                    />

                    <LoginStatusMessage message={message}/>

                    <LoginOAuthDivider/>

                    <LoginGoogleSignInButton onClick={handleGoogleSignIn}/>
                </CardContent>
            </Card>
        </div>
    );
}
