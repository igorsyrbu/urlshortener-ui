"use client";

import {useState} from "react";
import {SETTINGS_SECTION_LIST_CLASS, SettingsSection} from "@/components/settings/SettingsSection";
import {ProfileCard} from "@/components/settings/ProfileCard";
import {AppearanceCard} from "@/components/settings/AppearanceCard";
import {ThemeCard} from "@/components/settings/ThemeCard";
import {PreferencesCard} from "@/components/settings/PreferencesCard";
import {ShortcutsCard} from "@/components/settings/ShortcutsCard";
import {SessionsSection} from "@/components/settings/SessionsSection";
import {DangerZoneCard} from "@/components/settings/DangerZoneCard";
import {SETTINGS_SECTION_COPY} from "@/lib/settings-constants";

export default function GeneralSettingsPage() {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    return (
        <div className={SETTINGS_SECTION_LIST_CLASS}>
            <SettingsSection {...SETTINGS_SECTION_COPY.PROFILE}>
                <ProfileCard/>
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.APPEARANCE}>
                <AppearanceCard/>
                <ThemeCard/>
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.PREFERENCES}>
                <PreferencesCard/>
                <div className="hidden sm:block">
                    <ShortcutsCard/>
                </div>
            </SettingsSection>

            <SessionsSection/>

            <SettingsSection {...SETTINGS_SECTION_COPY.DANGER_ZONE} isDestructive>
                <DangerZoneCard
                    isDeleteDialogOpen={isDeleteDialogOpen}
                    onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
                    onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
                    onConfirmDelete={() => setIsDeleteDialogOpen(false)}
                />
            </SettingsSection>
        </div>
    );
}
