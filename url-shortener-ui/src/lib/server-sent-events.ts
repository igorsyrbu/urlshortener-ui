export interface ServerSentEvent {
    event: string;
    data: string;
}

const MAX_EVENT_LENGTH = 64 * 1024;
const DEFAULT_EVENT_TYPE = "message";
const OVERSIZED_EVENT_MESSAGE = "Import progress event is too large.";

export class ServerSentEventDecoder {
    private buffer = "";
    private eventName = DEFAULT_EVENT_TYPE;
    private dataLines: string[] = [];
    private eventLength = 0;

    push(chunk: string): ServerSentEvent[] {
        this.buffer += chunk;
        const events: ServerSentEvent[] = [];
        let match = /\r\n|\r|\n/.exec(this.buffer);
        while (match) {
            // A CR at a chunk boundary may be the first half of CRLF.
            if (match[0] === "\r" && match.index === this.buffer.length - 1) break;
            this.processLine(this.buffer.slice(0, match.index), events);
            this.buffer = this.buffer.slice(match.index + match[0].length);
            match = /\r\n|\r|\n/.exec(this.buffer);
        }
        if (this.buffer.length + this.eventLength > MAX_EVENT_LENGTH) {
            throw new Error(OVERSIZED_EVENT_MESSAGE);
        }
        return events;
    }

    finish(): ServerSentEvent[] {
        const events: ServerSentEvent[] = [];
        if (this.buffer.endsWith("\r")) this.processLine(this.buffer.slice(0, -1), events);
        this.buffer = "";
        return events;
    }

    private processLine(line: string, events: ServerSentEvent[]): void {
        if (!line) {
            if (this.dataLines.length > 0) {
                events.push({event: this.eventName, data: this.dataLines.join("\n")});
            }
            this.eventName = DEFAULT_EVENT_TYPE;
            this.dataLines = [];
            this.eventLength = 0;
            return;
        }
        this.eventLength += line.length;
        if (this.eventLength > MAX_EVENT_LENGTH) throw new Error(OVERSIZED_EVENT_MESSAGE);
        const separator = line.indexOf(":");
        const field = separator < 0 ? line : line.slice(0, separator);
        const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
        if (field === "event") this.eventName = value || DEFAULT_EVENT_TYPE;
        if (field === "data") this.dataLines.push(value);
    }
}

export async function readServerSentEvents(
    response: Response,
    handleEvent: (event: ServerSentEvent) => boolean,
): Promise<void> {
    if (!response.body) return;
    const reader = response.body.getReader();
    const textDecoder = new TextDecoder();
    const eventDecoder = new ServerSentEventDecoder();
    try {
        while (true) {
            const {value, done} = await reader.read();
            const events = eventDecoder.push(textDecoder.decode(value, {stream: !done}));
            if (done) events.push(...eventDecoder.finish());
            for (const event of events) {
                if (handleEvent(event)) return;
            }
            if (done) return;
        }
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
