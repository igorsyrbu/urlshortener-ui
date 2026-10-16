import type { NextFunction, Request, Response } from "express";

export function createBillingTrace(
  isEnabled: boolean,
  writeTrace: (line: string) => void = (line: string): void => { process.stdout.write(line); },
): (req: Request, res: Response, next: NextFunction) => void {
  return function traceBilling(req: Request, res: Response, next: NextFunction): void {
    if (isEnabled) {
      const path = req.originalUrl.split("?")[0];
      res.once("finish", () => writeTrace(`[mock billing] ${req.method} ${path} ${res.statusCode}\n`));
    }
    next();
  };
}

export const billingTrace = createBillingTrace(process.env.MOCK_BILLING_TRACE === "true");
