import {act, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ImportCsvDropzone} from "@/components/links/ImportCsvDropzone";
import {DROPZONE_ARIA_LABEL, DROPZONE_HINT, DROPZONE_HINT_ACTIVE} from "@/components/links/import-export-constants";
import {createCsvFile} from "@/test/csv-utils";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

function renderDropzone(file: File | null = null, disabled = false): {onFileChange: ReturnType<typeof vi.fn<(file: File | null) => void>>} {
    const onFileChange = vi.fn<(file: File | null) => void>();
    render(<ImportCsvDropzone file={file} onFileChange={onFileChange} disabled={disabled}/>);
    return {onFileChange};
}

function getDropzone(): HTMLElement {
    return screen.getByLabelText(DROPZONE_ARIA_LABEL);
}

function dropFiles(files: File[]): void {
    fireEvent.drop(getDropzone(), {dataTransfer: {files, types: ["Files"]}});
}

describe("ImportCsvDropzone", () => {
    it("invites the user to choose or drop a file", () => {
        renderDropzone();

        expect(screen.getByText(DROPZONE_HINT)).toBeInTheDocument();
    });

    it("reports a CSV file chosen through the file picker", async () => {
        const user = userEvent.setup();
        const {onFileChange} = renderDropzone();
        const file = createCsvFile();

        await user.upload(getDropzone(), file);

        expect(onFileChange).toHaveBeenCalledExactlyOnceWith(file);
    });

    it("ignores files the picker should not accept", async () => {
        const user = userEvent.setup();
        const {onFileChange} = renderDropzone();

        await user.upload(getDropzone(), createCsvFile({name: "photo.png", type: "image/png"}));

        expect(onFileChange).not.toHaveBeenCalled();
    });

    it("reports a file dropped onto the zone", () => {
        const {onFileChange} = renderDropzone();
        const file = createCsvFile();

        dropFiles([file]);

        expect(onFileChange).toHaveBeenCalledExactlyOnceWith(file);
    });

    it("uses the first file when several are dropped", () => {
        const {onFileChange} = renderDropzone();
        const [first, second] = [createCsvFile({name: "a.csv"}), createCsvFile({name: "b.csv"})];

        dropFiles([first, second]);

        expect(onFileChange).toHaveBeenCalledExactlyOnceWith(first);
    });

    it("ignores a drop that carries no files", () => {
        const {onFileChange} = renderDropzone();

        dropFiles([]);

        expect(onFileChange).not.toHaveBeenCalled();
    });

    it("prompts to drop while a file is dragged over and reverts when it leaves", () => {
        renderDropzone();

        fireEvent.dragOver(getDropzone());
        expect(screen.getByText(DROPZONE_HINT_ACTIVE)).toBeInTheDocument();
        fireEvent.dragLeave(getDropzone());

        expect(screen.getByText(DROPZONE_HINT)).toBeInTheDocument();
    });

    it("shows the selected file name with the full name available on hover", () => {
        const longName = `${"a".repeat(200)}.csv`;
        renderDropzone(createCsvFile({name: longName}));

        expect(screen.getByText(longName)).toHaveAttribute("title", longName);
        expect(screen.queryByText(DROPZONE_HINT)).not.toBeInTheDocument();
    });

    it("clears the selected file without opening the file picker", async () => {
        const user = userEvent.setup();
        const {onFileChange} = renderDropzone(createCsvFile());
        const pickerClick = vi.spyOn(HTMLInputElement.prototype, "click");

        await user.click(screen.getByRole("button", {name: "Remove selected file"}));

        expect(onFileChange).toHaveBeenCalledExactlyOnceWith(null);
        expect(pickerClick).not.toHaveBeenCalled();
    });

    it("measures the zone at most once per frame while a file is dragged across the window", () => {
        const pendingFrames: FrameRequestCallback[] = [];
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => pendingFrames.push(callback));
        renderDropzone();
        const measureZone = vi.spyOn(getDropzone(), "getBoundingClientRect");

        for (let step = 0; step < 5; step += 1) {
            fireEvent.dragOver(window, {dataTransfer: {types: ["Files"]}, clientX: step, clientY: step});
        }
        expect(measureZone).not.toHaveBeenCalled();
        act(() => { pendingFrames.splice(0).forEach((runFrame) => runFrame(0)); });

        expect(measureZone).toHaveBeenCalledOnce();
    });

    it("does not react to drops while disabled", () => {
        const {onFileChange} = renderDropzone(null, true);

        dropFiles([createCsvFile()]);
        fireEvent.dragOver(getDropzone());

        expect(onFileChange).not.toHaveBeenCalled();
        expect(screen.getByText(DROPZONE_HINT)).toBeInTheDocument();
    });
});
