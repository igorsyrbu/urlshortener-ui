/** Dark, minimal styling for the mock hosted checkout and portal pages (inline, so the pages need no assets). */
export const BILLING_PAGE_STYLES = `
:root {
  color-scheme: dark;
  --bg: #0b0b0d;
  --card: #141417;
  --card-hover: #1c1c20;
  --border: #26262b;
  --text: #f4f4f5;
  --muted: #a1a1aa;
  --subtle: #71717a;
  --accent: #3b82f6;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.topbar { border-bottom: 1px solid var(--border); }
.topbar-inner, main { max-width: 640px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
.topbar-inner { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; padding-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.brand-mark { width: 22px; height: 22px; border-radius: 7px; background: linear-gradient(135deg, var(--accent), #8b5cf6); }
.pill { font-size: 12px; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; }
main { display: flex; flex-direction: column; gap: 20px; padding-top: 40px; padding-bottom: 64px; }
h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.015em; margin: 0; }
.lead, .muted { color: var(--muted); margin: 4px 0 0; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.card .muted { margin-top: 16px; }
.label { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: var(--subtle); margin: 0 0 12px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.plan { font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
.badge { font-size: 12px; font-weight: 500; border: 1px solid; border-radius: 999px; padding: 2px 10px; white-space: nowrap; }
.badge-success { color: var(--success); border-color: color-mix(in srgb, var(--success) 35%, transparent); background: color-mix(in srgb, var(--success) 10%, transparent); }
.badge-info { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.badge-warning { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 35%, transparent); background: color-mix(in srgb, var(--warning) 10%, transparent); }
.badge-danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 35%, transparent); background: color-mix(in srgb, var(--danger) 10%, transparent); }
.badge-neutral { color: var(--muted); border-color: var(--border); background: transparent; }
.details { display: grid; grid-template-columns: 1fr auto; gap: 12px 16px; margin: 20px 0 0; padding-top: 20px; border-top: 1px solid var(--border); }
.details dt { color: var(--muted); }
.details dd { margin: 0; text-align: right; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.actions form, .card > form.actions { margin: 0; }
.card > form.actions { margin-top: 20px; }
button, .button {
  font: inherit;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: background-color 120ms ease, border-color 120ms ease;
}
button:hover, .button:hover { background: var(--card-hover); }
button:focus-visible, .button:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
button.primary:hover { background: #d4d4d8; }
button.danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 35%, transparent); }
button.danger:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
.notice { margin: 0; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); color: #bfdbfe; border-radius: 12px; padding: 12px 16px; }
.sandbox summary { cursor: pointer; color: var(--muted); font-weight: 500; list-style: none; }
.sandbox summary::-webkit-details-marker { display: none; }
.sandbox summary { display: flex; align-items: center; gap: 10px; }
.sandbox summary::before {
  content: "";
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 120ms ease;
}
.sandbox[open] summary::before { transform: rotate(45deg); }
.sandbox form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; }
.sandbox label { color: var(--muted); width: 100%; }
select { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; }
.footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
`;
