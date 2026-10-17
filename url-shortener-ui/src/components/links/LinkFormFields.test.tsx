import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import {ShortKeyConflictError} from "@/components/links/create-link-types";
import {fetchWithAuth} from "@/lib/api";
import {
    API_ENDPOINTS,
    DEFAULT_LINK_TITLE,
    KEY_AVAILABILITY_CHECK_DEBOUNCE_MS,
    SHORT_KEY_TAKEN_MESSAGE,
    TRACKER_MODE,
    URL_CLEANER_DEBOUNCE_MS,
    ICON_BUTTON_LABELS,
} from "@/lib/constants";
import {usePreferencesStore} from "@/lib/store/preferences";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {getRequestsTo, routeFetchWithAuth} from "@/test/link-form-utils";
import {createTag} from "@/test/tag-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

type SubmitHandler = (longUrl: string, title: string, key: string, tagIds: string[]) => Promise<void>;

const SUBMIT_LABEL = "Create";
const SUBMITTING_LABEL = "Creating...";
const GENERATED_KEY = "gen-key";
const INVALID_URL_MESSAGE = "Please enter a valid URL (e.g. https://example.com)";
const KEY_FORMAT_MESSAGE = "Key can only contain letters, numbers, and hyphens.";
const KEY_GENERATION_FAILED_MESSAGE = "Failed to generate a random key. Please type one manually.";
const KEY_REQUIRED_MESSAGE = "Key is required.";
const KEY_AVAILABILITY_TIMEOUT_MS = KEY_AVAILABILITY_CHECK_DEBOUNCE_MS * 3;

interface RenderOptions {
    onSubmit?: SubmitHandler;
    autoGenerateKey?: boolean;
    enableTitleSuggestion?: boolean;
    enableUrlCleaner?: boolean;
    initialLongUrl?: string;
    initialTitle?: string;
    initialKey?: string;
    initialTagIds?: string[];
}

function renderForm(options: RenderOptions = {}): {onSubmit: ReturnType<typeof vi.fn<SubmitHandler>>, onCancel: () => void} {
    const onSubmit = vi.fn<SubmitHandler>(options.onSubmit ?? (async () => undefined));
    const onCancel = vi.fn();
    render(
        <LinkFormFields
            title="Create link"
            submitLabel={SUBMIT_LABEL}
            submittingLabel={SUBMITTING_LABEL}
            onSubmit={onSubmit}
            onCancel={onCancel}
            autoGenerateKey={options.autoGenerateKey}
            enableTitleSuggestion={options.enableTitleSuggestion}
            enableUrlCleaner={options.enableUrlCleaner}
            initialLongUrl={options.initialLongUrl}
            initialTitle={options.initialTitle}
            initialKey={options.initialKey}
            initialTagIds={options.initialTagIds}
        />,
    );
    return {onSubmit, onCancel};
}

function getUrlInput(): HTMLElement {
    return screen.getByLabelText("Destination URL");
}

function getKeyInput(): HTMLElement {
    return screen.getByLabelText("Short Link");
}

async function waitForUrlAutofocus(): Promise<void> {
    await waitFor(() => expect(getUrlInput()).toHaveFocus());
}

function getSubmitButton(): HTMLElement {
    return screen.getByRole("button", {name: new RegExp(`^(${SUBMIT_LABEL}|${SUBMITTING_LABEL})`)});
}

function getSuggestTitleButton(): HTMLElement {
    return screen.getByRole("button", {name: ICON_BUTTON_LABELS.SUGGEST_TITLE});
}

function mockPreferences(mode: string): () => Response {
    return () => Response.json({urlCleanerMode: mode});
}

async function fillUrlAndKey(user: ReturnType<typeof userEvent.setup>, url: string, key: string): Promise<void> {
    await user.type(getUrlInput(), url);
    await user.type(getKeyInput(), key);
}

describe("LinkFormFields", () => {
    beforeEach(() => {
        media.isDesktop = true;
        usePreferencesStore.setState({trackerMode: null, hasLoaded: false, isLoading: false, isSaving: false});
        useTagStoreWithoutCount.setState({tags: [], loading: false, error: null});
        routeFetchWithAuth({});
    });

    afterEach(() => { vi.useRealTimers(); });

    describe("short key generation", () => {
        it("fills the key field with a generated key when auto generation is enabled", async () => {
            routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS_RANDOM]: () => Response.json({key: GENERATED_KEY})});

            renderForm({autoGenerateKey: true});

            await waitFor(() => expect(getKeyInput()).toHaveValue(GENERATED_KEY));
        });

        it("asks the user to type a key when generation fails", async () => {
            routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS_RANDOM]: () => new Response(null, {status: 500})});

            renderForm({autoGenerateKey: true});

            expect(await screen.findByText(KEY_GENERATION_FAILED_MESSAGE)).toBeInTheDocument();
            expect(getKeyInput()).toHaveValue("");
        });

        it("replaces the current key when the shuffle button is pressed", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS_RANDOM]: () => Response.json({key: GENERATED_KEY})});
            renderForm({initialKey: "manual"});

            await user.click(screen.getByRole("button", {name: "Generate a random short link"}));

            await waitFor(() => expect(getKeyInput()).toHaveValue(GENERATED_KEY));
        });

        it("generates a new key when the user empties the field and leaves it", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS_RANDOM]: () => Response.json({key: GENERATED_KEY})});
            renderForm({initialKey: "manual"});
            await waitForUrlAutofocus();

            await user.clear(getKeyInput());
            await user.tab();

            await waitFor(() => expect(getKeyInput()).toHaveValue(GENERATED_KEY));
        });
    });

    describe("short key validation", () => {
        it("rejects characters other than letters, digits and hyphens", async () => {
            const user = userEvent.setup();
            renderForm();
            await waitForUrlAutofocus();

            await user.type(getKeyInput(), "bad key!");

            expect(screen.getByText(KEY_FORMAT_MESSAGE)).toBeInTheDocument();
        });

        it("rejects keys longer than thirty characters", async () => {
            const user = userEvent.setup();
            renderForm();
            await waitForUrlAutofocus();

            await user.type(getKeyInput(), "a".repeat(31));

            expect(screen.getByText("Key must be 30 characters or fewer.")).toBeInTheDocument();
        });

        it("reports a taken key and blocks submission once the availability check answers 200", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS_EXISTS("taken")]: () => new Response(null, {status: 200})});
            renderForm({initialLongUrl: "https://example.com"});

            await user.type(getKeyInput(), "taken");

            expect(await screen.findByText(SHORT_KEY_TAKEN_MESSAGE, {}, {timeout: KEY_AVAILABILITY_TIMEOUT_MS})).toBeInTheDocument();
            expect(getSubmitButton()).toBeDisabled();
        });

        it("clears the taken message when the key becomes available", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({
                [API_ENDPOINTS.SHORTLINKS_EXISTS("taken")]: () => new Response(null, {status: 200}),
                [API_ENDPOINTS.SHORTLINKS_EXISTS("taken2")]: () => new Response(null, {status: 404}),
            });
            renderForm({initialLongUrl: "https://example.com"});
            await user.type(getKeyInput(), "taken");
            await screen.findByText(SHORT_KEY_TAKEN_MESSAGE, {}, {timeout: KEY_AVAILABILITY_TIMEOUT_MS});

            await user.type(getKeyInput(), "2");

            await waitFor(() => expect(screen.queryByText(SHORT_KEY_TAKEN_MESSAGE)).not.toBeInTheDocument(),
                {timeout: KEY_AVAILABILITY_TIMEOUT_MS});
        });

        it("does not check availability of the key the link already owns", async () => {
            vi.useFakeTimers({shouldAdvanceTime: true});
            const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
            renderForm({initialKey: "mine"});
            await waitForUrlAutofocus();

            await user.type(getKeyInput(), "X");
            await user.type(getKeyInput(), "{Backspace}");
            await vi.advanceTimersByTimeAsync(KEY_AVAILABILITY_CHECK_DEBOUNCE_MS);

            expect(getRequestsTo(API_ENDPOINTS.SHORTLINKS_EXISTS("mine"))).toHaveLength(0);
        });
    });

    describe("destination URL", () => {
        it("disables submit while the URL is empty", () => {
            renderForm();

            expect(getSubmitButton()).toBeDisabled();
        });

        it("prefixes a bare domain with https when the field loses focus", async () => {
            const user = userEvent.setup();
            renderForm();

            await user.type(getUrlInput(), "example.com/page");
            await user.tab();

            expect(getUrlInput()).toHaveValue("https://example.com/page");
        });

        it("shows an error for an invalid URL when the field loses focus", async () => {
            const user = userEvent.setup();
            renderForm();

            await user.type(getUrlInput(), "not a url");
            await user.tab();

            expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
        });

        it("clears the URL error as soon as the user edits the field", async () => {
            const user = userEvent.setup();
            renderForm();
            await user.type(getUrlInput(), "nope");
            await user.tab();

            await user.type(getUrlInput(), "x");

            expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();
        });
    });

    describe("submission", () => {
        it("submits the normalized URL, default title, key and selected tags", async () => {
            const user = userEvent.setup();
            const {onSubmit} = renderForm({initialTagIds: ["tag-1"]});

            await fillUrlAndKey(user, "example.com", "my-key");
            await user.click(getSubmitButton());

            expect(onSubmit).toHaveBeenCalledExactlyOnceWith("https://example.com", DEFAULT_LINK_TITLE, "my-key", ["tag-1"]);
        });

        it("submits a trimmed custom title", async () => {
            const user = userEvent.setup();
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com", initialKey: "k"});

            await user.type(screen.getByLabelText("Title"), "  My title  ");
            await user.click(getSubmitButton());

            expect(onSubmit).toHaveBeenCalledWith("https://example.com", "My title", "k", []);
        });

        it("does not submit and reports an invalid URL", async () => {
            const user = userEvent.setup();
            const {onSubmit} = renderForm({initialKey: "k"});

            await user.type(getUrlInput(), "invalid url");
            await user.click(getSubmitButton());

            expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
            expect(onSubmit).not.toHaveBeenCalled();
        });

        it("announces the URL error, links it to the field and focuses the field", async () => {
            const user = userEvent.setup();
            renderForm({initialKey: "k"});

            await user.type(getUrlInput(), "invalid url");
            await user.click(getSubmitButton());

            expect(screen.getByRole("alert")).toHaveTextContent(INVALID_URL_MESSAGE);
            expect(getUrlInput()).toHaveAttribute("aria-invalid", "true");
            expect(getUrlInput()).toHaveAccessibleDescription(INVALID_URL_MESSAGE);
            await waitFor(() => expect(getUrlInput()).toHaveFocus());
        });

        it("does not submit without a key", async () => {
            const user = userEvent.setup();
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com"});

            await user.click(getSubmitButton());

            expect(screen.getByText(KEY_REQUIRED_MESSAGE)).toBeInTheDocument();
            expect(onSubmit).not.toHaveBeenCalled();
        });

        it("does not submit a key with forbidden characters", async () => {
            const user = userEvent.setup();
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com", initialKey: "bad key"});

            await user.click(getSubmitButton());

            expect(screen.getByText(KEY_FORMAT_MESSAGE)).toBeInTheDocument();
            expect(onSubmit).not.toHaveBeenCalled();
        });

        it("waits for a pending key generation and submits the generated key", async () => {
            const user = userEvent.setup();
            let resolveKey: (response: Response) => void = () => undefined;
            routeFetchWithAuth({
                [API_ENDPOINTS.SHORTLINKS_RANDOM]: () => new Promise<Response>((resolve) => { resolveKey = resolve; }),
            });
            const {onSubmit} = renderForm({autoGenerateKey: true, initialLongUrl: "https://example.com"});

            await user.click(getSubmitButton());
            resolveKey(Response.json({key: GENERATED_KEY}));

            await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("https://example.com", DEFAULT_LINK_TITLE, GENERATED_KEY, []));
        });

        it("shows the submitting label and disables both buttons while the request is pending", async () => {
            const user = userEvent.setup();
            let finishSubmit: () => void = () => undefined;
            renderForm({
                initialLongUrl: "https://example.com",
                initialKey: "k",
                onSubmit: () => new Promise<void>((resolve) => { finishSubmit = resolve; }),
            });

            await user.click(getSubmitButton());

            expect(await screen.findByRole("button", {name: new RegExp(SUBMITTING_LABEL)})).toBeDisabled();
            expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
            finishSubmit();
        });

        it("shows the conflict message under the key and re-enables the form when the key is taken", async () => {
            const user = userEvent.setup();
            renderForm({
                initialLongUrl: "https://example.com",
                initialKey: "k",
                onSubmit: async () => { throw new ShortKeyConflictError(); },
            });

            await user.click(getSubmitButton());

            expect(await screen.findByText(SHORT_KEY_TAKEN_MESSAGE)).toBeInTheDocument();
            expect(screen.getByRole("button", {name: "Cancel"})).toBeEnabled();
        });

        it("keeps the form usable when the submit handler fails for another reason", async () => {
            const user = userEvent.setup();
            renderForm({
                initialLongUrl: "https://example.com",
                initialKey: "k",
                onSubmit: async () => { throw new Error("boom"); },
            });

            await user.click(getSubmitButton());

            await waitFor(() => expect(getSubmitButton()).toBeEnabled());
            expect(screen.queryByText(SHORT_KEY_TAKEN_MESSAGE)).not.toBeInTheDocument();
        });

        it("cancels through the cancel button", async () => {
            const user = userEvent.setup();
            const {onCancel} = renderForm();

            await user.click(screen.getByRole("button", {name: "Cancel"}));

            expect(onCancel).toHaveBeenCalledOnce();
        });
    });

    describe("title suggestion", () => {
        it("fills the title suggested by the server for the destination URL", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.LONG_URL_TITLE]: () => Response.json({title: "  Server title  "})});
            renderForm({enableTitleSuggestion: true, initialLongUrl: "https://example.com/post"});

            await user.click(getSuggestTitleButton());

            await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Server title"));
            expect(getRequestsTo(`${API_ENDPOINTS.LONG_URL_TITLE}?url=${encodeURIComponent("https://example.com/post")}`)).toHaveLength(1);
        });

        it("derives the title from the hostname when the server has no title", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.LONG_URL_TITLE]: () => Response.json({title: "   "})});
            renderForm({enableTitleSuggestion: true, initialLongUrl: "https://my-shop.example.com/post"});

            await user.click(getSuggestTitleButton());

            await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("My Shop"));
        });

        it("derives the title from the hostname when the title request fails", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.LONG_URL_TITLE]: () => new Response(null, {status: 502})});
            renderForm({enableTitleSuggestion: true, initialLongUrl: "https://example.com"});

            await user.click(getSuggestTitleButton());

            await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Example"));
        });

        it("disables the suggestion button until there is a destination URL", () => {
            renderForm({enableTitleSuggestion: true});

            expect(getSuggestTitleButton()).toBeDisabled();
        });
    });

    describe("tag selection", () => {
        it("lists selected tags on the form and submits their ids on desktop", async () => {
            const user = userEvent.setup();
            const tag = createTag({id: "tag-9", name: "Launch"});
            useTagStoreWithoutCount.setState({tags: [tag]});
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com", initialKey: "k", initialTagIds: [tag.id]});

            expect(screen.getByText(tag.name)).toBeInTheDocument();
            await user.click(getSubmitButton());

            expect(onSubmit).toHaveBeenCalledWith("https://example.com", DEFAULT_LINK_TITLE, "k", [tag.id]);
        });

        it("selects tags on a dedicated screen and returns to the form on mobile", async () => {
            media.isDesktop = false;
            const user = userEvent.setup();
            const tag = createTag({id: "tag-2", name: "Promo"});
            useTagStoreWithoutCount.setState({tags: [tag]});
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com", initialKey: "k"});

            await user.click(screen.getByRole("button", {name: "Select tags"}));
            await user.click(await screen.findByRole("button", {name: tag.name}));
            await user.click(screen.getByRole("button", {name: "Back to form"}));
            await user.click(await screen.findByRole("button", {name: SUBMIT_LABEL}));

            expect(onSubmit).toHaveBeenCalledWith("https://example.com", DEFAULT_LINK_TITLE, "k", [tag.id]);
        });

        it("creates a tag from the search text and selects it on mobile", async () => {
            media.isDesktop = false;
            const user = userEvent.setup();
            const createdTag = createTag({id: "tag-new", name: "Fresh"});
            routeFetchWithAuth({[API_ENDPOINTS.TAGS]: () => Response.json(createdTag)});
            const {onSubmit} = renderForm({initialLongUrl: "https://example.com", initialKey: "k"});

            await user.click(screen.getByRole("button", {name: "Select tags"}));
            await user.type(await screen.findByPlaceholderText("Search or create tags..."), "Fresh");
            await user.click(screen.getByRole("button", {name: /Create tag/}));
            await user.click(await screen.findByRole("button", {name: "Create"}));

            expect(onSubmit).toHaveBeenCalledWith("https://example.com", DEFAULT_LINK_TITLE, "k", [createdTag.id]);
        });

        it("reports a failed tag creation on mobile", async () => {
            media.isDesktop = false;
            const user = userEvent.setup();
            routeFetchWithAuth({[API_ENDPOINTS.TAGS]: () => new Response("Tag exists", {status: 409})});
            renderForm();

            await user.click(screen.getByRole("button", {name: "Select tags"}));
            await user.type(await screen.findByPlaceholderText("Search or create tags..."), "Dup");
            await user.click(screen.getByRole("button", {name: /Create tag/}));

            expect(await screen.findByText("Failed to create tag")).toBeInTheDocument();
        });
    });

    describe("tracker cleaning", () => {
        const TRACKED_URL = "https://example.com/page?utm_source=news";
        const CLEAN_URL = "https://example.com/page";

        function mockCleaner(): void {
            routeFetchWithAuth({
                [API_ENDPOINTS.USERS_ME_PREFERENCES]: mockPreferences(TRACKER_MODE.SUGGEST),
                [API_ENDPOINTS.URL_CLEANER]: () => Response.json({url: CLEAN_URL, removedParams: ["utm_source"], completeProviderSkipped: false}),
            });
        }

        it("suggests removing detected trackers and cleans the URL on request", async () => {
            const user = userEvent.setup();
            mockCleaner();
            renderForm({enableUrlCleaner: true});

            await user.type(getUrlInput(), TRACKED_URL);
            await user.click(await screen.findByRole("button", {name: "Clean trackers from URL"}));

            expect(getUrlInput()).toHaveValue(CLEAN_URL);
            expect(screen.getByText("1 tracker removed")).toBeInTheDocument();
        });

        it("lets the user keep a tracker while reviewing", async () => {
            const user = userEvent.setup();
            mockCleaner();
            renderForm({enableUrlCleaner: true});
            await user.type(getUrlInput(), TRACKED_URL);

            await user.click(await screen.findByRole("button", {name: "Review trackers"}));
            await user.click(await screen.findByRole("button", {name: /tracker utm_source=news/}));
            await user.click(screen.getByRole("button", {name: "Apply"}));

            await waitFor(() => expect(getUrlInput()).toHaveValue(TRACKED_URL));
            expect(screen.queryByText(/tracker removed/)).not.toBeInTheDocument();
        });

        it("removes trackers from the URL automatically in auto-clean mode", async () => {
            const user = userEvent.setup();
            routeFetchWithAuth({
                [API_ENDPOINTS.USERS_ME_PREFERENCES]: mockPreferences(TRACKER_MODE.AUTO_CLEAN),
                [API_ENDPOINTS.URL_CLEANER]: () => Response.json({url: CLEAN_URL, removedParams: ["utm_source"], completeProviderSkipped: false}),
            });
            renderForm({enableUrlCleaner: true});

            await user.type(getUrlInput(), TRACKED_URL);

            await waitFor(() => expect(getUrlInput()).toHaveValue(CLEAN_URL));
            expect(screen.getByText("1 tracker removed")).toBeInTheDocument();
        });

        it("never calls the cleaner when trackers are disabled", async () => {
            vi.useFakeTimers({shouldAdvanceTime: true});
            const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
            routeFetchWithAuth({[API_ENDPOINTS.USERS_ME_PREFERENCES]: mockPreferences(TRACKER_MODE.DISABLED)});
            renderForm({enableUrlCleaner: true});

            await user.type(getUrlInput(), TRACKED_URL);
            await user.tab();
            await vi.advanceTimersByTimeAsync(URL_CLEANER_DEBOUNCE_MS);

            expect(vi.mocked(fetchWithAuth).mock.calls.some(([endpoint]) => endpoint === API_ENDPOINTS.URL_CLEANER)).toBe(false);
            expect(screen.queryByText(/trackers? detected/)).not.toBeInTheDocument();
        });
    });
});
