import type {ReactNode} from "react";
import {PageContainer} from "@/components/layout/PageContainer";
import {SettingsTabs} from "@/components/settings/SettingsTabs";

interface SettingsLayoutProps {
    children: ReactNode;
}

export default function SettingsLayout({children}: SettingsLayoutProps) {
    return (
        <PageContainer>
            <SettingsTabs/>
            {children}
        </PageContainer>
    );
}
