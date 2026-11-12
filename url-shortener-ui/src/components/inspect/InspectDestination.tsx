import {InspectLinkPreviewCard} from "@/components/inspect/InspectLinkPreviewCard";
import {Card, CardContent} from "@/components/ui/card";

interface InspectDestinationProps {
    title: string;
    description?: string | null;
    ogImageUrl?: string | null;
    longUrl: string;
}

/** Where an unprotected link leads: its preview card and the full destination URL. */
export function InspectDestination({title, description, ogImageUrl, longUrl}: InspectDestinationProps) {
    return (
        <>
            <InspectLinkPreviewCard title={title} description={description} ogImageUrl={ogImageUrl} longUrl={longUrl}/>
            <Card>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Destination URL
                        </span>
                        <div
                            className="w-full overflow-y-auto rounded-md bg-transparent py-2 text-sm text-muted-foreground break-all cursor-text max-h-[4.75rem]">
                            {longUrl}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
