import {LayoutDashboard} from "lucide-react";
import {PageContainer} from "@/components/layout/PageContainer";

export default function DashboardPage() {
    return (
        <PageContainer>
            <div
                className="bg-card border-[0.5px] border-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <LayoutDashboard className="size-9 mb-2" />
                <p>Dashboard Content (Mock)</p>
            </div>
        </PageContainer>
    );
}
