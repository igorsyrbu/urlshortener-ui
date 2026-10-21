import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type express from "express";
import { createApp } from "./app";
import { DEFAULT_MOCK_CONFIG, type MockConfig } from "./config";
import { BillingService } from "./services/BillingService";
import { authService } from "./services/AuthService";
import { memoryStore, type UserState } from "./services/MemoryStore";

/** Fixed settings, so a developer's shell environment or `.env` cannot change test results. */
export const TEST_CONFIG: MockConfig = DEFAULT_MOCK_CONFIG;

/** The billing service behind `createTestApp()`; tests seed scenarios through it. */
export const testBillingService = new BillingService();

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

export function createTestApp(config: MockConfig = TEST_CONFIG): express.Express {
  return createApp({ config, billing: testBillingService });
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
