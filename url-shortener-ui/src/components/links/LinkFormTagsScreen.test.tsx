import type {ComponentProps} from "react";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {TagsScreenContent} from "@/components/links/LinkFormTagsScreen";
import {createTag} from "@/test/tag-utils";

type TagsScreenProps = ComponentProps<typeof TagsScreenContent>;

const SUBMIT_LABEL = "Save";
const SUBMITTING_LABEL = "Saving...";
const marketing = createTag({id: "tag-m", name: "Marketing"});
const promo = createTag({id: "tag-p", name: "Promo", color: "red"});

function renderScreen(overrides: Partial<TagsScreenProps> = {}): TagsScreenProps {
    const props: TagsScreenProps = {
        tagSearch: "",
        onTagSearchChange: vi.fn(),
        onCreateTag: vi.fn(),
        createTagLoading: false,
        tags: [marketing, promo],
        tagsLoading: false,
        filteredTags: [marketing, promo],
        showCreateOption: false,
        selectedTagIds: [],
        onToggleTag: vi.fn(),
        tagError: null,
        isSubmitting: false,
        hasKeyError: false,
        longUrl: "https://example.com",
        submitLabel: SUBMIT_LABEL,
        submittingLabel: SUBMITTING_LABEL,
        onBack: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
        ...overrides,
    };
    render(<TagsScreenContent {...props}/>);
    return props;
}

describe("TagsScreenContent", () => {
    it("toggles the pressed tag", async () => {
        const user = userEvent.setup();
        const {onToggleTag} = renderScreen();

        await user.click(screen.getByRole("button", {name: promo.name}));

        expect(onToggleTag).toHaveBeenCalledExactlyOnceWith(promo.id);
    });

    it("reports search input changes", async () => {
        const user = userEvent.setup();
        const {onTagSearchChange} = renderScreen();

        await user.type(screen.getByPlaceholderText("Search or create tags..."), "p");

        expect(onTagSearchChange).toHaveBeenCalledWith("p");
    });

    it("shows a loading indicator while the first tags are loading", () => {
        renderScreen({tags: [], filteredTags: [], tagsLoading: true});

        expect(screen.getByText("Loading tags...")).toBeInTheDocument();
    });

    it("says there are no tags when the account has none", () => {
        renderScreen({tags: [], filteredTags: []});

        expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("says nothing was found when a search matches no tag and cannot create one", () => {
        renderScreen({tagSearch: "  ", filteredTags: []});

        expect(screen.getByText("No tags found")).toBeInTheDocument();
    });

    it("creates a tag from the search text", async () => {
        const user = userEvent.setup();
        const {onCreateTag} = renderScreen({tagSearch: "Fresh", filteredTags: [], showCreateOption: true});

        await user.click(screen.getByRole("button", {name: /Create tag\s*"Fresh"/}));

        expect(onCreateTag).toHaveBeenCalledOnce();
    });

    it("exposes a very long search text in the create option as a tooltip", () => {
        const longSearch = "x".repeat(300);
        renderScreen({tagSearch: longSearch, filteredTags: [], showCreateOption: true});

        expect(screen.getByTitle(longSearch)).toHaveTextContent(`Create tag "${longSearch}"`);
    });

    it("disables tag creation while a creation is in flight", () => {
        renderScreen({tagSearch: "Fresh", filteredTags: [], showCreateOption: true, createTagLoading: true});

        expect(screen.getByRole("button", {name: /Create tag/})).toBeDisabled();
    });

    it("shows the tag creation error", () => {
        renderScreen({tagError: "Failed to create tag"});

        expect(screen.getByText("Failed to create tag")).toBeInTheDocument();
    });

    it("submits, goes back and cancels from the matching buttons", async () => {
        const user = userEvent.setup();
        const {onSubmit, onBack, onCancel} = renderScreen();

        await user.click(screen.getByRole("button", {name: SUBMIT_LABEL}));
        await user.click(screen.getByRole("button", {name: "Back to form"}));
        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onBack).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("disables submission while submitting and shows the submitting label", () => {
        renderScreen({isSubmitting: true});

        expect(screen.getByRole("button", {name: /Saving\.\.\./})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
    });

    it.each([
        ["the URL is empty", {longUrl: "  "}],
        ["the short key has an error", {hasKeyError: true}],
    ])("disables submission when %s", (_reason, overrides) => {
        renderScreen(overrides);

        expect(screen.getByRole("button", {name: SUBMIT_LABEL})).toBeDisabled();
    });
});
