import {getBackendApiBaseUrl} from "@/lib/backend-url";
import {API_ENDPOINTS} from "@/lib/constants";
import {HTTP_BAD_GATEWAY, HTTP_OK, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {logger} from "@/lib/logger";

/** Every request streams a user's live progress: never prerendered or cached. */
export const dynamic = "force-dynamic";

const BACKEND_UNREACHABLE_DETAIL = "The import progress service is unreachable.";

// Only the content type is forwarded on failure: backend hop-by-hop and Set-Cookie headers must not reach the browser.
function forwardFailure(backend: Response): Response {
    const contentType = backend.headers.get("content-type");
    return new Response(backend.body, {
        status: backend.status,
        headers: contentType ? {"Content-Type": contentType} : undefined,
    });
}

/** A JSON problem the client can read (and retry, as a 5xx), instead of the HTML error page an uncaught failure becomes. */
function backendUnreachable(): Response {
    return Response.json({status: HTTP_BAD_GATEWAY, detail: BACKEND_UNREACHABLE_DETAIL}, {
        status: HTTP_BAD_GATEWAY,
        headers: {"Content-Type": "application/problem+json", "Cache-Control": "no-store"},
    });
}

function requestBackendUpdates(authorization: string, signal: AbortSignal): Promise<Response | null> {
    return fetch(`${getBackendApiBaseUrl()}${API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES}`, {
        headers: {
            Authorization: authorization,
            Accept: "text/event-stream",
        },
        cache: "no-store",
        signal,
    }).catch((error: unknown) => {
        if (!signal.aborted) logger.error("Import progress backend unreachable", error);
        return null;
    });
}

// Streams backend SSE without buffering through the generic rewrite proxy.
// The body is forwarded as a stream; it must not be read into memory.
export async function GET(request: Request): Promise<Response> {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
        return new Response(null, {status: HTTP_UNAUTHORIZED});
    }
    const backend = await requestBackendUpdates(authorization, request.signal);
    if (!backend) return backendUnreachable();
    if (!backend.ok || !backend.body) {
        return forwardFailure(backend);
    }
    return new Response(backend.body, {
        status: HTTP_OK,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}
