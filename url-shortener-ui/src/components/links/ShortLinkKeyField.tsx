"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Loader2, Shuffle} from "lucide-react";
import {MOCKED_SHORT_DOMAIN} from "@/lib/constants";
import {cn} from "@/lib/utils";

interface ShortLinkKeyFieldProps {
    inputId: string;
    value: string;
    error: string | null;
    isLoading: boolean;
    onChange: (value: string) => void;
    onRandomize: () => void;
    onBlur?: () => void;
}

export function ShortLinkKeyField({
                                      inputId,
                                      value,
                                      error,
                                      isLoading,
                                      onChange,
                                      onRandomize,
                                      onBlur,
                                  }: ShortLinkKeyFieldProps) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <label htmlFor={inputId} className="text-sm font-medium">
                    Short Link
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                    onClick={onRandomize}
                    disabled={isLoading}
                    title="Generate a random short link"
                >
                    {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                    ) : (
                        <Shuffle className="h-3.5 w-3.5" strokeWidth={1.5}/>
                    )}
                </Button>
            </div>
            <div
                className={cn(
                    "flex items-stretch overflow-hidden rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                    error && "border-destructive focus-within:border-destructive",
                )}
            >
                <span
                    className="flex shrink-0 items-center border-r border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                    {MOCKED_SHORT_DOMAIN}
                </span>
                <Input
                    id={inputId}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className="min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                />
            </div>
            {error ? <p className="-mt-1 text-xs text-destructive">{error}</p> : null}
        </div>
    );
}
