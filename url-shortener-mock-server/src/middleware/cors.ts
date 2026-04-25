import corsMiddleware from "cors";

/**
 * CORS middleware configured to allow requests from the Next.js dev origin.
 * Supports credentials (cookies) for token refresh flows.
 */
export const cors = corsMiddleware({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-mock-error"],
});
