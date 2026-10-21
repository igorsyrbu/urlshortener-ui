import {useState} from "react";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TagSelect} from "@/components/links/TagSelect";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import type {TagItem} from "@/lib/types";
import {getRequestsTo, parseRequestBody, routeFetchWithAuth} from "@/test/link-form-utils";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const NO_SELECTION_PLACEHOLDER = "Select tags";
const SEARCH_PLACEHOLDER = "Search or add tags...";
const MAX_VISIBLE_BADGES = 4;

const marketing = createTag({id: "tag-m", name: "Marketing"});
const alpha = createTag({id: "tag-a", name: "alpha", color: "red"});
const zeta = createTag({id: "tag-z", name: "Zeta", color: "green"});

interface RenderedSelect {
    onChange: ReturnType<typeof vi.fn<(tagIds: string[]) => void>>;
}

interface ControlledTagSelectProps {
    initialIds: string[];
    onChange: (tagIds: string[]) => void;
    disabled?: boolean;
}

function ControlledTagSelect({initialIds, onChange, disabled}: ControlledTagSelectProps) {
    const [selectedTagIds, setSelectedTagIds] = useState(initialIds);
    const handleChange = (ids: string[]): void => {
        setSelectedTagIds(ids);
        onChange(ids);
    };
    return <TagSelect selectedTagIds={selectedTagIds} onChange={handleChange} disabled={disabled}/>;
}

function renderSelect(initialIds: string[] = [], disabled?: boolean): RenderedSelect {
    const onChange = vi.fn<(tagIds: string[]) => void>();
    render(<ControlledTagSelect initialIds={initialIds} onChange={onChange} disabled={disabled}/>);
    return {onChange};
}

function getTrigger(): HTMLElement {
    return screen.getAllByRole("button")[0];
}

function getOptionNames(): string[] {
    return screen.getAllByRole("option").map((option) => option.textContent ?? "");
}

describe("TagSelect", () => {
    beforeEach(() => {
        useTagStoreWithoutCount.setState({tags: [marketing, zeta, alpha], loading: false, error: null});
        routeFetchWithAuth({});
    });

    describe("trigger", () => {
        it("prompts to select tags when nothing is selected", () => {
            renderSelect();

            expect(screen.getByText(NO_SELECTION_PLACEHOLDER)).toBeInTheDocument();
        });

        it("shows the selected tags sorted by name", () => {
            renderSelect([zeta.id, marketing.id]);

            const badgeTexts = screen.getAllByText(/Marketing|Zeta/).map((badge) => badge.textContent);
            expect(badgeTexts).toEqual(["Marketing", "Zeta"]);
            expect(screen.queryByText(NO_SELECTION_PLACEHOLDER)).not.toBeInTheDocument();
        });

        it("summarises tags beyond the visible limit", () => {
            const manyTags: TagItem[] = Array.from({length: MAX_VISIBLE_BADGES + 2}, (_, index) => createTag({id: `t${index}`, name: `Tag ${index}`}));
            useTagStoreWithoutCount.setState({tags: manyTags});

            renderSelect(manyTags.map((tag) => tag.id));

            expect(screen.getByText("+2")).toBeInTheDocument();
        });

        it("ignores selected ids that are not in the tag store", () => {
            renderSelect(["unknown-id"]);

            expect(screen.getByText(NO_SELECTION_PLACEHOLDER)).toBeInTheDocument();
        });

        it("does not open when disabled", async () => {
            const user = userEvent.setup();
            renderSelect([], true);

            await user.click(getTrigger());

            expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
        });
    });

    describe("options", () => {
        it("lists tags alphabetically ignoring case and focuses the search box", async () => {
            const user = userEvent.setup();
            renderSelect();

            await user.click(getTrigger());

            expect(getOptionNames()).toEqual(["alpha", "Marketing", "Zeta"]);
            await waitFor(() => expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveFocus());
        });

        it("selects a tag and reports the new selection", async () => {
            const user = userEvent.setup();
            const {onChange} = renderSelect([marketing.id]);

            await user.click(getTrigger());
            await user.click(screen.getByRole("option", {name: "Zeta"}));

            expect(onChange).toHaveBeenLastCalledWith([marketing.id, zeta.id]);
            expect(screen.getByRole("option", {name: "Zeta"})).toHaveAttribute("aria-selected", "true");
        });

        it("deselects a selected tag", async () => {
            const user = userEvent.setup();
            const {onChange} = renderSelect([marketing.id, zeta.id]);

            await user.click(getTrigger());
            await user.click(screen.getByRole("option", {name: "Marketing"}));

            expect(onChange).toHaveBeenLastCalledWith([zeta.id]);
            expect(screen.getByRole("option", {name: "Marketing"})).toHaveAttribute("aria-selected", "false");
        });

        it("shows a loading indicator while tags are being fetched", async () => {
            const user = userEvent.setup();
            useTagStoreWithoutCount.setState({tags: [], loading: true});
            renderSelect();

            await user.click(getTrigger());

            expect(screen.getByText("Loading tags...")).toBeInTheDocument();
        });

        it("says there are no tags when the account has none", async () => {
            const user = userEvent.setup();
            useTagStoreWithoutCount.setState({tags: []});
            renderSelect();

            await user.click(getTrigger());

            expect(screen.getByText("No tags available")).toBeInTheDocument();
        });

        it("exposes the full tag name for long names", async () => {
            const user = userEvent.setup();
            const longName = "a".repeat(200);
            useTagStoreWithoutCount.setState({tags: [createTag({id: "long", name: longName})]});
            renderSelect();

            await user.click(getTrigger());

            expect(screen.getByTitle(longName)).toBeInTheDocument();
        });
    });

    describe("search", () => {
        it("filters tags by name regardless of case", async () => {
            const user = userEvent.setup();
            renderSelect();

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "MARK");

            expect(getOptionNames()).toEqual(expect.arrayContaining(["Marketing"]));
            expect(screen.queryByRole("option", {name: "Zeta"})).not.toBeInTheDocument();
        });

        it("offers to create a tag when nothing matches exactly", async () => {
            const user = userEvent.setup();
            renderSelect();

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Brand new");

            expect(screen.getByRole("option", {name: /Create\s*"Brand new"/})).toBeInTheDocument();
        });

        it("does not offer to create a tag whose name already exists in another case", async () => {
            const user = userEvent.setup();
            renderSelect();

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "zeta");

            expect(screen.queryByRole("option", {name: /Create/})).not.toBeInTheDocument();
        });

        it("clears the search when the popover is closed and reopened", async () => {
            const user = userEvent.setup();
            renderSelect();
            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "zz");

            await user.keyboard("{Escape}");
            await user.click(getTrigger());

            expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
            expect(screen.getAllByRole("option")).toHaveLength(3);
        });
    });

    describe("creating a tag", () => {
        it("creates the tag with the search text and selects it", async () => {
            const user = userEvent.setup();
            const created = createTag({id: "tag-new", name: "Brand new"});
            routeFetchWithAuth({[API_ENDPOINTS.TAGS]: () => Response.json(created)});
            const {onChange} = renderSelect([marketing.id]);

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "  Brand new ");
            await user.click(screen.getByRole("option", {name: /Create/}));

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([marketing.id, created.id]));
            const [request] = getRequestsTo(API_ENDPOINTS.TAGS, "POST");
            expect(parseRequestBody(request).name).toBe("Brand new");
            expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
        });

        it("reports a failed creation and keeps the selection unchanged", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.TAGS]: () => new Response("nope", {status: 500})});
            const {onChange} = renderSelect();

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Broken");
            await user.click(screen.getByRole("option", {name: /Create/}));

            expect(await screen.findByText("Failed to create tag")).toBeInTheDocument();
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    describe("keyboard navigation", () => {
        it("toggles the highlighted tag with arrow keys and enter", async () => {
            const user = userEvent.setup();
            const {onChange} = renderSelect();

            await user.click(getTrigger());
            await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

            expect(onChange).toHaveBeenLastCalledWith([marketing.id]);
        });

        it("wraps from the last tag back to the first", async () => {
            const user = userEvent.setup();
            const {onChange} = renderSelect();

            await user.click(getTrigger());
            await user.keyboard("{ArrowUp}{Enter}");
            await user.keyboard("{ArrowDown}{Enter}");

            expect(onChange).toHaveBeenNthCalledWith(1, [zeta.id]);
            expect(onChange).toHaveBeenNthCalledWith(2, [zeta.id, alpha.id]);
        });

        it("creates the typed tag when enter is pressed on the create option", async () => {
            const user = userEvent.setup();
            const created = createTag({id: "tag-kb", name: "Typed"});
            routeFetchWithAuth({[API_ENDPOINTS.TAGS]: () => Response.json(created)});
            const {onChange} = renderSelect();

            await user.click(getTrigger());
            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Typed{Enter}");

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([created.id]));
        });

        it("closes the popover with escape", async () => {
            const user = userEvent.setup();
            renderSelect();
            await user.click(getTrigger());

            await user.keyboard("{Escape}");

            await waitFor(() => expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument());
        });

        it("does nothing on enter when no tag is highlighted", async () => {
            const user = userEvent.setup();
            const {onChange} = renderSelect();

            await user.click(getTrigger());
            await user.keyboard("{Enter}");

            expect(onChange).not.toHaveBeenCalled();
            expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
        });
    });

    describe("combobox semantics", () => {
        it("ties the search box to the listbox and announces the active option", async () => {
            const user = userEvent.setup();
            renderSelect();
            await user.click(getTrigger());

            const combobox = screen.getByRole("combobox", {name: "Search or add tags"});
            const listbox = screen.getByRole("listbox", {name: "Tags"});
            expect(combobox).toHaveAttribute("aria-controls", listbox.id);
            expect(listbox).toHaveAttribute("aria-multiselectable", "true");

            await user.keyboard("{ArrowDown}");

            const activeId = combobox.getAttribute("aria-activedescendant");
            expect(activeId).not.toBeNull();
            expect(document.getElementById(activeId ?? "")).toHaveAttribute("role", "option");
            expect(combobox).toHaveFocus();
        });

        it("keeps the options out of the tab order, so focus stays in the search box", async () => {
            const user = userEvent.setup();
            renderSelect();
            await user.click(getTrigger());

            for (const option of screen.getAllByRole("option")) expect(option).toHaveAttribute("tabindex", "-1");
        });
    });
});
