import "dotenv/config";
import express from "express";
import { cors } from "./middleware/cors";
import { delay } from "./middleware/delay";
import { errorSimulation } from "./middleware/errorSimulation";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import shortLinksRoutes from "./routes/shortlinks";
import analyticsRoutes from "./routes/analytics";
import tagsRoutes from "./routes/tags";

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

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
  console.log(`\n🚀 Mock server running at http://localhost:${PORT}`);
  console.log(`  Artificial delay: ${delayMs}ms`);
  console.log(`  Error simulation: send header "x-mock-error: true"\n`);
});
