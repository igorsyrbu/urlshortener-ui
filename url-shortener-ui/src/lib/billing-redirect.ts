export function redirectToBillingUrl(url: string): void {
    window.location.assign(url);
}

export function openBillingUrlInNewTab(url: string): void {
    const opened = window.open(url, "_blank");
    if (opened) opened.opener = null;
    else window.location.assign(url);
}
