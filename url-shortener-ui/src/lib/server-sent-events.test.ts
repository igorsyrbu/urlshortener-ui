import {describe, expect, it, vi} from "vitest";
import {readServerSentEvents, ServerSentEvent, ServerSentEventDecoder} from "@/lib/server-sent-events";

const MAX_EVENT_LENGTH = 64 * 1024;

function decodeAll(...chunks: string[]): ServerSentEvent[] {
    const decoder = new ServerSentEventDecoder();
    return [...chunks.flatMap((chunk) => decoder.push(chunk)), ...decoder.finish()];
}

function streamResponse(chunks: Uint8Array[], onCancel?: () => void): Response {
    return new Response(new ReadableStream<Uint8Array>({
        start(controller): void {
            for (const chunk of chunks) controller.enqueue(chunk);
            if (!onCancel) controller.close();
        },
        cancel: onCancel,
    }));
}

function encode(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

describe("ServerSentEventDecoder", () => {
    it("handles fields and delimiters split across network chunks", () => {
        const decoder = new ServerSentEventDecoder();

        const results = [
            decoder.push("event: pro"),
            decoder.push('gress\r\ndata: {"processedRows":3,'),
            decoder.push('"totalRows":10}\r'),
            decoder.push("\n\r"),
            decoder.push("\n"),
        ];

        expect(results.slice(0, 4)).toEqual([[], [], [], []]);
        expect(results[4]).toEqual([{event: "progress", data: '{"processedRows":3,"totalRows":10}'}]);
    });

    it("joins multiline data and skips comments", () => {
        const events = decodeAll(": heartbeat\n\nevent: progress\ndata: one\ndata: two\n\ndata: next\n\n");

        expect(events).toEqual([{event: "progress", data: "one\ntwo"}, {event: "message", data: "next"}]);
    });

    it("finishes an event terminated by bare CR", () => {
        const decoder = new ServerSentEventDecoder();

        const beforeFinish = decoder.push("event: progress\rdata: complete\r\r");
        const afterFinish = decoder.finish();

        expect(beforeFinish).toEqual([]);
        expect(afterFinish).toEqual([{event: "progress", data: "complete"}]);
    });

    it("does not dispatch an incomplete final event", () => {
        expect(decodeAll("event: progress\ndata: incomplete\n")).toEqual([]);
    });

    it.each([
        ["a single space after the colon", "data: value\n\n", "value"],
        ["no space after the colon", "data:value\n\n", "value"],
        ["only the first space", "data:  two spaces\n\n", " two spaces"],
        ["an empty value", "data:\n\n", ""],
        ["a field without a colon", "data\n\n", ""],
    ])("parses data with %s", (_name, input, expected) => {
        expect(decodeAll(input)).toEqual([{event: "message", data: expected}]);
    });

    it("falls back to the message type for an empty event name", () => {
        expect(decodeAll("event:\ndata: x\n\n")).toEqual([{event: "message", data: "x"}]);
    });

    it("ignores unknown fields", () => {
        expect(decodeAll("id: 7\nretry: 100\nfoo: bar\ndata: x\n\n")).toEqual([{event: "message", data: "x"}]);
    });

    it("does not dispatch an event that has no data", () => {
        expect(decodeAll("event: progress\n\n")).toEqual([]);
    });

    it("does not leak the event name into the next event", () => {
        const events = decodeAll("event: progress\ndata: a\n\ndata: b\n\n");

        expect(events.map((event) => event.event)).toEqual(["progress", "message"]);
    });

    it("rejects a single oversized line", () => {
        expect(() => new ServerSentEventDecoder().push(`data: ${"x".repeat(MAX_EVENT_LENGTH + 1)}`)).toThrow("too large");
    });

    it("rejects an event whose lines add up beyond the limit", () => {
        const decoder = new ServerSentEventDecoder();
        const line = `data: ${"x".repeat(MAX_EVENT_LENGTH / 4)}\n`;

        expect(() => decoder.push(line.repeat(5))).toThrow("too large");
    });

    it("accepts large streams made of many small events", () => {
        const event = `data: ${"x".repeat(1000)}\n\n`;

        expect(decodeAll(event.repeat(200))).toHaveLength(200);
    });
});

describe("readServerSentEvents", () => {
    it("decodes UTF-8 characters split between byte chunks", async () => {
        const bytes = encode("event: progress\ndata: café\n\n");
        const response = streamResponse([...bytes].map((byte) => new Uint8Array([byte])));
        const handleEvent = vi.fn(() => false);

        await readServerSentEvents(response, handleEvent);

        expect(handleEvent).toHaveBeenCalledExactlyOnceWith({event: "progress", data: "café"});
    });

    it("delivers every event to the handler until the stream ends", async () => {
        const response = streamResponse([encode("data: one\n\ndata: two\n\n")]);
        const handleEvent = vi.fn<(event: ServerSentEvent) => boolean>(() => false);

        await readServerSentEvents(response, handleEvent);

        expect(handleEvent.mock.calls.map(([event]) => event.data)).toEqual(["one", "two"]);
    });

    it("dispatches a trailing event terminated by a bare CR when the stream closes", async () => {
        const response = streamResponse([encode("data: last\r\r")]);
        const handleEvent = vi.fn(() => false);

        await readServerSentEvents(response, handleEvent);

        expect(handleEvent).toHaveBeenCalledExactlyOnceWith({event: "message", data: "last"});
    });

    it("cancels the stream as soon as the handler reports a terminal event", async () => {
        const handleCancel = vi.fn();
        const response = streamResponse([encode("data: first\n\ndata: second\n\n")], handleCancel);
        const handleEvent = vi.fn(() => true);

        await readServerSentEvents(response, handleEvent);

        expect(handleEvent).toHaveBeenCalledOnce();
        expect(handleCancel).toHaveBeenCalledOnce();
    });

    it("cancels the stream and propagates the error when the handler throws", async () => {
        const handleCancel = vi.fn();
        const response = streamResponse([encode("data: x\n\n")], handleCancel);

        await expect(readServerSentEvents(response, () => { throw new Error("bad event"); })).rejects.toThrow("bad event");

        expect(handleCancel).toHaveBeenCalledOnce();
    });

    it("propagates a decoding error for oversized events", async () => {
        const response = streamResponse([encode(`data: ${"x".repeat(MAX_EVENT_LENGTH + 1)}`)]);

        await expect(readServerSentEvents(response, () => false)).rejects.toThrow("too large");
    });

    it("returns immediately for a response without a body", async () => {
        const handleEvent = vi.fn(() => false);

        await readServerSentEvents(new Response(null), handleEvent);

        expect(handleEvent).not.toHaveBeenCalled();
    });
});
