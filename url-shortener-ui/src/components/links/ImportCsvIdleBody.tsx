import type {ReactNode} from "react";
import {ArrowRight, Link2, TableProperties} from "lucide-react";
import {ImportCsvDropzone} from "@/components/links/ImportCsvDropzone";
import {Switch} from "@/components/ui/switch";
import {GENERATE_TAKEN_KEYS_HINT, GENERATE_TAKEN_KEYS_LABEL, IMPORT_MODAL_TITLE} from "@/components/links/import-export-constants";

interface ImportCsvIdleBodyProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    isUploading: boolean;
    generateTakenKeys: boolean;
    onGenerateTakenKeysChange: (value: boolean) => void;
    compactSwitch: boolean;
}

function renderImportHeader(): ReactNode {
    return <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3" aria-hidden="true">
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30">
                <TableProperties className="size-5 text-muted-foreground"/>
            </span>
            <ArrowRight className="size-4 text-muted-foreground"/>
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Link2 className="size-5"/>
            </span>
        </div>
        <h2 className="text-lg font-semibold leading-none text-foreground">{IMPORT_MODAL_TITLE}</h2>
    </div>;
}

function renderGenerateKeysOption(props: ImportCsvIdleBodyProps): ReactNode {
    const handleToggle = (): void => {
        if (!props.isUploading) props.onGenerateTakenKeysChange(!props.generateTakenKeys);
    };
    return <div onClick={handleToggle}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors select-none hover:bg-muted/50">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">{GENERATE_TAKEN_KEYS_LABEL}</p>
            <p className="text-xs text-muted-foreground">{GENERATE_TAKEN_KEYS_HINT}</p>
        </div>
        <div className={props.isUploading ? "pointer-events-none shrink-0 opacity-50" : "shrink-0"}>
            <span onClick={(e) => e.stopPropagation()} className="flex">
                <Switch checked={props.generateTakenKeys} onCheckedChange={props.onGenerateTakenKeysChange}
                    size={props.compactSwitch ? "sm" : "default"}/>
            </span>
        </div>
    </div>;
}

export function ImportCsvIdleBody(props: ImportCsvIdleBodyProps) {
    return <div className="flex min-w-0 flex-col gap-4">
        {renderImportHeader()}
        <ImportCsvDropzone file={props.file} onFileChange={props.onFileChange} disabled={props.isUploading}/>
        {renderGenerateKeysOption(props)}
    </div>;
}
