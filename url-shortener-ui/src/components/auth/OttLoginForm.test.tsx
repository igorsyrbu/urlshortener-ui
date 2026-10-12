import {render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import {OttLoginForm} from "@/components/auth/OttLoginForm";
import {API_BASE_URL} from "@/lib/api";

function stubFormSubmission(): Mock {
    const requestSubmit = vi.fn();
    vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(requestSubmit);
    return requestSubmit;
}

function renderedFields(container: HTMLElement): Record<string, string> {
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type='hidden']");
    return Object.fromEntries([...inputs].map((input) => [input.name, input.value]));
}

describe("OttLoginForm", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("posts the token login to the OTT endpoint", () => {
        const {container} = render(<OttLoginForm loginType="token" token="tok" email="user@example.com"/>);

        const form = container.querySelector("form");
        expect(form).toHaveAttribute("action", `${API_BASE_URL}/ott/login`);
        expect(form).toHaveAttribute("method", "POST");
        expect(renderedFields(container)).toEqual({loginType: "token", token: "tok", email: "user@example.com"});
    });

    it("posts the email and code for an otp login", () => {
        const {container} = render(<OttLoginForm loginType="otp" email="user@example.com" code="AB12CD"/>);

        expect(renderedFields(container)).toEqual({loginType: "otp", email: "user@example.com", code: "AB12CD"});
    });

    it("submits automatically once a token login has token and email", () => {
        const requestSubmit = stubFormSubmission();
        render(<OttLoginForm loginType="token" token="tok" email="user@example.com"/>);

        vi.runAllTimers();

        expect(requestSubmit).toHaveBeenCalledOnce();
    });

    it("submits automatically once an otp login has email and code", () => {
        const requestSubmit = stubFormSubmission();
        render(<OttLoginForm loginType="otp" email="user@example.com" code="AB12CD"/>);

        vi.runAllTimers();

        expect(requestSubmit).toHaveBeenCalledOnce();
    });

    it.each([
        {name: "token login without a token", props: {loginType: "token", email: "user@example.com"} as const},
        {name: "token login without an email", props: {loginType: "token", token: "tok"} as const},
        {name: "otp login without a code", props: {loginType: "otp", email: "user@example.com"} as const},
        {name: "otp login without an email", props: {loginType: "otp", code: "AB12CD"} as const},
    ])("does not submit a $name", ({props}) => {
        const requestSubmit = stubFormSubmission();
        render(<OttLoginForm {...props}/>);

        vi.runAllTimers();

        expect(requestSubmit).not.toHaveBeenCalled();
    });

    it("does not submit when unmounted before the scheduled submission", () => {
        const requestSubmit = stubFormSubmission();
        const {unmount} = render(<OttLoginForm loginType="token" token="tok" email="user@example.com"/>);

        unmount();
        vi.runAllTimers();

        expect(requestSubmit).not.toHaveBeenCalled();
    });

    it("submits only once when props change after the submission", () => {
        const requestSubmit = stubFormSubmission();
        const {rerender} = render(<OttLoginForm loginType="token" token="tok" email="user@example.com"/>);
        vi.runAllTimers();

        rerender(<OttLoginForm loginType="token" token="tok2" email="user@example.com"/>);
        vi.runAllTimers();

        expect(requestSubmit).toHaveBeenCalledOnce();
    });
});
