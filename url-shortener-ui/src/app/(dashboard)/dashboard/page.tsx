import {LayoutDashboard} from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="-mt-6 flex w-full flex-col gap-6 pb-12">
            <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h2>
            </div>
            <div
                className="bg-background border-[0.5px] border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <LayoutDashboard className="size-9 mb-2" />
                <p>Dashboard Content (Mock)</p>
            </div>
        </div>
    );
}
