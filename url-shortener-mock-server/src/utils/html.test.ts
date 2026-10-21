import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, html, rawHtml } from "./html";

describe("html", () => {
  it("escapes every interpolated string", () => {
    const hostile = `"><script>alert('x')</script>`;
    assert.equal(html`<a href="${hostile}">${hostile}</a>`.value,
      `<a href="&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;">&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</a>`);
  });

  it("inserts nested html and trusted raw markup unescaped", () => {
    const inner = html`<b>${"<i>"}</b>`;
    assert.equal(html`<p>${inner}${rawHtml("<hr>")}</p>`.value, "<p><b>&lt;i&gt;</b><hr></p>");
  });

  it("joins lists and drops empty values", () => {
    assert.equal(html`${["a", html`<br>`, "<"]}${undefined}${null}${false}${0}`.value, "a<br>&lt;0");
  });

  it("escapes all five special characters", () => {
    assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  });
});
