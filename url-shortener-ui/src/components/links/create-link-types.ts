export type GlowState = "idle" | "loading" | "filled";

/**
 * What the link form hands to its modal on submit. `password` is `null` when protection is off; `description` is
 * trimmed, and `null` when empty.
 */
export type LinkFormSubmit = (longUrl: string, title: string, key: string, tagIds: string[], password: string | null,
                              description: string | null) => Promise<void>;
