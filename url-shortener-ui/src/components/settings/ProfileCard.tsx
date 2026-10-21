"use client";

import {useState} from "react";
import {User} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {toast} from "sonner";
import {fetchWithAuth} from "@/lib/api";
import {useAuthStore, UserProfile} from "@/lib/store/auth";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {PROFILE_FIELD_CLASS, PROFILE_LABEL_CLASS, ProfileCardSkeleton} from "@/components/settings/ProfileCardSkeleton";
import {SETTINGS_CARD_WITH_FOOTER_CLASS, SettingsCardFooter} from "@/components/settings/SettingsCardFooter";
import {PROFILE_FIELD_LABELS} from "@/lib/settings-constants";
import {withPending} from "@/lib/async-utils";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";

type NameSaveOutcome = "saved" | "rejected" | "failed";

async function loadProfile(): Promise<UserProfile | null> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME);
        return res.ok ? await res.json() : null;
    } catch (error) {
        logger.error("Failed to load profile", error);
        return null;
    }
}

async function saveProfileName(name: string): Promise<NameSaveOutcome> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME_NAME, {method: "PUT", body: JSON.stringify({name})});
        return res.ok ? "saved" : "rejected";
    } catch (error) {
        logger.error("Error updating name", error);
        return "failed";
    }
}

export function ProfileCard() {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);

    const [name, setName] = useState(user?.name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [isSaving, setIsSaving] = useState(false);

    useOnValueChange(user, (nextUser) => {
        if (!nextUser) return;
        setName(nextUser.name || "");
        setEmail(nextUser.email || "");
    });

    const handleSaveName = async () => {
        await withPending(setIsSaving, async () => {
            const outcome = await saveProfileName(name);
            if (outcome === "rejected") {
                toast.error("Failed to update profile");
                return;
            }
            if (outcome === "failed") {
                toast.error("An unexpected error occurred while updating profile");
                return;
            }
            const profile = await loadProfile();
            if (profile) setUser(profile);
            toast.success("Profile updated successfully");
        });
    };

    if (!user) {
        return <ProfileCardSkeleton/>;
    }

    return (
        <Card className={SETTINGS_CARD_WITH_FOOTER_CLASS}>
            <CardContent className="flex flex-col gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8 shrink-0 border-[0.5px] border-border bg-muted">
                        <AvatarImage src={user.pictureUrl || undefined} alt="" referrerPolicy="no-referrer" className="object-cover"/>
                        <AvatarFallback className="bg-transparent text-muted-foreground">
                            <User className="size-4" aria-hidden="true"/>
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground" title={name || email}>{name || email}</p>
                        <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
                    </div>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <label htmlFor="email" className={PROFILE_LABEL_CLASS}>
                        {PROFILE_FIELD_LABELS.EMAIL}
                    </label>
                    <Input id="email" value={email} disabled className="bg-muted cursor-not-allowed"/>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <label htmlFor="name" className={PROFILE_LABEL_CLASS}>
                        {PROFILE_FIELD_LABELS.NAME}
                    </label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>
            </CardContent>
            <SettingsCardFooter>
                <Button onClick={handleSaveName} disabled={isSaving || !name?.trim()}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </SettingsCardFooter>
        </Card>
    );
}
