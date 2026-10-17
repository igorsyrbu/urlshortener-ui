import {describe, expect, it} from "vitest";
import {getBackendApiBaseUrl} from "@/lib/backend-url";

const BACKEND = "https://backend.internal:9000";
const LEGACY = "https://legacy.example.com";

describe("getBackendApiBaseUrl", () => {
    it("uses the server-only BACKEND_API_BASE_URL", () => {
        expect(getBackendApiBaseUrl({BACKEND_API_BASE_URL: BACKEND, NEXT_PUBLIC_API_BASE_URL: LEGACY})).toBe(BACKEND);
    });

    it("falls back to the deprecated NEXT_PUBLIC_API_BASE_URL", () => {
        expect(getBackendApiBaseUrl({NEXT_PUBLIC_API_BASE_URL: LEGACY})).toBe(LEGACY);
    });

    it("defaults to the local mock server", () => {
        expect(getBackendApiBaseUrl({})).toBe("http://localhost:8080");
    });

    it("ignores an empty value", () => {
        expect(getBackendApiBaseUrl({BACKEND_API_BASE_URL: "", NEXT_PUBLIC_API_BASE_URL: LEGACY})).toBe(LEGACY);
    });
});
