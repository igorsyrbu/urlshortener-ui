import {useId, type ReactNode} from "react";
import {ArrowRight, Link2, TableProperties} from "lucide-react";
import {ImportCsvDropzone} from "@/components/links/ImportCsvDropzone";
import {Switch} from "@/components/ui/switch";
import {cn} from "@/lib/utils";
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

interface GenerateKeysOptionProps {
    isChecked: boolean;
    isDisabled: boolean;
    isCompact: boolean;
    onChange: (isChecked: boolean) => void;
}

/** The whole row is the switch's label, so a click anywhere toggles it; the title names it, the hint describes it. */
function GenerateKeysOption({isChecked, isDisabled, isCompact, onChange}: GenerateKeysOptionProps) {
    const switchId = useId();
    const titleId = useId();
    const hintId = useId();
    return <label htmlFor={switchId}
        className={cn("flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors select-none",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted/50")}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span id={titleId} className="text-sm font-medium text-foreground">{GENERATE_TAKEN_KEYS_LABEL}</span>
            <span id={hintId} className="text-xs text-muted-foreground">{GENERATE_TAKEN_KEYS_HINT}</span>
        </span>
        <Switch id={switchId} aria-labelledby={titleId} aria-describedby={hintId} checked={isChecked}
            onCheckedChange={onChange} disabled={isDisabled} size={isCompact ? "sm" : "default"}/>
    </label>;
}

export function ImportCsvIdleBody(props: ImportCsvIdleBodyProps) {
    return <div className="flex min-w-0 flex-col gap-4">
        {renderImportHeader()}
        <ImportCsvDropzone file={props.file} onFileChange={props.onFileChange} disabled={props.isUploading}/>
        <GenerateKeysOption isChecked={props.generateTakenKeys} isDisabled={props.isUploading}
            isCompact={props.compactSwitch} onChange={props.onGenerateTakenKeysChange}/>
    </div>;
}
