import { Request, Response } from "express";
import { randomUUID } from "crypto";

const ALLOWED_REASONS = [
    "SPAM_OR_MISLEADING",
    "PHISHING_OR_MALWARE",
    "HARASSMENT_OR_THREATS",
    "ILLEGAL_CONTENT",
    "COPYRIGHT_OR_TRADEMARK",
    "IMPERSONATION",
    "OTHER",
] as const;

export class AbuseReportsController {
    static async submitReport(req: Request, res: Response): Promise<void> {
        const { shortUrl, reason, reporterEmail, description } = req.body;

        if (!shortUrl) {
            res.status(422).json({ error: "shortUrl is required" });
            return;
        }

        if (!reason || !ALLOWED_REASONS.includes(reason)) {
            res.status(422).json({ error: "valid reason is required" });
            return;
        }

        if (description && description.length > 2000) {
            res.status(422).json({ error: "description must not exceed 2000 characters" });
            return;
        }

        res.status(201).json({
            id: randomUUID(),
            shortUrl,
            reason,
            reporterEmail: reporterEmail || undefined,
            description: description || undefined,
            status: "RECEIVED",
        });
    }
}
