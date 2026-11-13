"use client";

import {useId, useState, type ReactNode, type TransitionEvent} from "react";
import {Info} from "lucide-react";
import {Tooltip as TooltipPrimitive} from "radix-ui";
import {LinkPasswordInput} from "@/components/links/LinkPasswordInput";
import {FieldError} from "@/components/ui/field-error";
import {Skeleton} from "@/components/ui/skeleton";
import {Switch} from "@/components/ui/switch";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {FOCUS_RING_CLASS, INFO_TOOLTIP_CONTENT_CLASS, LINK_PASSWORD_COPY} from "@/lib/constants";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import {cn} from "@/lib/utils";

interface LinkPasswordFieldProps {
    inputId: string;
    isEnabled: boolean;
    password: string;
    error: string | null;
    onEnabledChange: (isEnabled: boolean) => void;
    onPasswordChange: (password: string) => void;
    /** Desktop dialog: the small switch used in every desktop menu and dialog. */
    isCompact: boolean;
    /** The password is still loading: a placeholder holds the box's place and the switch waits. */
    isLoading?: boolean;
}

interface PasswordBoxSlotProps {
    isOpen: boolean;
    children: ReactNode;
}

/**
 * Opens to the height of its children and closes to nothing, so turning the switch on or off moves the form down
 * or up smoothly instead of jumping. The children are unmounted once it has closed, which keeps a hidden password
 * box out of the tab order and away from password managers. The padding (cancelled by the negative margins) is
 * room for the input's focus ring, which `overflow-hidden` would clip; `-mt-2` takes back the parent's grid gap.
 */
function PasswordBoxSlot({isOpen, children}: PasswordBoxSlotProps) {
    const [isMounted, setIsMounted] = useState(isOpen);
    useOnValueChange(isOpen, (isNowOpen) => {
        if (isNowOpen) setIsMounted(true);
    });

    const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !isOpen) setIsMounted(false);
    };

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className={cn(
                "grid transition-[grid-template-rows,margin-top,opacity] duration-200 ease-out",
                isOpen ? "mt-0 grid-rows-[1fr] opacity-100" : "-mt-2 grid-rows-[0fr] opacity-0",
            )}
        >
            <div className="-m-1 min-h-0 overflow-hidden p-1">{isMounted ? children : null}</div>
        </div>
    );
}

/** The "Password" switch row of the link form; the password box opens under it while the switch is on. */
export function LinkPasswordField({inputId, isEnabled, password, error, onEnabledChange, onPasswordChange, isCompact, isLoading = false}: LinkPasswordFieldProps) {
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
                    disabled={isLoading}
                    onCheckedChange={onEnabledChange}
                    size={isCompact ? "sm" : "default"}
                />
            </div>
            <PasswordBoxSlot isOpen={isEnabled}>
                {isLoading ? (
                    <div role="status">
                        <span className="sr-only">{LINK_PASSWORD_COPY.LOADING}</span>
                        <Skeleton className="h-9 w-full rounded-md"/>
                    </div>
                ) : (
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
                )}
            </PasswordBoxSlot>
            {error ? <FieldError id={errorId} className="-mt-1 text-xs">{error}</FieldError> : null}
        </div>
    );
}
