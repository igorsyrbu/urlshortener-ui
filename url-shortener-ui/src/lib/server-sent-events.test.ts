import {describe, expect, it, vi} from "vitest";
import {readServerSentEvents, ServerSentEventDecoder} from "@/lib/server-sent-events";

describe("server-sent event decoding", () => {
    it("handles fields and delimiters split across network chunks", () => {
        const decoder = new ServerSentEventDecoder();
        expect(decoder.push("event: pro")).toEqual([]);
        expect(decoder.push('gress\r\ndata: {"processedRows":3,')).toEqual([]);
        expect(decoder.push('"totalRows":10}\r')).toEqual([]);
        expect(decoder.push("\n\r")).toEqual([]);
        expect(decoder.push("\n")).toEqual([{event: "progress", data: '{"processedRows":3,"totalRows":10}'}]);
    });

    it("handles multiple events, comments, and multiline data", () => {
        const decoder = new ServerSentEventDecoder();
        expect(decoder.push(": heartbeat\n\nevent: progress\ndata: one\ndata: two\n\ndata: next\n\n")).toEqual([
            {event: "progress", data: "one\ntwo"}, {event: "message", data: "next"},
        ]);
    });

    it("finishes an event terminated by bare CR", () => {
        const decoder = new ServerSentEventDecoder();
        expect(decoder.push("event: progress\rdata: complete\r\r")).toEqual([]);
        expect(decoder.finish()).toEqual([{event: "progress", data: "complete"}]);
    });

    it("does not dispatch an incomplete final event", () => {
        const decoder = new ServerSentEventDecoder();
        expect(decoder.push("event: progress\ndata: incomplete\n")).toEqual([]);
        expect(decoder.finish()).toEqual([]);
    });

    it("rejects oversized events", () => {
        expect(() => new ServerSentEventDecoder().push("data: " + "x".repeat(70_000))).toThrow("too large");
    });

    it("decodes UTF-8 characters split between byte chunks", async () => {
        const bytes = new TextEncoder().encode("event: progress\ndata: café\n\n");
        const response = new Response(new ReadableStream<Uint8Array>({
            start(controller): void {
                for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
                controller.close();
            },
        }));
        const handleEvent = vi.fn(() => false);
        await readServerSentEvents(response, handleEvent);
        expect(handleEvent).toHaveBeenCalledWith({event: "progress", data: "café"});
    });

    it("cancels the stream as soon as a terminal event is handled", async () => {
        const handleCancel = vi.fn();
        const response = new Response(new ReadableStream<Uint8Array>({
            start(controller): void {
                controller.enqueue(new TextEncoder().encode("event: progress\ndata: complete\n\n"));
            },
            cancel: handleCancel,
        }));
        await readServerSentEvents(response, () => true);
        expect(handleCancel).toHaveBeenCalledOnce();
    });
});
