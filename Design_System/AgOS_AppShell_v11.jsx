import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  Search, ChevronRight, ChevronDown, ChevronUp, Star, Plus, MoreHorizontal,
  LayoutDashboard, Users, Building2, Briefcase, Activity, BarChart3, Settings,
  PanelLeftClose, PanelLeft, Filter, Download,
  Mail, Phone, Calendar, MapPin, X, Hash, Bell,
  Sun, Moon, LogOut, Check, Table2, List,
  ArrowLeft, Clock, Edit3, Zap, FileText
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

/* ═══ CONTEXT ═══ */
const Ctx = createContext();
const useShell = () => useContext(Ctx);

/* ═══ TURAN STAR ═══ */
function TuranStar({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <g transform="translate(16,16)">
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <line key={i} x1="0" y1="-3" x2="0" y2="-13" stroke="#E8920B" strokeWidth="2.8" strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="2.5" fill="#E8920B" />
      </g>
    </svg>
  );
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const [sb, setSb] = useState("expanded");
  const [theme, setTheme] = useState("dark");
  const [page, setPage] = useState("contacts");
  const [record, setRecord] = useState(null);
  const [panel, setPanel] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [cmdQ, setCmdQ] = useState("");

  const cycle = useCallback(() => setSb(s => s === "expanded" ? "collapsed" : s === "collapsed" ? "hidden" : "expanded"), []);

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmd(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); cycle(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "]") { e.preventDefault(); setPanel(p => !p); }
      if (e.key === "Escape") { setCmd(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cycle]);

  const open = r => { setRecord(r); setPanel(true); };
  const ctx = { sb, setSb, cycle, theme, setTheme, page, setPage, record, open, panel, setPanel, cmd, setCmd, cmdQ, setCmdQ };
  const sw = sb === "expanded" ? 240 : sb === "collapsed" ? 56 : 0;

  return (
    <Ctx.Provider value={ctx}>
      <div data-theme={theme} style={{
        "--sw": sw + "px", "--pw": panel ? "348px" : "0px",
        display: "grid", gridTemplateColumns: "var(--sw) 1fr var(--pw)",
        gridTemplateRows: "44px 1fr",
        height: "100vh", width: "100%",
        background: "var(--bg)", color: "var(--fg)",
        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
        fontSize: 13, lineHeight: 1.5, WebkitFontSmoothing: "antialiased",
        transition: "grid-template-columns 250ms var(--ease)",
        overflow: "hidden",
      }}>
        <Sidebar />
        <Header />
        <Content />
        {panel && <Panel />}
        {cmd && <Cmd />}
      </div>
      <style>{tokens}{css}</style>
    </Ctx.Provider>
  );
}

/* ═══ NAV DATA ═══ */
const nav = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "contacts", icon: Users, label: "Contacts", count: 248 },
  { id: "companies", icon: Building2, label: "Companies", count: 67 },
  { id: "deals", icon: Briefcase, label: "Deals", count: 34 },
  { id: "activities", icon: Activity, label: "Activities" },
  { id: "reports", icon: BarChart3, label: "Reports" },
];
const favs = [
  { id: "f1", label: "Q1 Pipeline", color: "var(--blue)" },
  { id: "f2", label: "Astana Enterprise", color: "var(--green)" },
  { id: "f3", label: "Stalled deals", color: "var(--red)" },
];

/* ═══ SIDEBAR ═══ */
function Sidebar() {
  const { sb, cycle, page, setPage, theme, setTheme } = useShell();
  const exp = sb === "expanded";
  const col = sb === "collapsed";
  if (sb === "hidden") return <div style={{ gridRow: "1/-1" }} />;

  return (
    <aside style={{ gridRow: "1/-1", display: "flex", flexDirection: "column", background: "var(--bg-s)", borderRight: "1px solid var(--bd)", overflow: "hidden" }}>
      {/* Workspace */}
      <div style={{ padding: exp ? "14px 14px 10px" : "14px 10px 10px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 10, justifyContent: col ? "center" : "flex-start" }}>
        <TuranStar size={exp ? 28 : 24} />
        {exp && <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>AgOS</div>
            <div style={{ fontSize: 10, color: "var(--fg3)", marginTop: -1 }}>TURAN · Pro</div>
          </div>
          <Btn onClick={cycle} tip="Collapse ⌘B"><PanelLeftClose size={15} /></Btn>
        </>}
      </div>

      {/* Search */}
      {exp && <div style={{ padding: "8px 10px 4px" }}>
        <button className="sb-search" onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
          <Search size={13} strokeWidth={2} />
          <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>}
      {col && <div style={{ padding: "8px 0 4px", display: "flex", justifyContent: "center" }}>
        <Btn onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} tip="Search ⌘K"><Search size={15} /></Btn>
      </div>}

      {/* Nav */}
      <nav style={{ padding: exp ? "4px 8px" : "4px 6px", flex: 1, overflowY: "auto" }}>
        {nav.map(n => (
          <button key={n.id} className={`sb-item${page === n.id ? " on" : ""}`} onClick={() => setPage(n.id)} title={col ? n.label : undefined}
            style={{ justifyContent: col ? "center" : "flex-start", padding: col ? "7px" : "7px 10px" }}>
            <n.icon size={16} strokeWidth={page === n.id ? 1.8 : 1.5} style={{ color: page === n.id ? "var(--fg)" : "var(--fg3)" }} />
            {exp && <><span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
              {n.count != null && <span style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 500 }}>{n.count}</span>}</>}
          </button>
        ))}

        {/* Favorites */}
        {exp && <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--bd)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 10px", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fg3)", letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>Favorites</span>
            <Plus size={12} style={{ color: "var(--fg3)", cursor: "pointer" }} />
          </div>
          {favs.map(f => (
            <button key={f.id} className="sb-fav">
              <Star size={12} fill={f.color} style={{ color: f.color }} />
              <span style={{ flex: 1, textAlign: "left" }}>{f.label}</span>
            </button>
          ))}
        </div>}
      </nav>

      {/* User */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 8, justifyContent: col ? "center" : "flex-start" }}>
        <div style={{ width: 28, height: 28, borderRadius: 9999, background: "var(--cta)", color: "var(--cta-fg)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>AR</div>
        {exp && <>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>arshidin</div>
            <div style={{ fontSize: 10, color: "var(--fg3)", marginTop: -1 }}>Admin</div>
          </div>
          <Btn onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} tip="Theme">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </Btn>
        </>}
      </div>
    </aside>
  );
}

/* ═══ HEADER ═══ */
function Header() {
  const { sb, cycle, panel } = useShell();
  return (
    <header style={{ gridColumn: panel ? "2/3" : "2/-1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid var(--bd)", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {sb === "hidden" && <Btn onClick={cycle} tip="Show sidebar"><PanelLeft size={15} /></Btn>}
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Contacts</h1>
        <div style={{ display: "flex", gap: 2 }}>
          {["All", "Active", "Leads"].map((t, i) => (
            <button key={t} className={`tab${i === 0 ? " tab-on" : ""}`}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button className="hb"><Filter size={13} /><span>Filter</span></button>
        <button className="hb"><Download size={13} /><span>Export</span></button>
        <button className="hb-cta"><Plus size={14} strokeWidth={2} /><span>Add contact</span></button>
      </div>
    </header>
  );
}

/* ═══ TABLE DATA ═══ */
const data = [
  { id: 1, name: "Arman Kerimov", email: "arman@turantech.kz", co: "Turan Tech", stage: "Active", sc: "green", val: 45200, ow: { i: "AK" } },
  { id: 2, name: "Saule Nurmagambetova", email: "saule@kazfinance.kz", co: "KazFinance", stage: "Qualified", sc: "blue", val: 128000, ow: { i: "JS" } },
  { id: 3, name: "Maria Petrova", email: "maria@astanadev.kz", co: "Astana Dev", stage: "Won", sc: "emerald", val: 67500, ow: { i: "MP" } },
  { id: 4, name: "Dmitry Volkov", email: "dmitry@novatel.kz", co: "NovaTel", stage: "Lead", sc: "amber", val: 12000, ow: { i: "DV" } },
  { id: 5, name: "Aigerim Tulegenova", email: "aigerim@greenco.kz", co: "GreenCo", stage: "Stalled", sc: "red", val: 89300, ow: { i: "AT" } },
  { id: 6, name: "Bolat Omarov", email: "bolat@steppeai.kz", co: "Steppe AI", stage: "Active", sc: "green", val: 234000, ow: { i: "BO" } },
];

/* ═══ CONTENT ═══ */
function Content() {
  const { panel, open } = useShell();
  const [sel, setSel] = useState(new Set([1, 3]));
  const [sortDir, setSortDir] = useState("asc");
  const tog = (id, e) => { e.stopPropagation(); setSel(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); };
  const sorted = [...data].sort((a, b) => sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  return (
    <main style={{ gridColumn: panel ? "2/3" : "2/-1", overflow: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="th" style={{ width: 44, paddingLeft: 16 }}><input type="checkbox" className="ck" checked={sel.size === data.length} onChange={() => setSel(s => s.size === data.length ? new Set() : new Set(data.map(d => d.id)))} readOnly /></th>
              <th className="th th-sort" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
                <span>NAME</span>
                <span className="sort-icon">{sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />}</span>
              </th>
              <th className="th">COMPANY</th>
              <th className="th">STAGE</th>
              <th className="th" style={{ textAlign: "right" }}>VALUE</th>
              <th className="th" style={{ width: 60 }}>OWNER</th>
              <th className="th" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr key={d.id} className={`tr${sel.has(d.id) ? " tr-sel" : ""}`} onClick={() => open(d)}>
                <td className="td" style={{ paddingLeft: 16 }}><input type="checkbox" className="ck" checked={sel.has(d.id)} onChange={e => tog(d.id, e)} /></td>
                <td className="td">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="av">{d.name.split(" ").map(w => w[0]).join("")}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: -1 }}>{d.email}</div>
                    </div>
                  </div>
                </td>
                <td className="td" style={{ color: "var(--fg2)" }}>{d.co}</td>
                <td className="td"><span className={`badge badge-${d.sc}`}><span className="badge-dot" />{d.stage}</span></td>
                <td className="td mono" style={{ textAlign: "right" }}>${d.val.toLocaleString()}</td>
                <td className="td" style={{ textAlign: "center" }}><div className="av av-sm">{d.ow.i}</div></td>
                <td className="td"><MoreHorizontal size={14} className="row-more" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="tfoot">
        <span>{sel.size > 0 && <><span style={{ color: "var(--blue)", fontWeight: 500 }}>{sel.size} selected</span>{" · "}</>}6 of 248 results</span>
        <div style={{ display: "flex", gap: 2 }}>
          {["Prev", "1", "2", "3", "Next"].map(p => (
            <button key={p} className={`pg${p === "1" ? " pg-on" : ""}`}>{p}</button>
          ))}
        </div>
      </div>
    </main>
  );
}

/* ═══ DETAIL PANEL ═══ */
function Panel() {
  const { record: r, setPanel } = useShell();
  if (!r) return null;
  const fields = [
    { l: "Email", v: r.email },
    { l: "Company", v: r.co },
    { l: "Stage", v: r.stage, badge: r.sc },
    { l: "Value", v: `$${r.val.toLocaleString()}`, mono: true },
    { l: "Source", v: "Referral" },
    { l: "Created", v: "Mar 15, 2026" },
  ];
  return (
    <aside style={{ gridRow: "1/-1", borderLeft: "1px solid var(--bd)", background: "var(--bg-s)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideIn 250ms var(--ease)" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div className="av" style={{ width: 36, height: 36, fontSize: 13 }}>{r.name.split(" ").map(w => w[0]).join("")}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: "var(--fg3)" }}>{r.co}</div>
        </div>
        <Btn onClick={() => setPanel(false)} tip="Close"><X size={15} /></Btn>
      </div>
      {/* Quick actions */}
      <div style={{ padding: "8px 16px", display: "flex", gap: 4, borderBottom: "1px solid var(--bd)" }}>
        {[{ i: Mail, l: "Email" }, { i: Phone, l: "Call" }, { i: Calendar, l: "Meeting" }, { i: Edit3, l: "Note" }].map(a => (
          <button key={a.l} className="qa"><a.i size={12} />{a.l}</button>
        ))}
      </div>
      {/* Fields */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {fields.map(f => (
          <div key={f.l} className="fl">
            <div className="fl-l">{f.l}</div>
            <div className="fl-v">
              {f.badge ? <span className={`badge badge-${f.badge}`}><span className="badge-dot" />{f.v}</span>
                : f.mono ? <span style={{ fontFamily: "var(--mono)", fontWeight: 500, fontSize: 12 }}>{f.v}</span>
                : f.v}
            </div>
          </div>
        ))}
        {/* Activity */}
        <div style={{ padding: "16px", borderTop: "1px solid var(--bd)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Recent Activity</div>
          {[
            { icon: Mail, text: "Email sent", time: "2h ago", color: "var(--blue)" },
            { icon: Phone, text: "Call logged", time: "1d ago", color: "var(--green)" },
            { icon: Zap, text: "Deal updated", time: "3d ago", color: "var(--amber)" },
          ].map((a, i) => (
            <div key={i} className="act-item">
              <div className="act-icon" style={{ background: `color-mix(in srgb, ${a.color} 10%, transparent)`, color: a.color }}>
                <a.icon size={12} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{a.text}</div>
                <div style={{ fontSize: 10, color: "var(--fg3)" }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ═══ COMMAND PALETTE ═══ */
function Cmd() {
  const { setCmd, setCmdQ, cmdQ, setPage } = useShell();
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const items = [
    { s: "Pages", list: [
      { l: "Dashboard", icon: LayoutDashboard, k: "⌘1" },
      { l: "Contacts", icon: Users, k: "⌘2" },
      { l: "Companies", icon: Building2, k: "⌘3" },
      { l: "Deals", icon: Briefcase, k: "⌘4" },
    ]},
    { s: "Actions", list: [
      { l: "New contact", icon: Plus },
      { l: "Search deals", icon: Search },
    ]},
  ];
  return (
    <div className="cmd-ov" onClick={e => { if (e.target === e.currentTarget) setCmd(false); }}>
      <div className="cmd-box">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--bd)" }}>
          <Search size={16} style={{ color: "var(--fg3)" }} />
          <input ref={ref} value={cmdQ} onChange={e => setCmdQ(e.target.value)} placeholder="Type a command or search…"
            style={{ flex: 1, background: "none", border: "none", color: "var(--fg)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          <span className="kbd">ESC</span>
        </div>
        <div style={{ overflow: "auto", padding: "8px 0", maxHeight: 320 }}>
          {items.map(g => (
            <div key={g.s}>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 600, color: "var(--fg3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{g.s}</div>
              {g.list.filter(i => !cmdQ || i.l.toLowerCase().includes(cmdQ.toLowerCase())).map(i => (
                <button key={i.l} className="cmd-i" onClick={() => { setCmd(false); setCmdQ(""); if (i.l.includes("contact")) {} else setPage(i.l.toLowerCase()); }}>
                  <i.icon size={15} strokeWidth={1.6} />
                  <span style={{ flex: 1 }}>{i.l}</span>
                  {i.k && <span className="kbd">{i.k}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ HELPERS ═══ */
function Btn({ children, onClick, tip }) {
  return <button className="ic-btn" onClick={onClick} title={tip}>{children}</button>;
}

/* ═══ STYLES ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
*:focus-visible{outline:2px solid var(--bd-h);outline-offset:2px}
*:focus:not(:focus-visible){outline:none}
@keyframes slideIn{from{transform:translateX(10px);opacity:0}to{transform:none;opacity:1}}
@keyframes cmdFade{from{opacity:0}to{opacity:1}}
@keyframes cmdIn{from{transform:scale(0.97) translateY(-6px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}

.ic-btn{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;background:none;border:none;color:var(--fg3);cursor:pointer;transition:all 80ms}
.ic-btn:hover{background:var(--bg-m);color:var(--fg)}

/* Sidebar */
.sb-search{width:100%;display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;background:var(--bg-c);border:1px solid var(--bd);color:var(--fg3);font-size:12px;cursor:pointer;font-family:inherit;transition:all 100ms}
.sb-search:hover{border-color:var(--bd-h)}
.kbd{font-size:10px;padding:1px 5px;border-radius:3px;background:var(--bg);border:1px solid var(--bd);color:var(--fg3);font-family:inherit}
.sb-item{width:100%;display:flex;align-items:center;gap:9px;border-radius:6px;background:none;border:none;color:var(--fg2);font-size:13px;font-weight:400;cursor:pointer;font-family:inherit;transition:all 80ms;margin-bottom:1px}
.sb-item:hover{background:var(--bg-m);color:var(--fg)}
.sb-item.on{background:rgba(255,255,255,0.04);color:var(--fg);font-weight:500;border:1px solid rgba(255,255,255,0.06)}
[data-theme="light"] .sb-item.on{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.06)}
.sb-fav{width:100%;display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:6px;background:none;border:none;color:var(--fg2);font-size:12px;cursor:pointer;font-family:inherit;transition:all 80ms}
.sb-fav:hover{background:var(--bg-m);color:var(--fg)}

/* Header */
.tab{padding:4px 10px;border-radius:5px;background:none;border:none;color:var(--fg3);font-size:12px;font-weight:400;cursor:pointer;font-family:inherit}
.tab:hover{color:var(--fg)}
.tab-on{background:var(--bg-m);color:var(--fg);font-weight:500}
.hb{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:6px;background:none;border:1px solid var(--bd);color:var(--fg2);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 100ms}
.hb:hover{border-color:var(--bd-h);color:var(--fg)}
.hb-cta{display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:6px;background:var(--cta);border:none;color:var(--cta-fg);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:-0.01em;transition:background 100ms}
.hb-cta:hover{background:var(--cta-h)}

/* Table */
.th{padding:0 16px;height:36px;font-size:10px;font-weight:600;color:var(--fg3);letter-spacing:0.04em;text-align:left;white-space:nowrap;border-bottom:1px solid var(--bd);background:var(--bg-s);position:sticky;top:0;text-transform:uppercase}
.th-sort{cursor:pointer;user-select:none}
.th-sort:hover{color:var(--fg2)}
.sort-icon{display:inline-flex;vertical-align:middle;margin-left:4px;opacity:0.6}
.td{padding:0 16px;height:44px;border-bottom:1px solid var(--bd-s);font-size:13px;white-space:nowrap;vertical-align:middle}
.mono{font-family:var(--mono);font-size:12px;font-weight:500}
.tr{transition:background 60ms;cursor:pointer}
.tr:hover td{background:var(--bg-m)}
.tr-sel td{background:var(--blue-m)}
.row-more{color:var(--fg3);opacity:0;transition:opacity 80ms}
.tr:hover .row-more{opacity:1}

.ck{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--bd);background:none;appearance:none;cursor:pointer;position:relative;transition:all 80ms;accent-color:var(--blue)}
.ck:hover{border-color:var(--fg3)}
.ck:checked{background:var(--blue);border-color:var(--blue)}
.ck:checked::after{content:'';position:absolute;top:2px;left:4.5px;width:4px;height:7px;border:1.5px solid #fff;border-top:none;border-left:none;transform:rotate(45deg)}
[data-theme="light"] .ck:checked::after{border-color:var(--bg)}

.av{width:28px;height:28px;border-radius:9999px;background:var(--bg-m);color:var(--fg2);display:grid;place-items:center;font-size:10px;font-weight:600;flex-shrink:0}
.av-sm{width:24px;height:24px;font-size:9px}

.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500}
.badge-dot{width:5px;height:5px;border-radius:9999px;background:currentColor}
.badge-green{background:rgba(94,196,122,0.08);color:var(--green)}
.badge-blue{background:rgba(107,159,224,0.08);color:var(--blue)}
.badge-emerald{background:rgba(78,203,160,0.08);color:var(--green)}
.badge-amber{background:rgba(240,176,64,0.08);color:var(--amber)}
.badge-red{background:rgba(224,96,80,0.08);color:var(--red)}
[data-theme="light"] .badge-green{background:rgba(58,138,82,0.08);color:var(--green)}
[data-theme="light"] .badge-blue{background:rgba(69,113,184,0.08);color:var(--blue)}
[data-theme="light"] .badge-emerald{background:rgba(45,138,110,0.08);color:var(--green)}
[data-theme="light"] .badge-amber{background:rgba(179,122,16,0.08);color:var(--amber)}
[data-theme="light"] .badge-red{background:rgba(192,57,43,0.08);color:var(--red)}

.tfoot{display:flex;align-items:center;justify-content:space-between;padding:8px 20px;border-top:1px solid var(--bd);font-size:11px;color:var(--fg3)}
.pg{padding:4px 10px;border-radius:5px;background:none;border:1px solid transparent;color:var(--fg3);font-size:11px;font-weight:400;cursor:pointer;font-family:inherit}
.pg:hover{background:var(--bg-m);color:var(--fg)}
.pg-on{background:var(--bg-m);border-color:var(--bd-h);color:var(--fg);font-weight:600}

/* Panel */
.qa{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:6px;background:var(--bg-m);border:1px solid var(--bd);color:var(--fg2);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 100ms;white-space:nowrap}
.qa:hover{border-color:var(--bd-h);color:var(--fg)}
.fl{display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid var(--bd-s)}
.fl-l{padding:10px 16px;font-size:11px;color:var(--fg3);font-weight:500}
.fl-v{padding:10px 16px;font-size:13px;display:flex;align-items:center;transition:background 80ms;border-radius:0}
.fl-v:hover{background:var(--bg-m)}
.act-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0}
.act-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex-shrink:0}

/* Command Palette */
.cmd-ov{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.4);backdrop-filter:blur(6px);display:flex;justify-content:center;padding-top:18vh;animation:cmdFade 120ms}
.cmd-box{width:520px;max-height:400px;background:var(--bg-c);border:1px solid var(--bd);border-radius:12px;box-shadow:0 24px 48px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;animation:cmdIn 180ms var(--ease);align-self:flex-start}
.cmd-i{display:flex;align-items:center;gap:10px;width:100%;padding:8px 16px;background:none;border:none;color:var(--fg2);font-size:13px;cursor:pointer;font-family:inherit;transition:all 60ms}
.cmd-i:hover{background:var(--bg-m);color:var(--fg)}

::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--fg3)}
`;
