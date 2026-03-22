import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, X, Plus, Check,
  ChevronsUpDown, Search, Users, Building2
} from "lucide-react";

/* ═══ TURAN TOKENS v11 ═══ */
const tokens = `
:root {
  --bg:#1a1612;--bg-s:#211d18;--bg-c:#272219;--bg-m:#332d24;
  --fg:#e8e0d4;--fg2:#a69a8c;--fg3:#6b6054;
  --bd:#3a3328;--bd-s:#2d271e;--bd-h:#4d4436;
  --accent:#F0A020;--cta:#e8e0d4;--cta-fg:#1a1612;--cta-h:#f0ebe2;
  --blue:#6b9fe0;--blue-m:rgba(107,159,224,0.08);
  --green:#5ec47a;--amber:#f0b040;--red:#e06050;
  --mono:'JetBrains Mono',monospace;
  --ease:cubic-bezier(.16,1,.3,1);
}
[data-theme="light"]{
  --bg:#f0ebe2;--bg-s:#e9e3d8;--bg-c:#f7f4ee;--bg-m:#e3ddd2;
  --fg:#3d2b1f;--fg2:#7a6b5d;--fg3:#a69a8c;
  --bd:#d9d1c5;--bd-s:#e6e0d6;--bd-h:#c4baa8;
  --accent:#E8920B;--cta:#3d2b1f;--cta-fg:#faf8f4;--cta-h:#2c1e14;
  --blue:#4571b8;--blue-m:rgba(69,113,184,0.07);
  --green:#3a8a52;--amber:#b37a10;--red:#c0392b;
}
`;

export default function App() {
  const [theme, setTheme] = useState("dark");
  return (
    <div data-theme={theme} style={{
      background: "var(--bg)", color: "var(--fg)", minHeight: "100vh",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      fontSize: 13, lineHeight: 1.5, WebkitFontSmoothing: "antialiased",
      padding: "32px 48px",
    }}>
      <style>{tokens}{css}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>AgOS Component Library — Tier 1</h1>
          <p style={{ fontSize: 13, color: "var(--fg2)" }}>DatePicker, Combobox, MultiCombobox, Sheet</p>
        </div>
        <button className="tog-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 960 }}>
        <Sec title="DatePicker" desc="Calendar dropdown with keyboard nav, today marker, clear.">
          <DatePickerDemo />
        </Sec>
        <Sec title="Combobox — Single" desc="Search + select, with create-new option.">
          <ComboboxDemo />
        </Sec>
        <Sec title="MultiCombobox" desc="Tag-based multi-select. Backspace to remove last.">
          <MultiComboboxDemo />
        </Sec>
        <Sec title="Sheet / Slide-over" desc="Side panel with sizes SM/MD/LG/XL. Focus trap.">
          <SheetDemo />
        </Sec>
      </div>
    </div>
  );
}

function Sec({ title, desc, children }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</h2>
        <p style={{ fontSize: 12, color: "var(--fg3)" }}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. DATEPICKER
   Calendar grid, keyboard nav, today, clear, month nav
═══════════════════════════════════════════════════════════════ */

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function DatePicker({ value, onChange, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setView(value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  }, [open]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fmt = value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}` : null;

  const getDays = () => {
    if (!view) return [];
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    let start = first.getDay() - 1; if (start < 0) start = 6;
    const days = [];
    for (let i = start - 1; i >= 0; i--) days.push({ d: new Date(view.getFullYear(), view.getMonth(), -i), out: true });
    for (let i = 1; i <= last.getDate(); i++) days.push({ d: new Date(view.getFullYear(), view.getMonth(), i), out: false });
    while (days.length < 42) days.push({ d: new Date(view.getFullYear(), view.getMonth() + 1, days.length - last.getDate() - start + 1), out: true });
    return days;
  };

  const isSame = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button className="dp-trigger" onClick={() => setOpen(!open)}>
        <Calendar size={14} style={{ color: "var(--fg3)" }} />
        <span style={{ flex: 1, textAlign: "left", color: fmt ? "var(--fg)" : "var(--fg3)" }}>{fmt || placeholder}</span>
        {value && <span className="dp-clear" onClick={e => { e.stopPropagation(); onChange(null); }}><X size={12} /></span>}
      </button>

      {open && view && (
        <div className="dp-drop">
          {/* Month nav */}
          <div className="dp-hdr">
            <button className="dp-nav" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}><ChevronLeft size={14} /></button>
            <span className="dp-month">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button className="dp-nav" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}><ChevronRight size={14} /></button>
          </div>
          {/* Day labels */}
          <div className="dp-grid">
            {DAYS.map(d => <div key={d} className="dp-label">{d}</div>)}
            {getDays().map((day, i) => {
              const sel = isSame(day.d, value);
              const tod = isSame(day.d, today);
              return (
                <button key={i} className={`dp-cell${day.out ? " dp-out" : ""}${sel ? " dp-sel" : ""}${tod && !sel ? " dp-today" : ""}`}
                  onClick={() => { onChange(day.d); setOpen(false); }}>
                  {day.d.getDate()}
                </button>
              );
            })}
          </div>
          {/* Footer */}
          <div className="dp-foot">
            <button className="dp-today-btn" onClick={() => { onChange(today); setOpen(false); }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DatePickerDemo() {
  const [val, setVal] = useState(null);
  return (
    <div className="demo-card">
      <label className="field-label">Close date</label>
      <DatePicker value={val} onChange={setVal} placeholder="Pick a date" />
      <p className="demo-hint" style={{ marginTop: 8 }}>Click to open. Arrow keys to navigate. Esc to close.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. COMBOBOX — Single select with search
═══════════════════════════════════════════════════════════════ */

function Combobox({ options, value, onChange, placeholder = "Select…", allowCreate = false, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (open) { setQ(""); inputRef.current?.focus(); } }, [open]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = options.find(o => o.value === value);
  const showCreate = allowCreate && q && !filtered.some(o => o.label.toLowerCase() === q.toLowerCase());

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="cb-trigger" onClick={() => setOpen(!open)}>
        {Icon && <Icon size={14} style={{ color: "var(--fg3)" }} />}
        <span style={{ flex: 1, textAlign: "left", color: selected ? "var(--fg)" : "var(--fg3)" }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown size={14} style={{ color: "var(--fg3)" }} />
      </button>

      {open && (
        <div className="cb-drop">
          <div className="cb-search-wrap">
            <Search size={13} style={{ color: "var(--fg3)" }} />
            <input ref={inputRef} className="cb-search" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…" />
          </div>
          <div className="cb-list">
            {filtered.map(o => (
              <button key={o.value} className={`cb-opt${value === o.value ? " cb-opt-on" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); }}>
                {o.dot && <span className="cb-dot" style={{ background: o.dot }} />}
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.sub && <span style={{ fontSize: 11, color: "var(--fg3)" }}>{o.sub}</span>}
                {value === o.value && <Check size={14} style={{ color: "var(--blue)" }} />}
              </button>
            ))}
            {showCreate && (
              <button className="cb-opt cb-create" onClick={() => { onChange(q); setOpen(false); }}>
                <Plus size={14} /><span>Create "{q}"</span>
              </button>
            )}
            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--fg3)", textAlign: "center" }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ComboboxDemo() {
  const [val, setVal] = useState("acme");
  const opts = [
    { value: "acme", label: "Acme Corp", sub: "Enterprise", dot: "var(--green)" },
    { value: "tech", label: "TechFlow Inc", sub: "SMB", dot: "var(--blue)" },
    { value: "nova", label: "Nova Capital", sub: "Enterprise", dot: "var(--amber)" },
    { value: "orion", label: "Orion Systems", sub: "Mid-market", dot: "var(--fg3)" },
  ];
  return (
    <div className="demo-card">
      <label className="field-label">Company</label>
      <Combobox options={opts} value={val} onChange={setVal} icon={Building2} placeholder="Select company…" allowCreate />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. MULTI COMBOBOX — Tag-based multi-select
═══════════════════════════════════════════════════════════════ */

function MultiCombobox({ options, value = [], onChange, placeholder = "Select…", allowCreate = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const remove = (v) => onChange(value.filter(x => x !== v));

  const onKey = e => {
    if (e.key === "Backspace" && !q && value.length > 0) remove(value[value.length - 1]);
  };

  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const showCreate = allowCreate && q && !options.some(o => o.label.toLowerCase() === q.toLowerCase());

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="mcb-trigger" onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        <div className="mcb-tags">
          {value.map(v => {
            const opt = options.find(o => o.value === v);
            return opt && (
              <span key={v} className="mcb-tag">
                {opt.dot && <span className="cb-dot" style={{ background: opt.dot }} />}
                {opt.label}
                <span className="mcb-tag-x" onClick={e => { e.stopPropagation(); remove(v); }}><X size={10} /></span>
              </span>
            );
          })}
          <input ref={inputRef} className="mcb-input" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={onKey} onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : ""} />
        </div>
        <ChevronsUpDown size={14} style={{ color: "var(--fg3)", flexShrink: 0 }} />
      </div>

      {open && (
        <div className="cb-drop">
          <div className="cb-list">
            {filtered.map(o => (
              <button key={o.value} className={`cb-opt${value.includes(o.value) ? " cb-opt-on" : ""}`}
                onClick={() => { toggle(o.value); setQ(""); }}>
                <span className="mcb-ck" style={{ borderColor: value.includes(o.value) ? "var(--blue)" : "var(--bd)", background: value.includes(o.value) ? "var(--blue)" : "transparent" }}>
                  {value.includes(o.value) && <Check size={10} strokeWidth={3} style={{ color: "#fff" }} />}
                </span>
                {o.dot && <span className="cb-dot" style={{ background: o.dot }} />}
                <span style={{ flex: 1 }}>{o.label}</span>
              </button>
            ))}
            {showCreate && (
              <button className="cb-opt cb-create" onClick={() => { onChange([...value, q]); setQ(""); }}>
                <Plus size={14} /><span>Create "{q}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiComboboxDemo() {
  const [val, setVal] = useState(["ent", "crm"]);
  const opts = [
    { value: "ent", label: "Enterprise", dot: "var(--blue)" },
    { value: "crm", label: "CRM", dot: "var(--green)" },
    { value: "saas", label: "SaaS", dot: "var(--amber)" },
    { value: "ai", label: "AI/ML", dot: "var(--red)" },
    { value: "fin", label: "FinTech", dot: "var(--fg3)" },
  ];
  return (
    <div className="demo-card">
      <label className="field-label">Tags</label>
      <MultiCombobox options={opts} value={val} onChange={setVal} allowCreate placeholder="Add tags…" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. SHEET — Slide-over panel
═══════════════════════════════════════════════════════════════ */

function Sheet({ open, onClose, title, desc, size = "md", children, footer }) {
  const widths = { sm: 400, md: 520, lg: 680, xl: 860 };
  const w = widths[size] || 520;

  useEffect(() => {
    if (open) {
      const h = e => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-ov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-box" style={{ width: w }}>
        <div className="sheet-hdr">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: "var(--fg2)", marginTop: 2 }}>{desc}</div>}
          </div>
          <button className="ic-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState("md");
  return (
    <div className="demo-card">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["sm", "md", "lg", "xl"].map(s => (
          <button key={s} className={`sz-btn${size === s ? " sz-on" : ""}`} onClick={() => setSize(s)}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <button className="cta-btn" onClick={() => setOpen(true)}>Open {size.toUpperCase()} Sheet</button>
      <Sheet open={open} onClose={() => setOpen(false)} size={size}
        title="Create contact" desc="Add a new contact to your CRM."
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="sec-btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="cta-btn" onClick={() => setOpen(false)}>Save contact</button>
          </div>
        }>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {["Full name", "Email", "Company", "Phone"].map(f => (
            <div key={f}>
              <label className="field-label">{f}</label>
              <input className="field-input" placeholder={`Enter ${f.toLowerCase()}…`} />
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/* ═══ STYLES ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
*:focus-visible{outline:2px solid var(--bd-h);outline-offset:2px}
*:focus:not(:focus-visible){outline:none}
@keyframes sheetIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

.tog-btn{padding:6px 16px;border-radius:6px;background:var(--bg-m);border:1px solid var(--bd);color:var(--fg2);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}
.tog-btn:hover{border-color:var(--bd-h);color:var(--fg)}
.demo-card{background:var(--bg-s);border:1px solid var(--bd);border-radius:10px;padding:20px}
.demo-hint{font-size:11px;color:var(--fg3)}
.field-label{display:block;font-size:11px;font-weight:600;color:var(--fg2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px}

/* DatePicker */
.dp-trigger{display:flex;align-items:center;gap:8px;width:100%;max-width:280px;padding:8px 12px;border-radius:8px;background:var(--bg-c);border:1px solid var(--bd);color:var(--fg);font-size:13px;cursor:pointer;font-family:inherit;transition:border-color 80ms}
.dp-trigger:hover{border-color:var(--bd-h)}
.dp-clear{color:var(--fg3);cursor:pointer;display:grid;place-items:center}
.dp-clear:hover{color:var(--fg)}
.dp-drop{position:absolute;top:100%;left:0;margin-top:4px;width:280px;background:var(--bg-c);border:1px solid var(--bd);border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,0.3);z-index:50;animation:fadeIn 100ms}
.dp-hdr{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid var(--bd-s)}
.dp-nav{background:none;border:none;color:var(--fg2);cursor:pointer;width:28px;height:28px;border-radius:6px;display:grid;place-items:center;transition:all 80ms}
.dp-nav:hover{background:var(--bg-m);color:var(--fg)}
.dp-month{flex:1;text-align:center;font-size:13px;font-weight:600}
.dp-grid{display:grid;grid-template-columns:repeat(7,1fr);padding:4px 8px 8px}
.dp-label{font-size:10px;font-weight:600;color:var(--fg3);text-align:center;padding:6px 0}
.dp-cell{width:36px;height:32px;border-radius:6px;background:none;border:none;color:var(--fg);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;display:grid;place-items:center;transition:all 60ms;margin:0 auto}
.dp-cell:hover{background:var(--bg-m)}
.dp-out{opacity:0.3}
.dp-sel{background:var(--cta) !important;color:var(--cta-fg) !important;font-weight:600}
.dp-today{box-shadow:inset 0 0 0 1.5px var(--bd-h)}
.dp-foot{display:flex;justify-content:center;padding:8px;border-top:1px solid var(--bd-s)}
.dp-today-btn{background:none;border:1px solid var(--bd);color:var(--fg2);font-size:11px;font-weight:500;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:inherit}
.dp-today-btn:hover{border-color:var(--bd-h);color:var(--fg)}

/* Combobox */
.cb-trigger{display:flex;align-items:center;gap:8px;width:100%;max-width:280px;padding:8px 12px;border-radius:8px;background:var(--bg-c);border:1px solid var(--bd);color:var(--fg);font-size:13px;cursor:pointer;font-family:inherit;transition:border-color 80ms}
.cb-trigger:hover{border-color:var(--bd-h)}
.cb-drop{position:absolute;top:100%;left:0;right:0;margin-top:4px;background:var(--bg-c);border:1px solid var(--bd);border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,0.3);z-index:50;animation:fadeIn 100ms;overflow:hidden}
.cb-search-wrap{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--bd-s)}
.cb-search{flex:1;background:none;border:none;color:var(--fg);font-size:13px;font-family:inherit;outline:none}
.cb-search::placeholder{color:var(--fg3)}
.cb-list{max-height:200px;overflow:auto;padding:4px}
.cb-opt{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border-radius:6px;background:none;border:none;color:var(--fg2);font-size:13px;cursor:pointer;font-family:inherit;text-align:left;transition:all 60ms}
.cb-opt:hover{background:var(--bg-m);color:var(--fg)}
.cb-opt-on{color:var(--fg);font-weight:500}
.cb-dot{width:6px;height:6px;border-radius:9999px;flex-shrink:0}
.cb-create{color:var(--accent);font-weight:500}

/* MultiCombobox */
.mcb-trigger{display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border-radius:8px;background:var(--bg-c);border:1px solid var(--bd);cursor:text;transition:border-color 80ms;min-height:38px}
.mcb-trigger:hover,.mcb-trigger:focus-within{border-color:var(--bd-h)}
.mcb-tags{display:flex;flex-wrap:wrap;gap:4px;flex:1;align-items:center}
.mcb-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;background:var(--bg-m);border:1px solid var(--bd);font-size:11px;font-weight:500;color:var(--fg)}
.mcb-tag-x{cursor:pointer;color:var(--fg3);display:grid;place-items:center;border-radius:2px;transition:color 80ms}
.mcb-tag-x:hover{color:var(--fg)}
.mcb-input{background:none;border:none;color:var(--fg);font-size:13px;font-family:inherit;outline:none;min-width:60px;flex:1;padding:2px 0}
.mcb-input::placeholder{color:var(--fg3)}
.mcb-ck{width:16px;height:16px;border-radius:4px;border:1.5px solid;display:grid;place-items:center;flex-shrink:0;transition:all 80ms}

/* Sheet */
.sheet-ov{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;justify-content:flex-end;animation:fadeIn 120ms}
.sheet-box{height:100%;background:var(--bg-c);border-left:1px solid var(--bd);display:flex;flex-direction:column;animation:sheetIn 250ms var(--ease)}
.sheet-hdr{display:flex;align-items:flex-start;gap:12px;padding:20px 24px;border-bottom:1px solid var(--bd)}
.sheet-body{flex:1;overflow:auto;padding:20px 24px}
.sheet-foot{padding:16px 24px;border-top:1px solid var(--bd);background:var(--bg-s)}
.ic-btn{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;background:none;border:none;color:var(--fg3);cursor:pointer;transition:all 80ms}
.ic-btn:hover{background:var(--bg-m);color:var(--fg)}

/* Buttons */
.cta-btn{padding:8px 16px;border-radius:6px;background:var(--cta);border:none;color:var(--cta-fg);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 100ms}
.cta-btn:hover{background:var(--cta-h)}
.sec-btn{padding:8px 16px;border-radius:6px;background:var(--bg-m);border:1px solid var(--bd);color:var(--fg2);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}
.sec-btn:hover{border-color:var(--bd-h);color:var(--fg)}
.sz-btn{padding:4px 10px;border-radius:5px;background:none;border:1px solid var(--bd);color:var(--fg3);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit}
.sz-btn:hover{border-color:var(--bd-h);color:var(--fg)}
.sz-on{background:var(--bg-m);border-color:var(--bd-h);color:var(--fg);font-weight:600}

/* Form */
.field-input{width:100%;padding:8px 12px;border-radius:6px;background:var(--bg);border:1px solid var(--bd);color:var(--fg);font-size:13px;font-family:inherit;outline:none;transition:border-color 80ms}
.field-input:focus{border-color:var(--bd-h);box-shadow:0 0 0 3px rgba(61,43,31,0.06)}
.field-input::placeholder{color:var(--fg3)}

::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--fg3)}
`;
