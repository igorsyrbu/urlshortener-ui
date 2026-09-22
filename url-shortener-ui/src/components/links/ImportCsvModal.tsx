"use client";

import {useState} from "react";
import {ArrowRight, CheckCircle2, CircleX, Link2, TableProperties} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle,} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle,} from "@/components/ui/drawer";
import {ImportCsvDropzone} from "@/components/links/ImportCsvDropzone";
import {ImportResultsCards} from "@/components/links/ImportResultsCards";
import {ImportResultsTable} from "@/components/links/ImportResultsTable";
import {Switch} from "@/components/ui/switch";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {MAX_IMPORT_DATA_ROWS} from "@/lib/constants";
import {type ImportResult, precheckCsv, TransferError, uploadLinksImport,} from "@/lib/link-transfer";
import {logger} from "@/lib/logger";
import {
    buildImportSummaryMessage,
    buildTooManyRowsMessage,
    CANCEL_LABEL,
    DONE_LABEL,
    GENERATE_TAKEN_KEYS_HINT,
    GENERATE_TAKEN_KEYS_LABEL,
    IMPORT_EMPTY_FILE_MESSAGE,
    IMPORT_FAILED_MESSAGE,
    IMPORT_LABEL,
    IMPORT_MODAL_SR_DESCRIPTION,
    IMPORT_MODAL_TITLE,
    IMPORT_MORE_LABEL,
    IMPORT_NO_FAILURES_HINT,
    IMPORT_SUCCESS_TITLE,
    IMPORTING_LABEL,
} from "@/components/links/import-export-constants";

interface ImportCsvModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportCsvIdleBodyProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    isUploading: boolean;
    generateTakenKeys: boolean;
    onGenerateTakenKeysChange: (value: boolean) => void;
    compactSwitch: boolean;
}

type ImportViewState = "idle" | "uploading" | "results";

function ImportCsvIdleBody({
                               file,
                               onFileChange,
                               isUploading,
                               generateTakenKeys,
                               onGenerateTakenKeysChange,
                               compactSwitch,
                           }: ImportCsvIdleBodyProps) {
    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-3" aria-hidden="true">
                    <span
                        className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30">
                        <TableProperties className="size-5 text-muted-foreground"/>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground"/>
                    <span
                        className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Link2 className="size-5"/>
                    </span>
                </div>
                <h2 className="text-lg font-semibold leading-none text-foreground">{IMPORT_MODAL_TITLE}</h2>
            </div>
            <ImportCsvDropzone file={file} onFileChange={onFileChange} disabled={isUploading}/>
            <div
                onClick={() => {
                    if (!isUploading) {
                        onGenerateTakenKeysChange(!generateTakenKeys);
                    }
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors select-none hover:bg-muted/50"
            >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">{GENERATE_TAKEN_KEYS_LABEL}</p>
                    <p className="text-xs text-muted-foreground">{GENERATE_TAKEN_KEYS_HINT}</p>
                </div>
                <div className={isUploading ? "pointer-events-none shrink-0 opacity-50" : "shrink-0"}>
                    <span onClick={(e) => e.stopPropagation()} className="flex">
                        <Switch checked={generateTakenKeys} onCheckedChange={onGenerateTakenKeysChange}
                                size={compactSwitch ? "sm" : "default"}/>
                    </span>
                </div>
            </div>
        </div>
    );
}

function ImportResultsBody({result, layout}: { result: ImportResult; layout: "table" | "cards" }) {
    const hasFailures = result.failed.length > 0;
    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
                {hasFailures && result.imported === 0 ? (
                    <CircleX className="size-10 text-destructive" aria-hidden="true"/>
                ) : (
                    <CheckCircle2 className="size-10 text-success" aria-hidden="true"/>
                )}
                <h2 className="text-lg font-semibold leading-none text-foreground">{IMPORT_SUCCESS_TITLE}</h2>
                <p className="text-sm text-muted-foreground">
                    {buildImportSummaryMessage(result.imported, result.failed.length)}
                    {!hasFailures && ` ${IMPORT_NO_FAILURES_HINT}`}
                </p>
            </div>
            {layout === "cards" ? (
                <ImportResultsCards failures={result.failed}/>
            ) : (
                <ImportResultsTable failures={result.failed}/>
            )}
        </div>
    );
}

export function ImportCsvModal({open, onOpenChange}: ImportCsvModalProps) {
    const isDesktop = useIsDesktop();
    const [viewState, setViewState] = useState<ImportViewState>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [generateTakenKeys, setGenerateTakenKeys] = useState(false);
    const {fetchLinks} = useLinkStore();
    const {fetchTags} = useTagStoreWithoutCount();

    const isUploading = viewState === "uploading";

    const resetState = (): void => {
        setViewState("idle");
        setFile(null);
        setResult(null);
        setGenerateTakenKeys(false);
    };

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            resetState();
        }
        onOpenChange(nextOpen);
    };

    const handleClose = (): void => {
        handleOpenChange(false);
    };

    const handleImportMore = (): void => {
        resetState();
    };

    const handleImport = async (): Promise<void> => {
        if (!file || isUploading) {
            return;
        }
        setViewState("uploading");
        try {
            const csvText = await file.text();
            const precheck = precheckCsv(csvText);
            if (precheck.status === "empty") {
                toast.error(IMPORT_EMPTY_FILE_MESSAGE);
                setViewState("idle");
                return;
            }
            if (precheck.status === "too-many-rows") {
                toast.error(buildTooManyRowsMessage(MAX_IMPORT_DATA_ROWS));
                setViewState("idle");
                return;
            }
            const importResult = await uploadLinksImport(csvText, {generateTakenKeys});
            setResult(importResult);
            setViewState("results");
            if (importResult.imported > 0) {
                fetchLinks(0);
                fetchTags();
            }
        } catch (error) {
            if (error instanceof TransferError) {
                toast.error(error.message);
            } else {
                logger.error("Error importing links from CSV", error);
                toast.error(IMPORT_FAILED_MESSAGE);
            }
            setViewState("idle");
        }
    };

    const showResults = viewState === "results" && result !== null;

    const idleFooter = isDesktop ? (
        <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
                {CANCEL_LABEL}
            </Button>
            <Button onClick={handleImport} disabled={!file || isUploading}>
                {isUploading && <ButtonSpinner/>}
                {isUploading ? IMPORTING_LABEL : IMPORT_LABEL}
            </Button>
        </DialogFooter>
    ) : (
        <DrawerFooter className="p-0 mt-4 flex flex-col gap-2">
            <Button onClick={handleImport} disabled={!file || isUploading} className="w-full">
                {isUploading && <ButtonSpinner/>}
                {isUploading ? IMPORTING_LABEL : IMPORT_LABEL}
            </Button>
            <Button variant="ghost" onClick={handleClose} disabled={isUploading} className="w-full">
                {CANCEL_LABEL}
            </Button>
        </DrawerFooter>
    );

    const resultsFooter = isDesktop ? (
        <DialogFooter>
            <Button variant="ghost" onClick={handleImportMore}>
                {IMPORT_MORE_LABEL}
            </Button>
            <Button onClick={handleClose}>
                {DONE_LABEL}
            </Button>
        </DialogFooter>
    ) : (
        <DrawerFooter className="p-0 mt-4 flex flex-col gap-2">
            <Button onClick={handleClose} className="w-full">
                {DONE_LABEL}
            </Button>
            <Button variant="ghost" onClick={handleImportMore} className="w-full">
                {IMPORT_MORE_LABEL}
            </Button>
        </DrawerFooter>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    // transition-none: the shared dialog sets duration-200, which would
                    // otherwise animate the idle/results width swap and reflow text.
                    // Open/close still animate via keyframes, unaffected by this.
                    className={showResults ? "border-border transition-none sm:max-w-2xl" : "border-border transition-none sm:max-w-lg"}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{IMPORT_MODAL_TITLE}</DialogTitle>
                    <DialogDescription className="sr-only">{IMPORT_MODAL_SR_DESCRIPTION}</DialogDescription>
                    {open ? (
                        <>
                            {showResults && result ? (
                                <ImportResultsBody result={result} layout="table"/>
                            ) : (
                                <ImportCsvIdleBody file={file} onFileChange={setFile}
                                                   isUploading={isUploading}
                                                   generateTakenKeys={generateTakenKeys}
                                                   onGenerateTakenKeysChange={setGenerateTakenKeys}
                                                   compactSwitch/>
                            )}
                            {showResults ? resultsFooter : idleFooter}
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="outline-hidden px-6 gap-4">
                <DrawerTitle className="sr-only">{IMPORT_MODAL_TITLE}</DrawerTitle>
                <DrawerDescription className="sr-only">{IMPORT_MODAL_SR_DESCRIPTION}</DrawerDescription>
                {open ? (
                    <>
                        {showResults && result ? (
                            <ImportResultsBody result={result} layout="cards"/>
                        ) : (
                            <ImportCsvIdleBody file={file} onFileChange={setFile}
                                               isUploading={isUploading}
                                               generateTakenKeys={generateTakenKeys}
                                               onGenerateTakenKeysChange={setGenerateTakenKeys}
                                               compactSwitch={false}/>
                        )}
                        {showResults ? resultsFooter : idleFooter}
                    </>
                ) : null}
            </DrawerContent>
        </Drawer>
    );
}
