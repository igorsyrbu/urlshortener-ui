import "dotenv/config";
import express from "express";
import { cors } from "./middleware/cors";
import { delay } from "./middleware/delay";
import { errorSimulation } from "./middleware/errorSimulation";
import { cleanupService } from "./services/CleanupService";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import shortLinksRoutes from "./routes/shortlinks";
import analyticsRoutes from "./routes/analytics";
import tagsRoutes from "./routes/tags";

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const cleanupIntervalMinutes = parseInt(process.env.MOCK_CLEANUP_INTERVAL_MINUTES || "1440", 10); //24 hours
const CLEANUP_INTERVAL_MS = cleanupIntervalMinutes * 60 * 1000;

app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(delay);
app.use(errorSimulation);

app.use(authRoutes);
app.use(usersRoutes);
app.use(shortLinksRoutes);
app.use(analyticsRoutes);
app.use(tagsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  const delayMs = process.env.MOCK_DELAY || "0";
  const inactivityDays = process.env.MOCK_CLEANUP_INACTIVITY_DAYS || "7";
  console.log(`\n🚀 Mock server running at http://localhost:${PORT}`);
  console.log(`  Artificial delay: ${delayMs}ms`);
  console.log(`  Error simulation: send header "x-mock-error: true"`);
  console.log(`  Inactivity cleanup: runs every ${cleanupIntervalMinutes} min, removes data after ${inactivityDays} days of inactivity\n`);

  setInterval(() => {
    cleanupService.runCleanup();
  }, CLEANUP_INTERVAL_MS);
});
