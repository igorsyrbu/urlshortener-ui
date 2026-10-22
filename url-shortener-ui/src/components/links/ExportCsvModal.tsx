"use client";

import {useId, useState} from "react";
import {useShallow} from "zustand/react/shallow";
import {FOCUS_RING_CLASS} from "@/lib/constants";
import {Download, Info} from "lucide-react";
import {toast} from "sonner";
import {Tooltip as TooltipPrimitive} from "radix-ui";
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
import {cn} from "@/lib/utils";
import {attempt, withPending} from "@/lib/async-utils";
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

function getExportFailureMessage(error: unknown): string {
    if (isRateLimitedError(error)) return EXPORT_RATE_LIMITED_MESSAGE;
    if (error instanceof TransferError) return error.message;
    logger.error("Error exporting links to CSV", error);
    return EXPORT_FAILED_MESSAGE;
}

export function ExportCsvModal({open, onOpenChange}: ExportCsvModalProps) {
    const isDesktop = useIsDesktop();
    const {showArchived, searchQuery} = useLinkStore(useShallow((s) => ({
        showArchived: s.showArchived, searchQuery: s.searchQuery,
    })));
    const [includeFilters, setIncludeFilters] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const filtersSwitchId = useId();
    const filtersTitleId = useId();
    const filtersHintId = useId();
    const filtersLabelClass = isExporting ? "cursor-not-allowed" : "cursor-pointer";

    const handleExport = async (): Promise<void> => {
        if (isExporting) {
            return;
        }
        await withPending(setIsExporting, async () => {
            const result = await attempt(() => downloadLinksExport(includeFilters, {showArchived, search: searchQuery}));
            if (!result.isSuccess) {
                toast.error(getExportFailureMessage(result.error));
                return;
            }
            toast.success(EXPORT_SUCCESS_MESSAGE);
            onOpenChange(false);
        });
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
            <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left select-none">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {/* Two labels for one switch: the title names it, the hint is a larger click target and its description.
                            The info button stays outside both, because a label may not contain another control. */}
                        <label id={filtersTitleId} htmlFor={filtersSwitchId} className={filtersLabelClass}>{INCLUDE_FILTERS_LABEL}</label>
                        <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="About applying current filters"
                                    onClick={() => setIsTooltipOpen((v) => !v)}
                                    onBlur={() => setIsTooltipOpen(false)}
                                    className={`inline-flex size-4 translate-y-px items-center justify-center rounded-full text-muted-foreground hover:text-foreground outline-none ${FOCUS_RING_CLASS}`}
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
                    <label id={filtersHintId} htmlFor={filtersSwitchId} className={cn("text-xs text-muted-foreground", filtersLabelClass)}>
                        {EXPORT_FILTERED_HINT}
                    </label>
                </div>
                <Switch id={filtersSwitchId} aria-labelledby={filtersTitleId} aria-describedby={filtersHintId}
                        checked={includeFilters} onCheckedChange={setIncludeFilters} disabled={isExporting}
                        size={isDesktop ? "sm" : "default"}/>
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
