/** True for `prefix` itself and every path under it (`/settings/billing/`, `/settings/billing/x`), never for `/settings/billings`. */
export function isPathWithin(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
