"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {ImportCsvContent} from "@/components/links/ImportCsvContent";
import {IMPORT_MODAL_SR_DESCRIPTION, IMPORT_MODAL_TITLE} from "@/components/links/import-export-constants";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useLinkImport, IMPORT_SESSION_STATE} from "@/lib/hooks/useLinkImport";

interface ImportCsvModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportCsvModalState {
    file: File | null;
    setFile: (file: File | null) => void;
    generateTakenKeys: boolean;
    setGenerateTakenKeys: (value: boolean) => void;
    transfer: ReturnType<typeof useLinkImport>;
    handleReset: () => void;
    handleOpenChange: (open: boolean) => void;
    handleImport: () => void;
    handleClose: () => void;
}

function useImportCsvModal({onOpenChange}: ImportCsvModalProps): ImportCsvModalState {
    const [file, setFile] = useState<File | null>(null);
    const [generateTakenKeys, setGenerateTakenKeys] = useState(false);
    const transfer = useLinkImport();
    const handleReset = (): void => {
        transfer.handleReset();
        setFile(null);
        setGenerateTakenKeys(false);
    };
    const handleOpenChange = (nextOpen: boolean): void => {
        if (transfer.isUploading) return;
        if (!nextOpen && (!transfer.session || transfer.session.state === IMPORT_SESSION_STATE.COMPLETED)) handleReset();
        onOpenChange(nextOpen);
    };
    const handleImport = (): void => {
        if (file) void transfer.handleImport(file, generateTakenKeys);
    };
    const handleClose = (): void => { handleOpenChange(false); };
    return {file, setFile, generateTakenKeys, setGenerateTakenKeys, transfer, handleReset, handleOpenChange, handleImport, handleClose};
}

export function ImportCsvModal(props: ImportCsvModalProps) {
    const isDesktop = useIsDesktop();
    const modal = useImportCsvModal(props);
    const content = props.open && <ImportCsvContent file={modal.file} onFileChange={modal.setFile}
        generateTakenKeys={modal.generateTakenKeys} onGenerateTakenKeysChange={modal.setGenerateTakenKeys}
        session={modal.transfer.session} isUploading={modal.transfer.isUploading} isDesktop={isDesktop}
        onImport={modal.handleImport} onClose={modal.handleClose} onImportMore={modal.handleReset}
        onRefreshLinks={modal.transfer.handleRefreshLinks}/>;

    if (isDesktop) {
        return <Dialog open={props.open} onOpenChange={modal.handleOpenChange}>
            <DialogContent className="border-border transition-none sm:max-w-lg" showCloseButton={!modal.transfer.isUploading}
                onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogTitle className="sr-only">{IMPORT_MODAL_TITLE}</DialogTitle>
                <DialogDescription className="sr-only">{IMPORT_MODAL_SR_DESCRIPTION}</DialogDescription>
                {content}
            </DialogContent>
        </Dialog>;
    }
    return <Drawer open={props.open} onOpenChange={modal.handleOpenChange} dismissible={!modal.transfer.isUploading}>
        <DrawerContent className="min-w-0 outline-hidden px-6 gap-4">
            <DrawerTitle className="sr-only">{IMPORT_MODAL_TITLE}</DrawerTitle>
            <DrawerDescription className="sr-only">{IMPORT_MODAL_SR_DESCRIPTION}</DrawerDescription>
            {content}
        </DrawerContent>
    </Drawer>;
}
