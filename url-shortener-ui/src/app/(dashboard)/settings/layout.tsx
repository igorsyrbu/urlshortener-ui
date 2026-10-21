import type {ReactNode} from "react";
import {PageContainer} from "@/components/layout/PageContainer";
import {SettingsTabs} from "@/components/settings/SettingsTabs";
import {SETTINGS_PAGE_COPY} from "@/lib/settings-constants";

interface SettingsLayoutProps {
    children: ReactNode;
}

export default function SettingsLayout({children}: SettingsLayoutProps) {
    return (
        <PageContainer className="mx-auto max-w-4xl gap-6">
            <p className="text-sm text-muted-foreground">{SETTINGS_PAGE_COPY.DESCRIPTION}</p>
            <SettingsTabs/>
            {children}
        </PageContainer>
    );
}
