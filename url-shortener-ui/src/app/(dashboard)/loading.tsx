import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="flex h-full w-full min-h-[50vh] flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin flex-shrink-0 text-primary" />
        </div>
    );
}
