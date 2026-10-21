import express from "express";
import type { AppContext } from "./app-context";
import type { MockConfig } from "./config";
import { cors } from "./middleware/cors";
import { createDelay } from "./middleware/delay";
import { errorSimulation } from "./middleware/errorSimulation";
import { jsonErrors } from "./middleware/jsonErrors";
import { createBillingTrace } from "./middleware/billingTrace";
import { BillingRateLimiter } from "./middleware/billingRateLimit";
import abuseRoutes from "./routes/abuse";
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import billingRoutes from "./routes/billing";
import shortLinksRoutes from "./routes/shortlinks";
import tagsRoutes from "./routes/tags";
import usersRoutes from "./routes/users";
import { BillingService } from "./services/BillingService";

const CSV_BODY_LIMIT = "100kb";

export interface AppOptions {
  config: MockConfig;
  /** Tests pass a service they hold, to seed scenarios or drive its clock. */
  billing?: BillingService;
  /** Tests pass a limiter with a fake clock to cross window boundaries. */
  billingRateLimiter?: BillingRateLimiter;
}

/** The one place that wires middleware and routes; `index.ts` and the tests both build the app here. */
export function createApp({
  config,
  billing = new BillingService(Date.now, config.billing),
  billingRateLimiter = new BillingRateLimiter(),
}: AppOptions): express.Express {
  const app = express();
  const context: AppContext = { config, billing, billingRateLimiter, magicLinkCooldowns: new Map() };
  app.locals.context = context;

  app.use(cors);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/csv", limit: CSV_BODY_LIMIT }));
  app.use(createDelay(config.delayMs));
  app.use(errorSimulation);
  app.use("/billing", createBillingTrace(config.billing.trace));

  app.use(authRoutes);
  app.use(usersRoutes);
  app.use(shortLinksRoutes);
  app.use(analyticsRoutes);
  app.use(tagsRoutes);
  app.use(abuseRoutes);
  app.use(billingRoutes);
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(jsonErrors);
  return app;
}
