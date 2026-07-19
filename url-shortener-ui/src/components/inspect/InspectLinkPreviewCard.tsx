import {LinkFavicon} from "@/components/links/LinkFavicon";
import {OgImage} from "@/components/inspect/OgImage";
import {Card, CardContent} from "@/components/ui/card";

interface InspectLinkPreviewCardProps {
    title: string;
    description?: string | null;
    ogImageUrl?: string | null;
    longUrl: string;
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export function InspectLinkPreviewCard({
                                           title,
                                           description,
                                           ogImageUrl,
                                           longUrl,
                                       }: InspectLinkPreviewCardProps) {
    return (
        <Card className="overflow-hidden p-0 gap-0">
            <OgImage src={ogImageUrl} alt={title}/>
            <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center gap-2">
                    <span className="size-5 shrink-0 overflow-hidden rounded-full">
                        <LinkFavicon longUrl={longUrl}/>
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                        {getDomain(longUrl)}
                    </span>
                </div>
                <h2 className="text-base font-semibold truncate" title={title}>
                    {title}
                </h2>
                {description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
