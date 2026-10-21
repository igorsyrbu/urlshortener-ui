/** Markup that is already safe to insert: produced by `html` or by `rawHtml` for trusted constants. */
export class SafeHtml {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** For trusted, constant markup only (the stylesheet); every other value goes through `html`. */
export function rawHtml(value: string): SafeHtml {
  return new SafeHtml(value);
}

function renderValue(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (value === undefined || value === null || value === false) return "";
  return escapeHtml(String(value));
}

/** Template tag that escapes every interpolated value, so a new field cannot turn into an injection. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  return new SafeHtml(strings.reduce((markup, part, index) => markup + renderValue(values[index - 1]) + part));
}
