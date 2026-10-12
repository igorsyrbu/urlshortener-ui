import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {MagicLinkCooldownMessage} from "@/components/auth/MagicLinkCooldownMessage";

describe("MagicLinkCooldownMessage", () => {
    it.each([
        {seconds: 0, formatted: "0:00"},
        {seconds: 5, formatted: "0:05"},
        {seconds: 59, formatted: "0:59"},
        {seconds: 60, formatted: "1:00"},
        {seconds: 61, formatted: "1:01"},
        {seconds: 600, formatted: "10:00"},
    ])("shows $seconds seconds as $formatted", ({seconds, formatted}) => {
        render(<MagicLinkCooldownMessage remainingSeconds={seconds}/>);

        expect(screen.getByText(formatted)).toBeInTheDocument();
    });
});
