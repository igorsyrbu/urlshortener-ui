"use client";

import {useState} from "react";
import {Download, Info} from "lucide-react";
import {toast} from "sonner";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle,} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle,} from "@/components/ui/drawer";
import {Switch} from "@/components/ui/switch";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useLinkStore} from "@/lib/store/links";
import {downloadLinksExport, isRateLimitedError, TransferError,} from "@/lib/link-transfer";
import {logger} from "@/lib/logger";
import {
    APPLY_FILTERS_TOOLTIP,
    CANCEL_LABEL,
    EXPORT_FAILED_MESSAGE,
    EXPORT_FILTERED_HINT,
    EXPORT_LABEL,
    EXPORT_MODAL_SR_DESCRIPTION,
    EXPORT_MODAL_TITLE,
    EXPORT_RATE_LIMITED_MESSAGE,
    EXPORT_SUCCESS_MESSAGE,
    EXPORTING_LABEL,
    INCLUDE_FILTERS_LABEL,
} from "@/components/links/import-export-constants";

interface ExportCsvModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ExportCsvModal({open, onOpenChange}: ExportCsvModalProps) {
    const isDesktop = useIsDesktop();
    const {showArchived, searchQuery} = useLinkStore();
    const [includeFilters, setIncludeFilters] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    const handleExport = async (): Promise<void> => {
        if (isExporting) {
            return;
        }
        setIsExporting(true);
        try {
            await downloadLinksExport(includeFilters, {showArchived, search: searchQuery});
            toast.success(EXPORT_SUCCESS_MESSAGE);
            onOpenChange(false);
        } catch (error) {
            if (isRateLimitedError(error)) {
                toast.error(EXPORT_RATE_LIMITED_MESSAGE);
            } else if (error instanceof TransferError) {
                toast.error(error.message);
            } else {
                logger.error("Error exporting links to CSV", error);
                toast.error(EXPORT_FAILED_MESSAGE);
            }
        } finally {
            setIsExporting(false);
        }
    };

    const body = (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <span
                    className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30"
                    aria-hidden="true"
                >
                    <Download className="size-5 text-muted-foreground"/>
                </span>
                <h2 className="text-lg font-semibold leading-none text-foreground">{EXPORT_MODAL_TITLE}</h2>
            </div>
            <div
                onClick={() => {
                    if (!isExporting) {
                        setIncludeFilters((v) => !v);
                    }
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors select-none hover:bg-muted/50"
            >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {INCLUDE_FILTERS_LABEL}
                        <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="About applying current filters"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsTooltipOpen((v) => !v);
                                    }}
                                    onBlur={() => setIsTooltipOpen(false)}
                                    className="inline-flex size-4 translate-y-px items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none"
                                >
                                    <Info className="size-4"/>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="max-w-64 rounded-xl bg-foreground px-4 py-3 text-sm font-normal leading-5 text-background shadow-lg border-foreground text-pretty text-left"
                                onPointerDownOutside={() => setIsTooltipOpen(false)}
                            >
                                {APPLY_FILTERS_TOOLTIP}
                                <TooltipPrimitive.Arrow className="fill-foreground" width={10} height={5}/>
                            </TooltipContent>
                        </Tooltip>
                    </p>
                    <p className="text-xs text-muted-foreground">{EXPORT_FILTERED_HINT}</p>
                </div>
                <div className={isExporting ? "pointer-events-none shrink-0 opacity-50" : "shrink-0"}>
                    <span onClick={(e) => e.stopPropagation()} className="flex">
                        <Switch checked={includeFilters} onCheckedChange={setIncludeFilters}
                                size={isDesktop ? "sm" : "default"}/>
                    </span>
                </div>
            </div>
        </div>
    );

    const footer = isDesktop ? (
        <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}>
                {CANCEL_LABEL}
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
                {isExporting && <ButtonSpinner/>}
                {isExporting ? EXPORTING_LABEL : EXPORT_LABEL}
            </Button>
        </DialogFooter>
    ) : (
        <DrawerFooter className="p-0 mt-4 flex flex-col gap-2">
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
                {isExporting && <ButtonSpinner/>}
                {isExporting ? EXPORTING_LABEL : EXPORT_LABEL}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}
                    className="w-full">
                {CANCEL_LABEL}
            </Button>
        </DrawerFooter>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="border-border sm:max-w-md"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{EXPORT_MODAL_TITLE}</DialogTitle>
                    <DialogDescription className="sr-only">{EXPORT_MODAL_SR_DESCRIPTION}</DialogDescription>
                    {open ? (
                        <>
                            {body}
                            {footer}
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 gap-4">
                <DrawerTitle className="sr-only">{EXPORT_MODAL_TITLE}</DrawerTitle>
                <DrawerDescription className="sr-only">{EXPORT_MODAL_SR_DESCRIPTION}</DrawerDescription>
                {open ? (
                    <>
                        {body}
                        {footer}
                    </>
                ) : null}
            </DrawerContent>
        </Drawer>
    );
}
