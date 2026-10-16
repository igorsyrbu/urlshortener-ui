import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { cors } from "./middleware/cors";
import { delay } from "./middleware/delay";
import { errorSimulation } from "./middleware/errorSimulation";
import { jsonErrors } from "./middleware/jsonErrors";
import abuseRoutes from "./routes/abuse";
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import shortLinksRoutes from "./routes/shortlinks";
import tagsRoutes from "./routes/tags";
import usersRoutes from "./routes/users";
import billingRoutes from "./routes/billing";
import { authService } from "./services/AuthService";
import { memoryStore, type UserState } from "./services/MemoryStore";

const CSV_BODY_LIMIT = "100kb";

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export interface TestUser {
  uuid: string;
  state: UserState;
  authorization: string;
}

export interface JsonResponse {
  status: number;
  body: unknown;
}

export function createTestUser(): TestUser {
  const uuid = randomUUID();
  const state = memoryStore.registerUserSession(uuid);
  return { uuid, state, authorization: `Bearer ${authService.getMockAccessToken(uuid)}` };
}

export function createTestUserWithoutLinks(): TestUser {
  const user = createTestUser();
  user.state.links = [];
  user.state.tagAssociations.clear();
  return user;
}

export function createUnregisteredAuthorization(): string {
  return `Bearer ${authService.getMockAccessToken(randomUUID())}`;
}

export function createTestApp(): express.Express {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/csv", limit: CSV_BODY_LIMIT }));
  app.use(delay);
  app.use(errorSimulation);
  app.use(authRoutes);
  app.use(usersRoutes);
  app.use(shortLinksRoutes);
  app.use(analyticsRoutes);
  app.use(tagsRoutes);
  app.use(abuseRoutes);
  app.use(billingRoutes);
  app.use(jsonErrors);
  return app;
}

export async function startTestServer(app: express.Express = createTestApp()): Promise<TestServer> {
  const server = await listenOnRandomPort(app);
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => closeServer(server),
  };
}

export async function requestJson(
  server: TestServer,
  method: string,
  path: string,
  options: { authorization?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<JsonResponse> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.authorization) headers.Authorization = options.authorization;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${server.baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
  const text = await response.text();
  return { status: response.status, body: text ? parseJsonOrText(text) : null };
}

function parseJsonOrText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function listenOnRandomPort(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}
