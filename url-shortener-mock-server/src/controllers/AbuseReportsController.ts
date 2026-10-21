import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { sendProblem } from "../problem";

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
    static submitReport(req: Request, res: Response): void {
        const { shortUrl, reason, reporterEmail, description } = req.body;

        if (!shortUrl) {
            sendProblem(res, 422, "shortUrl is required");
            return;
        }

        if (!reason || !ALLOWED_REASONS.includes(reason)) {
            sendProblem(res, 422, "valid reason is required");
            return;
        }

        if (description && description.length > 2000) {
            sendProblem(res, 422, "description must not exceed 2000 characters");
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
