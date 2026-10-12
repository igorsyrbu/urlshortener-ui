import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {DialogFooter} from "@/components/ui/dialog";
import {DrawerFooter} from "@/components/ui/drawer";
import {ImportCsvIdleBody} from "@/components/links/ImportCsvIdleBody";
import {ImportProgressBody} from "@/components/links/ImportProgressBody";
import {IMPORT_SESSION_STATE, type ImportSession} from "@/lib/hooks/useLinkImport";
import {
    CANCEL_LABEL, CLOSE_LABEL, DONE_LABEL, IMPORTING_LABEL, IMPORT_LABEL,
    IMPORT_MORE_LABEL, REFRESH_LINKS_LABEL,
} from "@/components/links/import-export-constants";

interface ImportCsvContentProps {
    file: File | null;
    generateTakenKeys: boolean;
    isUploading: boolean;
    isDesktop: boolean;
    session: ImportSession | null;
    onFileChange: (file: File | null) => void;
    onGenerateTakenKeysChange: (value: boolean) => void;
    onImport: () => void;
    onClose: () => void;
    onImportMore: () => void;
    onRefreshLinks: () => void;
}

function renderFooterButtons(props: ImportCsvContentProps): React.ReactNode {
    if (!props.session) {
        return <>
            <Button variant="ghost" onClick={props.onClose} disabled={props.isUploading}>{CANCEL_LABEL}</Button>
            <Button onClick={props.onImport} disabled={!props.file || props.isUploading}>
                {props.isUploading && <ButtonSpinner/>}{props.isUploading ? IMPORTING_LABEL : IMPORT_LABEL}
            </Button>
        </>;
    }
    const isCompleted = props.session.state === IMPORT_SESSION_STATE.COMPLETED;
    const isInterrupted = props.session.state === IMPORT_SESSION_STATE.INTERRUPTED;
    return <>
        {isCompleted && <Button variant="ghost" onClick={props.onImportMore}>{IMPORT_MORE_LABEL}</Button>}
        {isInterrupted && <Button variant="ghost" onClick={props.onRefreshLinks}>{REFRESH_LINKS_LABEL}</Button>}
        <Button onClick={props.onClose}>{isCompleted ? DONE_LABEL : CLOSE_LABEL}</Button>
    </>;
}

export function ImportCsvContent(props: ImportCsvContentProps) {
    const Footer = props.isDesktop ? DialogFooter : DrawerFooter;
    return <>
        {props.session ? <ImportProgressBody session={props.session}/> :
            <ImportCsvIdleBody file={props.file} onFileChange={props.onFileChange} isUploading={props.isUploading}
                generateTakenKeys={props.generateTakenKeys} onGenerateTakenKeysChange={props.onGenerateTakenKeysChange}
                compactSwitch={props.isDesktop}/>}
        <Footer className={props.isDesktop ? undefined : "p-0 mt-4 flex flex-col gap-2 [&>button]:w-full"}>
            {renderFooterButtons(props)}
        </Footer>
    </>;
}
