"use client";

import {useState} from "react";
import {Eye, EyeOff, Shuffle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {LINK_PASSWORD_COPY, LINK_PASSWORD_MAX_LENGTH} from "@/lib/constants";
import {generateLinkPassword} from "@/lib/link-password";
import {cn} from "@/lib/utils";

interface LinkPasswordInputProps {
    inputId: string;
    value: string;
    onChange: (value: string) => void;
    hasError: boolean;
    errorId: string;
    disabled?: boolean;
    /** `new-password` for the owner's form, `current-password` for a visitor typing one in. */
    autoComplete?: "new-password" | "current-password";
    /** Adds a button that fills in a random password and shows it (the owner's form only). */
    canGenerate?: boolean;
    className?: string;
}

const ICON_BUTTON_CLASS = "text-muted-foreground hover:bg-primary/10 hover:text-primary";

/** A password box that hides its value until the eye button is pressed. */
export function LinkPasswordInput({
                                      inputId,
                                      value,
                                      onChange,
                                      hasError,
                                      errorId,
                                      disabled = false,
                                      autoComplete = "new-password",
                                      canGenerate = false,
                                      className,
                                  }: LinkPasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    const handleGenerate = () => {
        onChange(generateLinkPassword());
        setIsVisible(true);
    };

    return (
        <div className={cn("relative", className)}>
            <Input
                id={inputId}
                type={isVisible ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={LINK_PASSWORD_COPY.INPUT_PLACEHOLDER}
                maxLength={LINK_PASSWORD_MAX_LENGTH}
                autoComplete={autoComplete}
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={canGenerate ? "pr-18" : "pr-10"}
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={isVisible ? LINK_PASSWORD_COPY.HIDE : LINK_PASSWORD_COPY.SHOW}
                    aria-pressed={isVisible}
                    onClick={() => setIsVisible(!isVisible)}
                    className={ICON_BUTTON_CLASS}
                >
                    {isVisible ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}
                </Button>
                {canGenerate ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled}
                        aria-label={LINK_PASSWORD_COPY.GENERATE}
                        title={LINK_PASSWORD_COPY.GENERATE}
                        onClick={handleGenerate}
                        className={ICON_BUTTON_CLASS}
                    >
                        <Shuffle className="size-3.5" strokeWidth={1.5}/>
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
