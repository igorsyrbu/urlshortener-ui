"use client";

import {useEffect, useRef, useState} from "react";
import {MotionConfig, motion, useMotionValue, useSpring} from "framer-motion";
import {CloudUpload, FileText, X} from "lucide-react";
import {cn} from "@/lib/utils";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useCoalescedCallback} from "@/lib/hooks/useCoalescedCallback";
import {
    CSV_ACCEPT,
    DROPZONE_ARIA_LABEL,
    DROPZONE_HINT,
    DROPZONE_HINT_ACTIVE,
} from "@/components/links/import-export-constants";

interface ImportCsvDropzoneProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    disabled?: boolean;
}

function getDroppedFile(event: React.DragEvent<HTMLLabelElement>): File | null {
    if (event.dataTransfer.files.length === 0) {
        return null;
    }
    return event.dataTransfer.files[0] ?? null;
}

const MAGNET_FACTOR = 0.02;
const MAGNET_MAX_PULL_PX = 4;

interface MagnetPull {
    x: number;
    y: number;
}

interface DragPointer {
    clientX: number;
    clientY: number;
}

function clampPullMagnitude(dx: number, dy: number): MagnetPull {
    const magnitude = Math.hypot(dx, dy);
    if (magnitude <= MAGNET_MAX_PULL_PX || magnitude === 0) {
        return {x: dx, y: dy};
    }
    const scale = MAGNET_MAX_PULL_PX / magnitude;
    return {x: dx * scale, y: dy * scale};
}

const NO_PULL: MagnetPull = {x: 0, y: 0};

function isInsideRect(pointer: DragPointer, rect: DOMRect): boolean {
    return pointer.clientX >= rect.left && pointer.clientX <= rect.right
        && pointer.clientY >= rect.top && pointer.clientY <= rect.bottom;
}

/** A small pull toward the pointer while a file is dragged outside the dropzone; none once it is over it. */
function getMagnetPull(pointer: DragPointer, rect: DOMRect): MagnetPull {
    if (isInsideRect(pointer, rect)) return NO_PULL;
    return clampPullMagnitude(
        (pointer.clientX - (rect.left + rect.width / 2)) * MAGNET_FACTOR,
        (pointer.clientY - (rect.top + rect.height / 2)) * MAGNET_FACTOR,
    );
}

function isFileDrag(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes("Files") ?? false;
}

export function ImportCsvDropzone({file, onFileChange, disabled = false}: ImportCsvDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isDesktop = useIsDesktop();
    const magnetX = useMotionValue(0);
    const magnetY = useMotionValue(0);
    const springX = useSpring(magnetX, {stiffness: 300, damping: 20});
    const springY = useSpring(magnetY, {stiffness: 300, damping: 20});

    // dragover fires about every 50 ms; one layout read and one magnet update per frame is enough.
    const applyMagnet = (pointer: DragPointer | null): void => {
        const rect = pointer ? labelRef.current?.getBoundingClientRect() : undefined;
        const pull = pointer && rect ? getMagnetPull(pointer, rect) : NO_PULL;
        magnetX.set(pull.x);
        magnetY.set(pull.y);
    };
    const {schedule: scheduleMagnet} = useCoalescedCallback(applyMagnet);

    useEffect(() => {
        if (!isDesktop) {
            return;
        }
        const resetMagnet = (): void => scheduleMagnet(null);
        const handleWindowDragOver = (event: DragEvent): void => {
            if (disabled || !isFileDrag(event)) {
                return;
            }
            scheduleMagnet({clientX: event.clientX, clientY: event.clientY});
        };
        const handleWindowDragLeave = (event: DragEvent): void => {
            if (event.relatedTarget === null) {
                resetMagnet();
            }
        };
        window.addEventListener("dragover", handleWindowDragOver);
        window.addEventListener("drop", resetMagnet);
        window.addEventListener("dragleave", handleWindowDragLeave);
        window.addEventListener("dragend", resetMagnet);
        return () => {
            window.removeEventListener("dragover", handleWindowDragOver);
            window.removeEventListener("drop", resetMagnet);
            window.removeEventListener("dragleave", handleWindowDragLeave);
            window.removeEventListener("dragend", resetMagnet);
        };
    }, [isDesktop, disabled, scheduleMagnet]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const selected = event.target.files?.[0];
        if (!selected) {
            return;
        }
        onFileChange(selected);
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>): void => {
        if (disabled) {
            return;
        }
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (): void => {
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>): void => {
        if (disabled) {
            return;
        }
        event.preventDefault();
        setIsDragging(false);
        const dropped = getDroppedFile(event);
        if (!dropped) {
            return;
        }
        onFileChange(dropped);
    };

    const handleClear = (event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        onFileChange(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    return (
        <MotionConfig reducedMotion="user">
        <motion.label
            ref={labelRef}
            aria-label={DROPZONE_ARIA_LABEL}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{scale: isDragging ? 1.02 : 1}}
            transition={{type: "spring", stiffness: 400, damping: 25}}
            className={cn(
                "flex min-h-32 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-6 py-8 text-center transition-colors",
                "focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-background",
                isDragging && "border-primary bg-accent",
                disabled && "cursor-not-allowed opacity-50",
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={CSV_ACCEPT}
                disabled={disabled}
                onChange={handleFileChange}
                className="sr-only"
            />
            {file ? (
                <span className="flex w-full min-w-0 items-center gap-2 text-sm text-foreground">
                    <FileText className="size-4 shrink-0 text-muted-foreground"/>
                    <span className="min-w-0 flex-1 truncate text-left" title={file.name}>{file.name}</span>
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Remove selected file"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X className="size-4"/>
                    </button>
                </span>
            ) : (
                <>
                    <motion.span
                        animate={{y: isDragging ? -4 : 0, scale: isDragging ? 1.15 : 1}}
                        transition={{type: "spring", stiffness: 400, damping: 25}}
                        className="flex"
                        aria-hidden="true"
                    >
                        <motion.span style={{x: springX, y: springY}} className="flex">
                            <CloudUpload
                                className={cn(
                                    "size-6 transition-colors",
                                    isDragging ? "text-primary" : "text-muted-foreground",
                                )}
                            />
                        </motion.span>
                    </motion.span>
                    <motion.span
                        key={isDragging ? "active" : "idle"}
                        initial={{opacity: 0.4}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.15}}
                        className="text-sm text-muted-foreground"
                    >
                        {isDragging ? DROPZONE_HINT_ACTIVE : DROPZONE_HINT}
                    </motion.span>
                </>
            )}
        </motion.label>
        </MotionConfig>
    );
}
