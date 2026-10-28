// Lighthouse CI `puppeteerScript`: runs before the audits of each URL, in the Chrome that Lighthouse then uses.
// The app keeps its access token in memory and only the refresh cookie survives a reload, so one sign-in through the
// mock server's one-time code before each authenticated URL gives every cold load a returning user's view.
// The `module.exports` export name lets Lighthouse CI load this ES module through require().

const APP_URL = process.env.LHCI_APP_URL ?? "http://localhost:3095";
const AUTH_CODE = process.env.LHCI_AUTH_CODE ?? "mock-auth-code-2e40748f-cfaa-434f-96f5-b921f5c96c90";
const AUTHENTICATED_PATHS = ["/links", "/tags", "/analytics", "/settings"];
// Public, but the mock creates a user's seeded links only at sign-in, so on a fresh mock the inspected key does not exist yet.
const SEEDED_LINK_PATHS = ["/inspect"];
const LOGIN_REDIRECT_PATH = "/links";
const LOGIN_TIMEOUT_MS = 15_000;

function needsSignIn(url) {
    const {pathname} = new URL(url);
    return [...AUTHENTICATED_PATHS, ...SEEDED_LINK_PATHS].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function signIn(browser) {
    const page = await browser.newPage();
    try {
        await page.goto(`${APP_URL}/auth/exchange?code=${AUTH_CODE}`);
        await page.waitForFunction((expectedPath) => window.location.pathname === expectedPath, {timeout: LOGIN_TIMEOUT_MS}, LOGIN_REDIRECT_PATH);
    } finally {
        await page.close();
    }
}

export default async function login(browser, context) {
    if (!needsSignIn(context.url)) return;
    await signIn(browser);
}

export {login as "module.exports"};
