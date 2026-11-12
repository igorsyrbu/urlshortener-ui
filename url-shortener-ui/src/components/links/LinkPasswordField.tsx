"use client";

import {useId, useState} from "react";
import {Info} from "lucide-react";
import {Tooltip as TooltipPrimitive} from "radix-ui";
import {LinkPasswordInput} from "@/components/links/LinkPasswordInput";
import {FieldError} from "@/components/ui/field-error";
import {Switch} from "@/components/ui/switch";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {FOCUS_RING_CLASS, INFO_TOOLTIP_CONTENT_CLASS, LINK_PASSWORD_COPY} from "@/lib/constants";

interface LinkPasswordFieldProps {
    inputId: string;
    isEnabled: boolean;
    password: string;
    error: string | null;
    onEnabledChange: (isEnabled: boolean) => void;
    onPasswordChange: (password: string) => void;
    /** Desktop dialog: the small switch used in every desktop menu and dialog. */
    isCompact: boolean;
}

/** The "Password" switch row of the link form; the password box appears under it while the switch is on. */
export function LinkPasswordField({inputId, isEnabled, password, error, onEnabledChange, onPasswordChange, isCompact}: LinkPasswordFieldProps) {
    const switchId = useId();
    const nameId = useId();
    const hintId = useId();
    const errorId = `${inputId}-error`;
    const [isHintOpen, setIsHintOpen] = useState(false);

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                    {/* The info button stays outside the label, because a label may not contain another control. */}
                    <label htmlFor={switchId} className="text-sm font-medium">{LINK_PASSWORD_COPY.FIELD_LABEL}</label>
                    <Tooltip open={isHintOpen} onOpenChange={setIsHintOpen}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={LINK_PASSWORD_COPY.HINT_BUTTON}
                                onClick={() => setIsHintOpen(!isHintOpen)}
                                onBlur={() => setIsHintOpen(false)}
                                className={`inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground outline-none ${FOCUS_RING_CLASS}`}
                            >
                                <Info className="size-3.5"/>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            sideOffset={8}
                            className={INFO_TOOLTIP_CONTENT_CLASS}
                            onPointerDownOutside={() => setIsHintOpen(false)}
                        >
                            {LINK_PASSWORD_COPY.TOGGLE_HINT}
                            <TooltipPrimitive.Arrow className="fill-foreground" width={10} height={5}/>
                        </TooltipContent>
                    </Tooltip>
                    <span id={nameId} className="sr-only">{LINK_PASSWORD_COPY.TOGGLE_LABEL}</span>
                    <span id={hintId} className="sr-only">{LINK_PASSWORD_COPY.TOGGLE_HINT}</span>
                </span>
                {/* mr-1 lines the switch up with the short-link row's shuffle icon, which sits inside its button's padding. */}
                <Switch
                    id={switchId}
                    className="mr-1"
                    aria-labelledby={nameId}
                    aria-describedby={hintId}
                    checked={isEnabled}
                    onCheckedChange={onEnabledChange}
                    size={isCompact ? "sm" : "default"}
                />
            </div>
            {isEnabled ? (
                <>
                    <label htmlFor={inputId} className="sr-only">{LINK_PASSWORD_COPY.INPUT_LABEL}</label>
                    <LinkPasswordInput
                        inputId={inputId}
                        value={password}
                        onChange={onPasswordChange}
                        hasError={error !== null}
                        errorId={errorId}
                        canGenerate
                    />
                </>
            ) : null}
            {error ? <FieldError id={errorId} className="-mt-1 text-xs">{error}</FieldError> : null}
        </div>
    );
}
