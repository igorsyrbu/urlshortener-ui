import {
    GENERATED_LINK_PASSWORD_LENGTH,
    LINK_PASSWORD_COPY,
    LINK_PASSWORD_MAX_LENGTH,
    LINK_PASSWORD_MIN_LENGTH,
} from "@/lib/constants";

const PASSWORD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const BYTE_VALUES = 256;
// Bytes at or above this would make the first letters of the alphabet more likely than the rest.
const UNBIASED_BYTE_LIMIT = BYTE_VALUES - (BYTE_VALUES % PASSWORD_ALPHABET.length);

/** The backend's rule: 5 to 50 characters, counted as typed (case-sensitive, never trimmed). */
export function getLinkPasswordError(password: string): string | null {
    const isLengthValid = password.length >= LINK_PASSWORD_MIN_LENGTH && password.length <= LINK_PASSWORD_MAX_LENGTH;
    return isLengthValid ? null : LINK_PASSWORD_COPY.LENGTH_ERROR;
}

/** A random letters-and-digits password (`ZwVlsXN4vFW7re4qXT9Zg3jW`), drawn from the browser's secure random source. */
export function generateLinkPassword(length: number = GENERATED_LINK_PASSWORD_LENGTH): string {
    let password = "";
    while (password.length < length) {
        for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
            if (byte < UNBIASED_BYTE_LIMIT && password.length < length) password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
        }
    }
    return password;
}
