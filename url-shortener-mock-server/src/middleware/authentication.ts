import { Request, Response, NextFunction } from "express";

export function authentication(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Authorization header." });
        return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        res.status(401).json({ error: "Unauthorized", message: "Bearer token is empty." });
        return;
    }

    next();
}
