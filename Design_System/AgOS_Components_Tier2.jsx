import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight, ChevronLeft, X, Plus, Check,
  Upload, FileText, Image, File, Trash2,
  Loader2, AlertCircle, CheckCircle2,
  Calendar, Clock, ChevronDown
} from "lucide-react";

/* ═══ TOKENS ═══ */
const tokens = `
:root{--bg:#1a1612;--bg-s:#211d18;--bg-c:#272219;--bg-m:#332d24;--fg:#e8e0d4;--fg2:#a69a8c;--fg3:#6b6054;--bd:#3a3328;--bd-s:#2d271e;--bd-h:#4d4436;--cta:#e8e0d4;--cta-fg:#1a1612;--accent:#F0A020;--blue:#6b9fe0;--blue-h:#5a8fd0;--blue-m:rgba(107,159,224,0.08);--green:#5ec47a;--amber:#f0b040;--red:#e06050;--mono:'JetBrains Mono',monospace}
[data-theme="light"]{--bg:#f0ebe2;--bg-s:#e9e3d8;--bg-c:#f7f4ee;--bg-m:#e3ddd2;--fg:#3d2b1f;--fg2:#7a6b5d;--fg3:#a69a8c;--bd:#d9d1c5;--bd-s:#e6e0d6;--bd-h:#c4baa8;--cta:#3d2b1f;--cta-fg:#faf8f4;--accent:#E8920B;--blue:#4571b8;--blue-h:#3a60a0;--blue-m:rgba(69,113,184,0.07);--green:#3a8a52;--amber:#b37a10;--red:#c0392b}
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
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>AgOS Component Library — Tier 2</h1>
          <p style={{ fontSize: 13, color: "var(--fg2)" }}>Accordion, File Upload, Range Slider, Calendar</p>
        </div>
        <button className="tog-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 960 }}>
        <Sec title="Accordion — Single" desc="One section open at a time. For settings, FAQs.">
          <AccordionSingleDemo />
        </Sec>
        <Sec title="Accordion — Multiple" desc="Multiple sections open. For forms, detail panels.">
          <AccordionMultiDemo />
        </Sec>
        <Sec title="Slider — Single value" desc="Select a single point. For deal value, probability.">
          <SliderSingleDemo />
        </Sec>
        <Sec title="Slider — Range" desc="Min-max range. For filter ranges, budgets.">
          <SliderRangeDemo />
        </Sec>
      </div>

      <div style={{ marginTop: 32, maxWidth: 960 }}>
        <Sec title="File Upload" desc="Drag-and-drop zone with file list, progress, preview.">
          <FileUploadDemo />
        </Sec>
      </div>

      <div style={{ marginTop: 32, maxWidth: 960 }}>
        <Sec title="Calendar — Month view" desc="Event display, day selection, today marker. For scheduling, deal timelines.">
          <CalendarDemo />
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
   1. ACCORDION
   Animated expand/collapse, chevron rotation, keyboard nav,
   single-mode and multi-mode
═══════════════════════════════════════════════════════════════ */

function Accordion({ items, multiple = false, defaultOpen = [] }) {
  const [openIds, setOpenIds] = useState(new Set(defaultOpen));

  const toggle = (id) => {
    setOpenIds(prev => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="acc" role="region">
      {items.map((item, idx) => {
        const isOpen = openIds.has(item.id);
        return (
          <AccordionItem key={item.id} item={item} isOpen={isOpen}
            onToggle={() => toggle(item.id)}
            isFirst={idx === 0} isLast={idx === items.length - 1} />
        );
      })}
    </div>
  );
}

function AccordionItem({ item, isOpen, onToggle, isFirst, isLast }) {
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.scrollHeight);
  }, [isOpen, item.content]);

  return (
    <div className={`acc-item${isFirst ? " acc-first" : ""}${isLast ? " acc-last" : ""}`}>
      <button className="acc-trigger" onClick={onToggle}
        aria-expanded={isOpen} aria-controls={`acc-body-${item.id}`}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}>
        <ChevronRight size={14} strokeWidth={2} className="acc-chev" style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />
        <span className="acc-title">{item.title}</span>
        {item.badge && <span className="acc-badge">{item.badge}</span>}
      </button>
      <div id={`acc-body-${item.id}`} role="region" className="acc-body"
        style={{ maxHeight: isOpen ? height + 16 : 0 }}>
        <div ref={bodyRef} className="acc-content">
          {typeof item.content === "string" ? <p style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.6 }}>{item.content}</p> : item.content}
        </div>
      </div>
    </div>
  );
}

function AccordionSingleDemo() {
  const items = [
    { id: "general", title: "General settings", content: "Configure your workspace name, timezone, and default currency. These settings apply to all team members.", badge: "3" },
    { id: "notif", title: "Notifications", content: "Control email notifications, in-app alerts, and Slack integrations. Set quiet hours and notification grouping preferences." },
    { id: "security", title: "Security & access", content: "Manage two-factor authentication, session timeouts, IP allowlists, and API key rotation policies.", badge: "!" },
    { id: "billing", title: "Billing & plans", content: "View your current plan, update payment methods, download invoices, and manage seat allocation." },
  ];
  return (
    <div className="demo-card">
      <Accordion items={items} multiple={false} defaultOpen={["general"]} />
    </div>
  );
}

function AccordionMultiDemo() {
  const items = [
    { id: "contact", title: "Contact information", content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="acc-field"><span className="acc-fl">Name</span><span>Arman Kerimov</span></div>
        <div className="acc-field"><span className="acc-fl">Email</span><span style={{ color: "var(--blue)" }}>arman@acmecorp.com</span></div>
        <div className="acc-field"><span className="acc-fl">Phone</span><span>+1 (555) 012-3456</span></div>
      </div>
    )},
    { id: "company", title: "Company details", content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="acc-field"><span className="acc-fl">Company</span><span>Acme Corp</span></div>
        <div className="acc-field"><span className="acc-fl">Industry</span><span>Enterprise SaaS</span></div>
        <div className="acc-field"><span className="acc-fl">Size</span><span>500-1000</span></div>
      </div>
    )},
    { id: "deal", title: "Deal history", badge: "3", content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {["Enterprise License — $42K", "Support Plan — $8K", "Training — $12K"].map((d, i) => (
          <div key={i} style={{ fontSize: 12, padding: "8px 12px", background: "var(--bg-m)", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
            <span>{d.split(" — ")[0]}</span>
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg2)" }}>{d.split(" — ")[1]}</span>
          </div>
        ))}
      </div>
    )},
  ];
  return (
    <div className="demo-card">
      <Accordion items={items} multiple={true} defaultOpen={["contact", "deal"]} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. SLIDER — Single + Range
   Custom thumb, track fill, keyboard step, value label,
   snap to grid, formatted output
═══════════════════════════════════════════════════════════════ */

function Slider({ min = 0, max = 100, step = 1, value, onChange, format = v => v, label }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-wrap">
      {label && <div className="slider-label"><span>{label}</span><span className="slider-val">{format(value)}</span></div>}
      <div className="slider-track-wrap">
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <input type="range" className="slider-input" min={min} max={max} step={step}
          value={value} onChange={e => onChange(Number(e.target.value))}
          aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
          style={{ "--pct": `${pct}%` }} />
      </div>
      <div className="slider-bounds">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function RangeSlider({ min = 0, max = 100, step = 1, low, high, onLow, onHigh, format = v => v, label }) {
  const pctL = ((low - min) / (max - min)) * 100;
  const pctH = ((high - min) / (max - min)) * 100;

  const handleLow = v => { const n = Math.min(v, high - step); onLow(n); };
  const handleHigh = v => { const n = Math.max(v, low + step); onHigh(n); };

  return (
    <div className="slider-wrap">
      {label && <div className="slider-label"><span>{label}</span><span className="slider-val">{format(low)} — {format(high)}</span></div>}
      <div className="slider-track-wrap range">
        <div className="slider-track">
          <div className="slider-fill range-fill" style={{ left: `${pctL}%`, width: `${pctH - pctL}%` }} />
        </div>
        <input type="range" className="slider-input" min={min} max={max} step={step}
          value={low} onChange={e => handleLow(Number(e.target.value))}
          aria-label={`${label} minimum`} />
        <input type="range" className="slider-input" min={min} max={max} step={step}
          value={high} onChange={e => handleHigh(Number(e.target.value))}
          aria-label={`${label} maximum`} />
      </div>
      <div className="slider-bounds">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function SliderSingleDemo() {
  const [val, setVal] = useState(65);
  const [prob, setProb] = useState(40);
  return (
    <div className="demo-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Slider min={0} max={200000} step={5000} value={val * 1000} onChange={v => setVal(v / 1000)}
        format={v => `$${(v / 1000).toFixed(0)}K`} label="Deal value" />
      <Slider min={0} max={100} step={5} value={prob} onChange={setProb}
        format={v => `${v}%`} label="Win probability" />
    </div>
  );
}

function SliderRangeDemo() {
  const [lo, setLo] = useState(20000);
  const [hi, setHi] = useState(120000);
  return (
    <div className="demo-card">
      <RangeSlider min={0} max={200000} step={5000} low={lo} high={hi}
        onLow={setLo} onHigh={setHi}
        format={v => `$${(v / 1000).toFixed(0)}K`} label="Pipeline value range" />
      <p className="demo-hint" style={{ marginTop: 12 }}>
        Showing deals between {`$${(lo / 1000).toFixed(0)}K`} and {`$${(hi / 1000).toFixed(0)}K`}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. FILE UPLOAD
   Drag-and-drop zone, file list with icon/preview,
   progress simulation, delete, error state
═══════════════════════════════════════════════════════════════ */

const FILE_ICONS = { pdf: FileText, png: Image, jpg: Image, jpeg: Image, csv: File, xlsx: File };

function FileUpload({ accept, maxSize = 10, multiple = true, value = [], onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.name.split(".").pop().toLowerCase(),
      status: "uploading",
      progress: 0,
    }));
    onChange([...value, ...newFiles]);
    newFiles.forEach(nf => simulateUpload(nf.id, onChange, value, newFiles));
  };

  const simulateUpload = (id, onCh, prev, batch) => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 30 + 10;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        onCh(cur => cur.map(f => f.id === id ? { ...f, status: "done", progress: 100 } : f));
      } else {
        onCh(cur => cur.map(f => f.id === id ? { ...f, progress: Math.min(Math.round(p), 99) } : f));
      }
    }, 300 + Math.random() * 400);
  };

  const remove = (id) => onChange(value.filter(f => f.id !== id));

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const fmtSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div>
      {/* Drop zone */}
      <div className={`fup-zone${dragOver ? " fup-drag" : ""}`}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0} aria-label="Upload files"
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}>
        <input ref={inputRef} type="file" multiple={multiple} accept={accept}
          onChange={e => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ""; }}
          style={{ display: "none" }} />
        <div className="fup-icon"><Upload size={24} strokeWidth={1.5} /></div>
        <div className="fup-text">
          <span style={{ fontWeight: 500, color: "var(--fg)" }}>Drop files here</span> or <span style={{ color: "var(--blue)", fontWeight: 500, cursor: "pointer" }}>browse</span>
        </div>
        <div className="fup-hint">Max {maxSize}MB per file · PDF, CSV, PNG, JPG</div>
      </div>

      {/* File list */}
      {value.length > 0 && (
        <div className="fup-list">
          {value.map(f => {
            const Icon = FILE_ICONS[f.type] || File;
            return (
              <div key={f.id} className="fup-file">
                <div className="fup-file-icon"><Icon size={16} strokeWidth={1.7} /></div>
                <div className="fup-file-info">
                  <div className="fup-file-name">{f.name}</div>
                  <div className="fup-file-meta">
                    {f.size ? fmtSize(f.size) : ""}
                    {f.status === "uploading" && <span> · {f.progress}%</span>}
                    {f.status === "done" && <span style={{ color: "var(--green)" }}> · Uploaded</span>}
                    {f.status === "error" && <span style={{ color: "var(--red)" }}> · Failed</span>}
                  </div>
                  {f.status === "uploading" && (
                    <div className="fup-prog"><div className="fup-prog-fill" style={{ width: `${f.progress}%` }} /></div>
                  )}
                </div>
                <div className="fup-file-status">
                  {f.status === "uploading" && <Loader2 size={14} className="fup-spin" style={{ color: "var(--fg3)" }} />}
                  {f.status === "done" && <CheckCircle2 size={14} style={{ color: "var(--green)" }} />}
                  {f.status === "error" && <AlertCircle size={14} style={{ color: "var(--red)" }} />}
                </div>
                <button className="fup-del" onClick={() => remove(f.id)} aria-label={`Remove ${f.name}`}>
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FileUploadDemo() {
  const [files, setFiles] = useState([
    { id: "demo-1", name: "Q1-pipeline-report.pdf", size: 2456000, type: "pdf", status: "done", progress: 100 },
    { id: "demo-2", name: "contacts-export.csv", size: 890000, type: "csv", status: "done", progress: 100 },
  ]);
  return (
    <div className="demo-card">
      <FileUpload value={files} onChange={setFiles} accept=".pdf,.csv,.png,.jpg,.jpeg,.xlsx" maxSize={10} />
      <p className="demo-hint" style={{ marginTop: 12 }}>{files.length} file{files.length !== 1 ? "s" : ""}. Drag a file or click to browse. Progress simulated.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. CALENDAR — Month view
   Day grid, events, today marker, selection, month nav,
   mini event dots, click to expand
═══════════════════════════════════════════════════════════════ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENTS = [
  { date: "2026-03-20", title: "Discovery call — Acme", color: "var(--blue)", time: "10:00" },
  { date: "2026-03-20", title: "Pipeline review", color: "var(--amber)", time: "14:00" },
  { date: "2026-03-22", title: "Demo — TechFlow", color: "var(--green)", time: "11:00" },
  { date: "2026-03-25", title: "Contract review", color: "var(--red)", time: "09:00" },
  { date: "2026-03-25", title: "Team standup", color: "var(--blue)", time: "09:30" },
  { date: "2026-03-25", title: "Quarterly forecast", color: "var(--amber)", time: "15:00" },
  { date: "2026-03-28", title: "Close deal — Orion", color: "var(--green)", time: "16:00" },
  { date: "2026-04-02", title: "New quarter kickoff", color: "var(--blue)", time: "10:00" },
  { date: "2026-04-05", title: "Onboarding — Nova", color: "var(--green)", time: "13:00" },
];

function getCalDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
  const days = [];
  for (let i = startDay - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), outside: true });
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(year, month, i), outside: false });
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - last.getDate() - startDay + 1);
    days.push({ date: d, outside: true });
  }
  return days;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSame(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarMonth({ events = EVENTS }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(null);

  const days = getCalDays(viewDate.getFullYear(), viewDate.getMonth());
  const prev = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); };

  const evMap = {};
  events.forEach(ev => { if (!evMap[ev.date]) evMap[ev.date] = []; evMap[ev.date].push(ev); });

  const selEvents = selected ? (evMap[fmtDate(selected)] || []) : [];

  return (
    <div className="cal">
      {/* Header */}
      <div className="cal-hdr">
        <button className="cal-nav" onClick={prev} aria-label="Previous month"><ChevronLeft size={16} strokeWidth={2} /></button>
        <span className="cal-month">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button className="cal-nav" onClick={next} aria-label="Next month"><ChevronRight size={16} strokeWidth={2} /></button>
        <button className="cal-today" onClick={goToday}>Today</button>
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
        {days.map((d, i) => {
          const key = fmtDate(d.date);
          const dayEvents = evMap[key] || [];
          const isToday = isSame(d.date, today);
          const isSel = isSame(d.date, selected);
          return (
            <button key={i} className={`cal-cell${d.outside ? " cal-out" : ""}${isToday ? " cal-today-cell" : ""}${isSel ? " cal-sel" : ""}`}
              onClick={() => setSelected(d.date)} aria-label={`${d.date.getDate()} ${MONTHS[d.date.getMonth()]}`}>
              <span className={`cal-num${isToday ? " cal-num-today" : ""}`}>{d.date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="cal-dots">
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <span key={ei} className="cal-ev-dot" style={{ background: ev.color }} />
                  ))}
                  {dayEvents.length > 3 && <span className="cal-ev-more">+{dayEvents.length - 3}</span>}
                </div>
              )}
              {dayEvents.length > 0 && !d.outside && (
                <div className="cal-ev-preview">
                  {dayEvents.slice(0, 2).map((ev, ei) => (
                    <div key={ei} className="cal-ev-line" style={{ borderLeftColor: ev.color }}>
                      {ev.title.length > 16 ? ev.title.slice(0, 16) + "…" : ev.title}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="cal-detail">
          <div className="cal-detail-hdr">
            <span style={{ fontWeight: 600 }}>{selected.getDate()} {MONTHS[selected.getMonth()]}</span>
            <span style={{ color: "var(--fg3)", fontSize: 12 }}>{selEvents.length} event{selEvents.length !== 1 ? "s" : ""}</span>
          </div>
          {selEvents.length === 0 ? (
            <div style={{ padding: "16px 0", color: "var(--fg3)", fontSize: 12, textAlign: "center" }}>No events this day</div>
          ) : (
            <div className="cal-events">
              {selEvents.map((ev, i) => (
                <div key={i} className="cal-event" style={{ borderLeftColor: ev.color }}>
                  <div className="cal-event-time"><Clock size={11} strokeWidth={2} />{ev.time}</div>
                  <div className="cal-event-title">{ev.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarDemo() {
  return (
    <div className="demo-card" style={{ padding: 0, overflow: "hidden" }}>
      <CalendarMonth />
    </div>
  );
}

/* ═══ STYLES ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
*:focus-visible{outline:2px solid var(--bd-h);outline-offset:2px}
*:focus:not(:focus-visible){outline:none}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.fup-spin{animation:spin 600ms linear infinite}

.tog-btn{padding:6px 16px;border-radius:6px;background:var(--bg-m);border:1px solid var(--bd);color:var(--fg2);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 100ms}
.tog-btn:hover{border-color:var(--fg3);color:var(--fg)}
.demo-card{background:var(--bg-s);border:1px solid var(--bd);border-radius:10px;padding:20px}
.demo-hint{font-size:11px;color:var(--fg3)}

/* ── ACCORDION ── */
.acc{border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.acc-item{border-bottom:1px solid var(--bd)}
.acc-item:last-child{border-bottom:none}
.acc-trigger{display:flex;align-items:center;gap:8px;width:100%;padding:12px 16px;background:none;border:none;color:var(--fg);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;transition:background 80ms}
.acc-trigger:hover{background:var(--bg-m)}
/* Fix: focus ring inside the trigger, not bleeding out */
.acc-trigger:focus-visible{outline-offset:-2px;border-radius:0}
.acc-first .acc-trigger:focus-visible{border-radius:8px 8px 0 0}
.acc-last .acc-trigger:focus-visible{border-radius:0 0 8px 8px}
.acc-chev{color:var(--fg3);flex-shrink:0;transition:transform 200ms cubic-bezier(.16,1,.3,1)}
.acc-title{flex:1}
.acc-badge{font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg-m);color:var(--fg3);font-weight:600;border:1px solid var(--bd)}
.acc-body{overflow:hidden;transition:max-height 250ms cubic-bezier(.16,1,.3,1)}
.acc-content{padding:0 16px 16px 38px}
.acc-field{display:flex;gap:12px;font-size:13px;padding:4px 0}
.acc-fl{color:var(--fg3);min-width:72px;font-weight:500}

/* ── SLIDER ── */
.slider-wrap{display:flex;flex-direction:column;gap:8px}
.slider-label{display:flex;justify-content:space-between;align-items:center}
.slider-label span:first-child{font-size:12px;color:var(--fg2);font-weight:500}
.slider-val{font-size:13px;font-weight:600;font-family:var(--mono);color:var(--fg)}
.slider-track-wrap{position:relative;height:24px;display:flex;align-items:center}
.slider-track{width:100%;height:4px;background:var(--bg-m);border-radius:2px;position:absolute}
.slider-fill{height:100%;background:var(--blue);border-radius:2px;position:absolute;left:0}
/* All slider inputs: transparent track, styled thumb only */
.slider-input{-webkit-appearance:none;appearance:none;position:absolute;width:100%;height:24px;background:none;cursor:pointer;margin:0;z-index:2;outline:none}
.slider-input::-webkit-slider-runnable-track{background:transparent;height:4px}
.slider-input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--blue);border:2.5px solid var(--bg);box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;margin-top:-7px;transition:transform 80ms}
.slider-input::-webkit-slider-thumb:hover{transform:scale(1.15)}
.slider-input::-webkit-slider-thumb:active{transform:scale(1.3)}
.slider-input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px rgba(61,43,31,0.15),0 1px 4px rgba(0,0,0,0.3)}
/* Range mode: both inputs visible, pointer-events only on thumb */
.slider-track-wrap.range .slider-input{pointer-events:none}
.slider-track-wrap.range .slider-input::-webkit-slider-thumb{pointer-events:auto}
.slider-bounds{display:flex;justify-content:space-between;font-size:10px;color:var(--fg3);font-family:var(--mono)}

/* ── FILE UPLOAD ── */
.fup-zone{border:2px dashed var(--bd);border-radius:10px;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:all 150ms;text-align:center}
.fup-zone:hover{border-color:var(--fg3);background:var(--bg-m)}
.fup-drag{border-color:var(--blue);background:var(--blue-m)}
.fup-icon{width:48px;height:48px;border-radius:12px;background:var(--bg-m);display:grid;place-items:center;color:var(--fg3);margin-bottom:4px}
.fup-text{font-size:13px;color:var(--fg2)}
.fup-hint{font-size:11px;color:var(--fg3)}
.fup-list{margin-top:12px;display:flex;flex-direction:column;gap:4px}
.fup-file{display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-c);border:1px solid var(--bd);border-radius:8px}
.fup-file-icon{width:32px;height:32px;border-radius:6px;background:var(--bg-m);display:grid;place-items:center;color:var(--fg3);flex-shrink:0}
.fup-file-info{flex:1;min-width:0}
.fup-file-name{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fup-file-meta{font-size:11px;color:var(--fg3);margin-top:2px}
.fup-prog{height:3px;background:var(--bg-m);border-radius:2px;margin-top:6px;overflow:hidden}
.fup-prog-fill{height:100%;background:var(--blue);border-radius:2px;transition:width 200ms}
.fup-file-status{flex-shrink:0}
.fup-del{background:none;border:none;color:var(--fg3);cursor:pointer;width:24px;height:24px;border-radius:4px;display:grid;place-items:center;flex-shrink:0;transition:all 80ms}
.fup-del:hover{background:var(--bg-m);color:var(--fg)}

/* ── CALENDAR ── */
.cal{background:var(--bg-c)}
.cal-hdr{display:flex;align-items:center;gap:8px;padding:16px 20px;border-bottom:1px solid var(--bd)}
.cal-month{font-size:14px;font-weight:600;flex:1;text-align:center}
.cal-nav{background:none;border:none;color:var(--fg2);cursor:pointer;width:32px;height:32px;border-radius:6px;display:grid;place-items:center;transition:all 80ms}
.cal-nav:hover{background:var(--bg-m);color:var(--fg)}
.cal-today{background:none;border:1px solid var(--bd);color:var(--fg2);font-size:12px;font-weight:500;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:inherit;margin-left:auto;transition:all 80ms}
.cal-today:hover{border-color:var(--fg3);color:var(--fg)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--bd)}
.cal-day-label{font-size:11px;font-weight:600;color:var(--fg3);text-align:center;padding:10px 0;letter-spacing:0.02em;border-bottom:1px solid var(--bd)}
.cal-cell{position:relative;min-height:80px;padding:6px;border:none;border-right:1px solid var(--bd-s);border-bottom:1px solid var(--bd-s);background:none;cursor:pointer;font-family:inherit;text-align:left;display:flex;flex-direction:column;transition:background 60ms;color:var(--fg)}
.cal-cell:nth-child(7n+7){border-right:none}
.cal-cell:hover{background:var(--bg-m)}
.cal-cell.cal-out{opacity:0.3}
.cal-cell.cal-sel{background:var(--blue-m)}
.cal-num{font-size:12px;font-weight:500;width:24px;height:24px;display:grid;place-items:center;border-radius:50%}
.cal-num-today{background:var(--blue);color:#fff;font-weight:600}
.cal-today-cell{background:rgba(107,159,224,0.04)}
.cal-dots{display:flex;gap:3px;margin-top:4px;padding:0 2px}
.cal-ev-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.cal-ev-more{font-size:9px;color:var(--fg3);font-weight:600}
.cal-ev-preview{display:flex;flex-direction:column;gap:2px;margin-top:4px;flex:1;overflow:hidden}
.cal-ev-line{font-size:10px;color:var(--fg2);padding:1px 4px;border-left:2px solid;border-radius:0 2px 2px 0;background:var(--bg-m);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cal-detail{border-top:1px solid var(--bd);padding:16px 20px}
.cal-detail-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.cal-events{display:flex;flex-direction:column;gap:8px}
.cal-event{padding:10px 12px;border-left:3px solid;border-radius:0 6px 6px 0;background:var(--bg-m)}
.cal-event-time{font-size:11px;color:var(--fg3);display:flex;align-items:center;gap:4px;margin-bottom:4px}
.cal-event-title{font-size:13px;font-weight:500}

::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:4px}::-webkit-scrollbar-thumb:hover{background:var(--fg3)}
`;
