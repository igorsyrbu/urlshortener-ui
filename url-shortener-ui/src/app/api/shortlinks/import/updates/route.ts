import {SERVER_API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";

const HTTP_UNAUTHORIZED = 401;

// Only the content type is forwarded on failure: backend hop-by-hop and Set-Cookie headers must not reach the browser.
function forwardFailure(backend: Response): Response {
    const contentType = backend.headers.get("content-type");
    return new Response(backend.body, {
        status: backend.status,
        headers: contentType ? {"Content-Type": contentType} : undefined,
    });
}

// Streams backend SSE without buffering through the generic rewrite proxy.
// The body is forwarded as a stream; it must not be read into memory.
export async function GET(request: Request): Promise<Response> {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
        return new Response(null, {status: HTTP_UNAUTHORIZED});
    }
    const backend = await fetch(`${SERVER_API_BASE_URL}${API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES}`, {
        headers: {
            Authorization: authorization,
            Accept: "text/event-stream",
        },
        cache: "no-store",
        signal: request.signal,
    });
    if (!backend.ok || !backend.body) {
        return forwardFailure(backend);
    }
    return new Response(backend.body, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
