import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {TagBadge} from "@/components/tags/TagBadge";
import {createTag} from "@/test/tag-utils";

describe("TagBadge", () => {
    it("shows the tag name and exposes it as a tooltip for truncated names", () => {
        const longName = "a".repeat(200);

        render(<TagBadge tag={createTag({name: longName})}/>);

        expect(screen.getByTitle(longName)).toHaveTextContent(longName);
    });

    it("renders children after the name", () => {
        render(
            <TagBadge tag={createTag({name: "Sales"})}>
                <button type="button">Remove Sales</button>
            </TagBadge>,
        );

        expect(screen.getByRole("button", {name: "Remove Sales"})).toBeInTheDocument();
    });

    it("hides the icon when showIcon is false", () => {
        const {container: withIcon} = render(<TagBadge tag={createTag()}/>);
        const {container: withoutIcon} = render(<TagBadge tag={createTag()} showIcon={false}/>);

        expect(withIcon.querySelector("svg")).not.toBeNull();
        expect(withoutIcon.querySelector("svg")).toBeNull();
    });
});
