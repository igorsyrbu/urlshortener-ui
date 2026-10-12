import {SERVER_API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";

// Streams backend SSE without buffering through the generic rewrite proxy.
// The body is forwarded as a stream; it must not be read into memory.
export async function GET(request: Request): Promise<Response> {
    const backend = await fetch(`${SERVER_API_BASE_URL}${API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES}`, {
        headers: {
            Authorization: request.headers.get("authorization") ?? "",
            Accept: "text/event-stream",
        },
        cache: "no-store",
        signal: request.signal,
    });
    if (!backend.ok || !backend.body) {
        return new Response(backend.body, {status: backend.status, headers: backend.headers});
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
