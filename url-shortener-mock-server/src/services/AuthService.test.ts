import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { authService } from "./AuthService";

const NOW_MS = Date.UTC(2026, 0, 15, 12, 0, 0);
const NOW_SECONDS = NOW_MS / 1000;
const TOKEN_LIFETIME_SECONDS = 3600;
const JWT_PART_COUNT = 3;
const UUID_PREFIX_LENGTH = 8;

interface DecodedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function decodeToken(token: string): DecodedToken {
  const [header, payload, signature] = token.split(".");
  const decode = (part: string): Record<string, unknown> => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  return { header: decode(header), payload: decode(payload), signature };
}

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: NOW_MS });
});

afterEach(() => {
  mock.timers.reset();
});

describe("AuthService.getMockAccessToken", () => {
  it("returns a three-part JWT with an RS256 header", () => {
    const token = authService.getMockAccessToken(randomUUID());
    assert.equal(token.split(".").length, JWT_PART_COUNT);
    assert.deepEqual(decodeToken(token).header, { alg: "RS256", typ: "JWT" });
  });

  it("identifies the user by uuid in the subject claim", () => {
    const uuid = randomUUID();
    const { payload } = decodeToken(authService.getMockAccessToken(uuid));
    assert.equal(payload.sub, `mock-user-${uuid}`);
    assert.equal(payload.accountId, `acc-${uuid.slice(0, UUID_PREFIX_LENGTH)}`);
    assert.equal(payload.email, `john.doe@${uuid.slice(0, UUID_PREFIX_LENGTH)}.dev`);
    assert.equal(payload.scope, "business");
  });

  it("expires one hour after issuing", () => {
    const { payload } = decodeToken(authService.getMockAccessToken(randomUUID()));
    assert.equal(payload.iat, NOW_SECONDS);
    assert.equal(payload.exp, NOW_SECONDS + TOKEN_LIFETIME_SECONDS);
  });

  it("issues a fresh expiry for a refreshed token", () => {
    const uuid = randomUUID();
    const first = decodeToken(authService.getMockAccessToken(uuid)).payload;
    mock.timers.tick(TOKEN_LIFETIME_SECONDS * 1000);
    const refreshed = decodeToken(authService.getMockAccessToken(uuid)).payload;
    assert.equal(Number(refreshed.exp) - Number(first.exp), TOKEN_LIFETIME_SECONDS);
  });

  it("uses a placeholder signature", () => {
    assert.equal(decodeToken(authService.getMockAccessToken(randomUUID())).signature, "mock-signature");
  });
});
