import corsMiddleware from "cors";
import { BILLING_RETRY_AFTER_HEADER } from "../services/billing-constants";

/**
 * CORS middleware configured to allow requests from any origin.
 * Supports credentials (cookies) for token refresh flows.
 */
export const cors = corsMiddleware({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-mock-error"],
  exposedHeaders: [BILLING_RETRY_AFTER_HEADER, "Retry-After"],
});
