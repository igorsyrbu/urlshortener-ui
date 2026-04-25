"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {GlowingEffect} from "@/components/ui/glowing-effect";
import {Loader2, Wand2} from "lucide-react";
import type {GlowState} from "@/components/links/create-link-types";

interface CreateLinkTitleFieldProps {
    inputId: string;
    value: string;
    glowState: GlowState;
    isLoadingTitle: boolean;
    canSuggestTitle: boolean;
    onChange: (value: string) => void;
    onSuggestTitle: () => void;
}

export function CreateLinkTitleField({
                                         inputId,
                                         value,
                                         glowState,
                                         isLoadingTitle,
                                         canSuggestTitle,
                                         onChange,
                                         onSuggestTitle,
                                     }: CreateLinkTitleFieldProps) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center gap-1.5">
                <label htmlFor={inputId} className="text-sm font-medium">
                    Title
                </label>
                <div className="relative">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                        onClick={onSuggestTitle}
                        disabled={!canSuggestTitle || isLoadingTitle}
                    >
                        {isLoadingTitle ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        ) : (
                            <Wand2 className="h-3.5 w-3.5" strokeWidth={1.5}/>
                        )}
                    </Button>
                </div>
            </div>
            <div className="relative rounded-md">
                <GlowingEffect spread={180} glow={glowState !== "idle"} autoRotate borderWidth={2}/>
                <Input
                    id={inputId}
                    placeholder="e.g. Marketing Campaign Q4"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="relative col-span-3"
                />
            </div>
        </div>
    );
}
