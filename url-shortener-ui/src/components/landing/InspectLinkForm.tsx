"use client";

import {type FormEvent, useId, useState} from "react";
import {useRouter} from "next/navigation";
import {ScanSearch} from "lucide-react";
import {Button} from "@/components/ui/button";
import {FieldError} from "@/components/ui/field-error";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ROUTES} from "@/lib/constants";
import {getShortKeyValidationError, readShortKey} from "@/lib/url-utils";
import {INSPECT_FORM_COPY} from "@/components/landing/landing-copy";

/** Takes a short link (or just its key) and opens its preview on `/inspect/<key>`. */
export function InspectLinkForm() {
    const router = useRouter();
    const inputId = useId();
    const errorId = useId();
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const key = readShortKey(value);
        const validationError = key ? getShortKeyValidationError(key) : INSPECT_FORM_COPY.EMPTY;
        if (validationError) {
            setError(validationError);
            return;
        }
        router.push(ROUTES.INSPECT(key));
    };

    const handleChange = (nextValue: string) => {
        setValue(nextValue);
        setError(null);
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={inputId}>{INSPECT_FORM_COPY.LABEL}</Label>
            <div className="flex min-w-0 gap-2">
                <Input
                    id={inputId}
                    value={value}
                    onChange={(event) => handleChange(event.target.value)}
                    placeholder={INSPECT_FORM_COPY.PLACEHOLDER}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={error !== null}
                    aria-describedby={error ? errorId : undefined}
                    className="h-10 min-w-0 flex-1"
                />
                <Button type="submit" size="lg">
                    <ScanSearch className="size-4"/>
                    {INSPECT_FORM_COPY.SUBMIT}
                </Button>
            </div>
            {error
                ? <FieldError id={errorId}>{error}</FieldError>
                : <p className="text-xs text-muted-foreground">{INSPECT_FORM_COPY.HINT}</p>}
        </form>
    );
}
