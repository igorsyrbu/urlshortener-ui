/** input-otp re-syncs its caret on 0, 10 and 50 ms timers it never clears; this outlasts the last one. */
const INPUT_OTP_SYNC_TIMERS_MS = 60;

/**
 * For `afterAll` in a test file that renders an OTP input: a sync timer still pending when the file's jsdom closes
 * calls React without a `window` and fails the run, although every test passed.
 */
export function waitForInputOtpTimers(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, INPUT_OTP_SYNC_TIMERS_MS));
}
