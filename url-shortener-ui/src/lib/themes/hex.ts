const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
    return HEX_PATTERN.test(value.trim());
}

export function normalizeHex(value: string): string | null {
    const trimmed = value.trim();
    if (!isValidHex(trimmed)) {
        return null;
    }
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
        return `#${hex.split("").map((char) => char + char).join("")}`.toLowerCase();
    }
    return `#${hex}`.toLowerCase();
}
