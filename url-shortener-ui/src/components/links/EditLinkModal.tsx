"use client";

import React, {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {fetchWithAuth} from "@/lib/api";
import {LinkItem} from "@/lib/types";

interface EditLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
    onSuccess: () => void;
}

export function EditLinkModal({open, onOpenChange, link, onSuccess}: EditLinkModalProps) {
    const [longUrl, setLongUrl] = useState("");
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (link) {
            setLongUrl(link.longUrl);
            setTitle(link.title);
        }
    }, [link]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!link) return;

        setIsSubmitting(true);
        try {
            const res = await fetchWithAuth(`/shortlinks`, {
                method: "PUT",
                body: JSON.stringify({
                    id: link.id,
                    longUrl,
                    title,
                    shortUrl: link.shortUrl // Keep existing shortUrl
                })
            });

            if (res.ok) {
                onSuccess();
                onOpenChange(false);
            } else {
                console.error("Failed to update link");
            }
        } catch (e) {
            console.error("Error updating link", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border"
                           aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Edit Link</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="edit-longUrl" className="text-sm font-medium">
                            Destination URL
                        </label>
                        <Input
                            id="edit-longUrl"
                            value={longUrl}
                            onChange={(e) => setLongUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="edit-title" className="text-sm font-medium">
                            Title
                        </label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}
                                className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
