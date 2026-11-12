import {act, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {lazyDialog} from "@/lib/lazy-dialog";
import {logger} from "@/lib/logger";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

interface GreetingProps {
    name: string;
}

function Greeting({name}: GreetingProps) {
    return <p>Hello {name}</p>;
}

function deferred<Value>() {
    let resolve: (value: Value) => void = () => undefined;
    let reject: (reason: unknown) => void = () => undefined;
    const promise = new Promise<Value>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return {promise, resolve, reject};
}

describe("lazyDialog", () => {
    it("renders a preloaded dialog in the first render, without a loading pass", async () => {
        const Dialog = lazyDialog(async () => Greeting);
        await Dialog.preload();

        render(<Dialog name="Ada"/>);

        expect(screen.getByText("Hello Ada")).toBeInTheDocument();
    });

    it("renders nothing until the download finishes, then shows the dialog", async () => {
        const download = deferred<typeof Greeting>();
        const Dialog = lazyDialog(() => download.promise);
        const {container} = render(<Dialog name="Ada"/>);
        expect(container).toBeEmptyDOMElement();

        await act(async () => download.resolve(Greeting));

        expect(screen.getByText("Hello Ada")).toBeInTheDocument();
    });

    it("downloads once however often it is preloaded and rendered", async () => {
        const load = vi.fn(async () => Greeting);
        const Dialog = lazyDialog(load);

        void Dialog.preload();
        void Dialog.preload();
        render(<Dialog name="Ada"/>);
        await screen.findByText("Hello Ada");

        expect(load).toHaveBeenCalledOnce();
    });

    it("logs a failed download and tries again the next time the dialog renders", async () => {
        const load = vi.fn<() => Promise<typeof Greeting>>()
            .mockRejectedValueOnce(new Error("chunk failed"))
            .mockResolvedValue(Greeting);
        const Dialog = lazyDialog(load);
        const {container, rerender} = render(<Dialog name="Ada"/>);
        await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
        expect(container).toBeEmptyDOMElement();

        rerender(<Dialog name="Grace"/>);

        expect(await screen.findByText("Hello Grace")).toBeInTheDocument();
    });
});
