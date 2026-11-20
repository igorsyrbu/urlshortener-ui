import {describe, expect, it} from "vitest";
import {
    formatBulkActionConfirmLabel,
    formatBulkActionDone,
    formatBulkActionTitle,
    formatBulkDeletePhrase,
    formatLinkCount,
    getArchiveBulkAction,
    getSuspendBulkAction,
} from "@/lib/bulk-link-actions";
import {createLinkItem} from "@/test/link-utils";

const ACTIVE = createLinkItem({id: "a"});
const ARCHIVED = createLinkItem({id: "b", isActive: false});
const SUSPENDED = createLinkItem({id: "c", isSuspended: true});

describe("bulk link actions", () => {
    it.each([
        [[ARCHIVED], "unarchive"],
        [[ARCHIVED, ACTIVE], "archive"],
        [[ACTIVE], "archive"],
        [[], "archive"],
    ] as const)("archives unless every selected link is archived (%#)", (links, expected) => {
        expect(getArchiveBulkAction(links)).toBe(expected);
    });

    it.each([
        [[SUSPENDED], "resume"],
        [[SUSPENDED, ACTIVE], "suspend"],
        [[], "suspend"],
    ] as const)("suspends unless every selected link is suspended (%#)", (links, expected) => {
        expect(getSuspendBulkAction(links)).toBe(expected);
    });

    it("words the dialog, the toast and the delete phrase for one and for many links", () => {
        expect(formatLinkCount(1)).toBe("1 link");
        expect(formatBulkActionTitle("archive", 4)).toBe("Archive 4 links?");
        expect(formatBulkActionConfirmLabel("resume", 1)).toBe("Resume link");
        expect(formatBulkActionDone("delete", 1)).toBe("1 link deleted");
        expect(formatBulkActionDone("unarchive", 3)).toBe("3 links restored");
        expect(formatBulkDeletePhrase(4)).toBe("delete 4 links");
    });
});
