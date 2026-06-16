import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import AuthModal from "./auth"

const MIASTA = ["Wszystkie", "Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Breda", "Tilburg", "Groningen"]
const TYPY = ["5 vs 5", "7 vs 7", "11 vs 11", "Futsal"]
const POZIOMY = ["Rekreacyjny", "Średniozaawansowany", "Zaawansowany"]
const MAPS_KEY = "AIzaSyDMKuWySzTFoLVi4WE5J8gcC_65nVo6058"

const cl = {
  green: "#16A34A", greenLight: "#DCFCE7", greenDark: "#15803D",
  amber: "#D97706", amberLight: "#FEF3C7",
  red: "#DC2626", redLight: "#FEE2E2",
  bg: "#F9FAFB", card: "#FFFFFF",
  border: "#E5E7EB", borderGreen: "#BBF7D0",
  text: "#111827", sub: "#374151", muted: "#6B7280",
}

const pill = (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: bg, color, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" })
const field = { width: "100%", padding: "9px 13px", border: `1.5px solid ${cl.border}`, borderRadius: 10, fontSize: 13, color: cl.text, outline: "none", boxSizing: "border-box", background: cl.card }
const fieldErr = { ...field, borderColor: cl.red }
const btnPrimary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 999, border: "none", background: cl.green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }
const btnDanger = { padding: "7px 13px", borderRadius: 10, border: `1.5px solid ${cl.redLight}`, background: cl.redLight, color: cl.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""
const isToday = (dt) => dt && new Date(dt).toDateString() === new Date().toDateString()
const isWeekend = (dt) => { if (!dt) return false; const d = new Date(dt), day = d.getDay(), diff = d - new Date(); return diff >= 0 && diff <= 7 * 86400000 && (day === 6 || day === 0) }
const isWeek = (dt) => { if (!dt) return false; const diff = new Date(dt) - new Date(); return diff >= 0 && diff <= 7 * 86400000 }

function badgeInfo(g) {
  const free = g.miejsc_total - g.miejsc_zajete
  if (free <= 0) return { bg: cl.redLight, color: cl.red, text: "Pełne" }
  if (g.miejsc_zajete / g.miejsc_total >= 0.8) return { bg: cl.amberLight, color: cl.amber, text: `${free} miejsc` }
  return { bg: cl.greenLight, color: cl.green, text: `${free} miejsc` }
}
function levelInfo(p) {
  if (p === "Zaawansowany") return { bg: cl.redLight, color: cl.red }
  if (p === "Średniozaawansowany") return { bg: cl.amberLight, color: cl.amber }
  return { bg: cl.greenLight, color: cl.green }
}

function Label({ children, required }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: cl.sub, marginBottom: 5 }}>
    {children}{required && <span style={{ color: cl.red, marginLeft: 3 }}>*</span>}
  </label>
}
function FieldWrap({ label, required, error, children }) {
  return <div style={{ marginBottom: 14 }}>
    <Label required={required}>{label}</Label>
    {children}
    {error && <div style={{ fontSize: 11, color: cl.red, marginTop: 3 }}>⚠ {error}</div>}
  </div>
}
function SectionHead({ icon, title }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 6px", borderBottom: `1.5px solid ${cl.borderGreen}`, marginBottom: 14, marginTop: 6 }}>
    <span style={{ fontSize: 15 }}>{icon}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: cl.text }}>{title}</span>
  </div>
}
function FilterGroup({ label, children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: cl.muted, textTransform: "uppercase", letterSpacing: .6 }}>{label}</div>
    {children}
  </div>
}
function Sel({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    style={{ ...field, padding: "7px 30px 7px 11px", fontSize: 12, fontWeight: 600, color: cl.sub, appearance: "none", width: "auto", minWidth: 130, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center" }}>
    {options.map(o => <option key={o}>{o}</option>)}
  </select>
}

const emptyForm = { tytul: "", lokalizacja: "", miasto: "Amsterdam", data_czas: "", typ: "7 vs 7", wpisowe: 0, miejsc_total: 14, opis: "", poziom: "Rekreacyjny", whatsapp: "" }

// Formularz jako osobny komponent POZA App — kluczowe dla uniknięcia re-renderów
function GierkaForm({ initial, onSave, onClose, title, submitLabel }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  function set(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.tytul.trim()) e.tytul = "Pole wymagane"
    if (!form.lokalizacja.trim()) e.lokalizacja = "Pole wymagane"
    if (!form.data_czas) e.data_czas = "Pole wymagane"
    if (!form.whatsapp.trim()) e.whatsapp = "Pole wymagane"
    if (!form.miejsc_total || form.miejsc_total < 2) e.miejsc_total = "Min. 2 graczy"
    setErrors(e)
    return !Object.keys(e).length
  }

  function handleSave() {
    if (validate()) onSave(form)
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: cl.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: cl.text }}>{title}</div>
            <div style={{ fontSize: 12, color: cl.muted, marginTop: 3 }}>Pola z <span style={{ color: cl.red }}>*</span> są obowiązkowe</div>
          </div>
          <button onClick={onClose} style={{ background: cl.greenLight, border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 17, cursor: "pointer", color: cl.green, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <SectionHead icon="⚽" title="Gierka" />
        <FieldWrap label="Nazwa gierki" required error={errors.tytul}>
          <input style={errors.tytul ? fieldErr : field} placeholder="np. Środowa piłka w Amsterdamie" value={form.tytul} onChange={e => set("tytul", e.target.value)} />
        </FieldWrap>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldWrap label="Rodzaj gry" required>
            <select style={field} value={form.typ} onChange={e => set("typ", e.target.value)}>
              {TYPY.map(t => <option key={t}>{t}</option>)}
            </select>
          </FieldWrap>
          <FieldWrap label="Poziom gry" required>
            <select style={field} value={form.poziom} onChange={e => set("poziom", e.target.value)}>
              {POZIOMY.map(p => <option key={p}>{p}</option>)}
            </select>
          </FieldWrap>
        </div>

        <SectionHead icon="📍" title="Boisko" />
        <FieldWrap label="Adres boiska" required error={errors.lokalizacja}>
          <input style={errors.lokalizacja ? fieldErr : field} placeholder="np. Sportpark Ookmeer" value={form.lokalizacja} onChange={e => set("lokalizacja", e.target.value)} />
        </FieldWrap>
        <FieldWrap label="Miasto" required>
          <select style={field} value={form.miasto} onChange={e => set("miasto", e.target.value)}>
            {MIASTA.filter(m => m !== "Wszystkie").map(m => <option key={m}>{m}</option>)}
          </select>
        </FieldWrap>

        <SectionHead icon="🕐" title="Termin i gracze" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldWrap label="Data i godzina" required error={errors.data_czas}>
            <input type="datetime-local" style={errors.data_czas ? fieldErr : field} value={form.data_czas} onChange={e => set("data_czas", e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Liczba graczy" required error={errors.miejsc_total}>
            <input type="number" min="4" max="22" style={errors.miejsc_total ? fieldErr : field} value={form.miejsc_total} onChange={e => set("miejsc_total", parseInt(e.target.value) || 10)} />
          </FieldWrap>
        </div>
        <FieldWrap label="Wpisowe (€)">
          <input type="number" min="0" placeholder="0 = gratis" style={field} value={form.wpisowe} onChange={e => set("wpisowe", parseInt(e.target.value) || 0)} />
        </FieldWrap>

        <SectionHead icon="📱" title="Kontakt" />
        <FieldWrap label="Numer WhatsApp" required error={errors.whatsapp}>
          <input style={errors.whatsapp ? fieldErr : field} placeholder="+31 6 12 34 56 78" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
        </FieldWrap>
        <div style={{ fontSize: 11, color: cl.muted, marginTop: -10, marginBottom: 14 }}>Numer widoczny tylko dla zapisanych graczy</div>

        <SectionHead icon="📝" title="Dodatkowe info" />
        <FieldWrap label="Opis (opcjonalnie)">
          <input style={field} placeholder="np. buty korki, szatnia dostępna" value={form.opis} onChange={e => set("opis", e.target.value)} />
        </FieldWrap>

        <button onClick={handleSave} style={{ ...btnPrimary, width: "100%", justifyContent: "center", padding: 13, fontSize: 14, borderRadius: 12, boxShadow: "0 4px 16px rgba(22,163,74,.3)", marginTop: 4 }}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [gierki, setGierki] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(null)
  const [editInitial, setEditInitial] = useState(emptyForm)

  const [fMiasto, setFMiasto] = useState("Wszystkie")
  const [fKiedy, setFKiedy] = useState("Wszystkie")
  const [fWpisowe, setFWpisowe] = useState("Wszystkie")
  const [fPoziom, setFPoziom] = useState("Wszystkie")
  const [fWolne, setFWolne] = useState(false)

  useEffect(() => {
    load()
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) setShowAuth(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from("gierki").select("*").order("data_czas")
    setGierki(data || [])
    setLoading(false)
  }

  async function dodaj(form) {
    if (!user) { setShowAuth(true); return }
    const { error } = await supabase.from("gierki").insert([{ ...form, kontakt: form.whatsapp, user_id: user.id }])
    if (!error) { load(); setShowForm(false) }
    else alert("Błąd: " + error.message)
  }

  async function zapisz(id, zajete, total) {
    if (!user) { setShowAuth(true); return }
    if (zajete >= total) return
    await supabase.from("gierki").update({ miejsc_zajete: zajete + 1 }).eq("id", id)
    const n = zajete + 1
    setGierki(p => p.map(g => g.id === id ? { ...g, miejsc_zajete: n } : g))
    setSelected(p => p ? { ...p, miejsc_zajete: n } : p)
  }

  async function usun(id) {
    if (!window.confirm("Czy na pewno chcesz usunąć tę gierkę?")) return
    await supabase.from("gierki").delete().eq("id", id)
    setSelected(null)
    load()
  }

  async function edytuj(form) {
    const { error } = await supabase.from("gierki").update({ ...form, kontakt: form.whatsapp }).eq("id", selected.id)
    if (!error) { load(); setShowEdit(false); setSelected(null) }
    else alert("Błąd: " + error.message)
  }

  function otworzEdycje(g) {
    setEditInitial({ tytul: g.tytul, lokalizacja: g.lokalizacja, miasto: g.miasto, data_czas: g.data_czas?.slice(0, 16) || "", typ: g.typ, wpisowe: g.wpisowe, miejsc_total: g.miejsc_total, opis: g.opis || "", poziom: g.poziom || "Rekreacyjny", whatsapp: g.kontakt || "" })
    setShowEdit(true)
  }

  async function wyloguj() {
    await supabase.auth.signOut()
    setUser(null)
  }

  const filtered = gierki.filter(g => {
    if (fMiasto !== "Wszystkie" && g.miasto !== fMiasto) return false
    if (fKiedy === "Dziś" && !isToday(g.data_czas)) return false
    if (fKiedy === "Weekend" && !isWeekend(g.data_czas)) return false
    if (fKiedy === "Ten tydzień" && !isWeek(g.data_czas)) return false
    if (fWpisowe === "Gratis" && g.wpisowe > 0) return false
    if (fWpisowe === "Płatne" && g.wpisowe === 0) return false
    if (fPoziom !== "Wszystkie" && g.poziom !== fPoziom) return false
    if (fWolne && g.miejsc_zajete >= g.miejsc_total) return false
    return true
  })

  const activeF = [fMiasto !== "Wszystkie", fKiedy !== "Wszystkie", fWpisowe !== "Wszystkie", fPoziom !== "Wszystkie", fWolne].filter(Boolean).length

  function mapSrc(g) {
    if (g) return `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(`${g.lokalizacja} ${g.miasto} Netherlands`)}&zoom=15`
    return `https://www.google.com/maps/embed/v1/search?key=${MAPS_KEY}&q=${encodeURIComponent(`${fMiasto !== "Wszystkie" ? fMiasto : "Netherlands"} sportpark`)}&zoom=${fMiasto !== "Wszystkie" ? 12 : 7}`
  }

  const isOwner = (g) => user && g.user_id === user.id

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: cl.bg }}>

      {/* NAV */}
      <nav style={{ background: cl.card, borderBottom: `1.5px solid ${cl.border}`, padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.5 }}>
          <span style={{ color: cl.green }}>Gierka</span><span style={{ color: cl.text }}>.nl</span>
        </div>
        <span style={{ ...pill(cl.green, cl.greenLight), fontSize: 11 }}>⚽ znajdź mecz w Holandii</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, boxShadow: "0 2px 8px rgba(22,163,74,.3)" }}>＋ Dodaj gierkę</button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12, color: cl.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email || user.user_metadata?.full_name}</div>
              <button onClick={wyloguj} style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${cl.border}`, background: "white", color: cl.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Wyloguj</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ padding: "7px 16px", borderRadius: 999, border: `1.5px solid ${cl.green}`, background: "white", color: cl.green, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Zaloguj się</button>
          )}
        </div>
      </nav>

      {/* FILTRY */}
      <div style={{ background: cl.card, borderBottom: `1.5px solid ${cl.border}`, padding: "10px 20px", display: "flex", gap: 16, alignItems: "flex-end", flexShrink: 0, flexWrap: "wrap" }}>
        <FilterGroup label={`🔍 Filtry${activeF ? ` (${activeF})` : ""}`}>
          <div style={{ fontSize: 11, color: cl.muted, paddingTop: 2 }}>Wyniki: <strong style={{ color: cl.text }}>{filtered.length}</strong></div>
        </FilterGroup>
        <FilterGroup label="📍 Miasto"><Sel value={fMiasto} onChange={v => { setFMiasto(v); setSelected(null) }} options={MIASTA} /></FilterGroup>
        <FilterGroup label="🕐 Kiedy"><Sel value={fKiedy} onChange={setFKiedy} options={["Wszystkie", "Dziś", "Weekend", "Ten tydzień"]} /></FilterGroup>
        <FilterGroup label="💶 Wpisowe"><Sel value={fWpisowe} onChange={setFWpisowe} options={["Wszystkie", "Gratis", "Płatne"]} /></FilterGroup>
        <FilterGroup label="🎯 Poziom"><Sel value={fPoziom} onChange={setFPoziom} options={["Wszystkie", ...POZIOMY]} /></FilterGroup>
        <FilterGroup label="✅ Wolne">
          <button onClick={() => setFWolne(!fWolne)} style={{ padding: "7px 13px", borderRadius: 10, border: `1.5px solid ${fWolne ? cl.green : cl.border}`, background: fWolne ? cl.greenLight : "white", color: fWolne ? cl.green : cl.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {fWolne ? "✓ " : ""}Tylko wolne
          </button>
        </FilterGroup>
        {activeF > 0 && (
          <FilterGroup label="​">
            <button onClick={() => { setFMiasto("Wszystkie"); setFKiedy("Wszystkie"); setFWpisowe("Wszystkie"); setFPoziom("Wszystkie"); setFWolne(false) }} style={{ ...btnDanger }}>✕ Wyczyść</button>
          </FilterGroup>
        )}
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LISTA */}
        <div style={{ width: "50%", display: "flex", flexDirection: "column", flexShrink: 0, background: cl.bg }}>
          <div style={{ overflowY: "auto", flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loading && <div style={{ padding: 40, textAlign: "center", color: cl.muted }}>⏳ Ładowanie...</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ marginTop: 12, padding: 32, textAlign: "center", color: cl.muted, fontSize: 13, background: cl.card, borderRadius: 14, border: `1.5px dashed ${cl.border}` }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: cl.sub }}>Brak wyników</div>
                <div>Zmień filtry lub dodaj pierwszą gierkę!</div>
              </div>
            )}
            {filtered.map(g => {
              const b = badgeInfo(g)
              const lv = levelInfo(g.poziom)
              const pct = Math.round(g.miejsc_zajete / g.miejsc_total * 100)
              const sel = selected?.id === g.id
              return (
                <div key={g.id} onClick={() => setSelected(sel ? null : g)}
                  style={{ background: sel ? cl.greenLight : cl.card, borderRadius: 14, border: `1.5px solid ${sel ? cl.green : cl.border}`, padding: "13px 14px", cursor: "pointer", transition: "all .15s", boxShadow: sel ? "0 2px 12px rgba(22,163,74,.12)" : "0 1px 3px rgba(0,0,0,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7, gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: cl.text, lineHeight: 1.35 }}>{g.tytul}</div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                      {isOwner(g) && <span style={{ ...pill("#fff", cl.green), fontSize: 9 }}>Moja</span>}
                      <span style={{ ...pill(b.color, b.bg) }}>{b.text}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: cl.muted, display: "flex", flexDirection: "column", gap: 3, marginBottom: 9 }}>
                    <span>🕐 {fmt(g.data_czas)}</span>
                    <span>📍 {g.lokalizacja}, {g.miasto}</span>
                    <span>⚽ {g.typ} &nbsp;·&nbsp; 💶 {g.wpisowe > 0 ? `€${g.wpisowe}` : "Gratis"}</span>
                  </div>
                  {g.poziom && <span style={{ ...pill(lv.color, lv.bg) }}>{g.poziom}</span>}
                  <div style={{ marginTop: 8, height: 5, background: cl.border, borderRadius: 999 }}>
                    <div style={{ height: 5, borderRadius: 999, width: `${pct}%`, background: b.color, transition: "width .3s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: cl.muted, marginTop: 4, fontWeight: 600 }}>{g.miejsc_zajete}/{g.miejsc_total} graczy</div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: "9px 16px", background: cl.card, borderTop: `1.5px solid ${cl.border}`, display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cl.muted, textTransform: "uppercase", letterSpacing: .5 }}>Dostępność:</span>
            {[[cl.green, "Wolne"], [cl.amber, "Prawie pełne"], [cl.red, "Pełne"]].map(([col, t]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: col }} />
                <span style={{ fontSize: 10, color: cl.muted, fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAPA */}
        <div style={{ flex: 1, position: "relative", borderLeft: `1.5px solid ${cl.border}` }}>
          <iframe key={selected?.id || fMiasto} src={mapSrc(selected)}
            width="100%" height="100%" style={{ border: 0, display: "block" }}
            allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />

          {selected && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: cl.card, borderTop: `2px solid ${cl.green}`, padding: "16px 20px", boxShadow: "0 -6px 24px rgba(0,0,0,.1)", borderRadius: "18px 18px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: cl.text }}>{selected.tytul}</div>
                  <div style={{ fontSize: 11, color: cl.muted, marginTop: 2 }}>📍 {selected.lokalizacja}, {selected.miasto}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isOwner(selected) && <>
                    <button onClick={() => otworzEdycje(selected)} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${cl.border}`, background: "white", color: cl.sub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edytuj</button>
                    <button onClick={() => usun(selected.id)} style={{ ...btnDanger, padding: "6px 12px" }}>🗑 Usuń</button>
                  </>}
                  <button onClick={() => setSelected(null)} style={{ background: cl.greenLight, border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: 17, cursor: "pointer", color: cl.green, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                {[["🕐 Kiedy", fmt(selected.data_czas)], ["⚽ Rodzaj", selected.typ], ["💶 Wpisowe", selected.wpisowe > 0 ? `€${selected.wpisowe}` : "Gratis"], ["🎯 Poziom", selected.poziom || "Rekreacyjny"]].map(([label, val]) => (
                  <div key={label} style={{ background: cl.greenLight, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: cl.green, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: cl.text }}>{val}</div>
                  </div>
                ))}
              </div>
              {selected.kontakt && (
                <div style={{ background: "#F0FDF4", border: `1.5px solid ${cl.borderGreen}`, borderRadius: 10, padding: "9px 13px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: cl.muted, marginBottom: 2 }}>Kontakt z organizatorem</div>
                    <a href={`https://wa.me/${selected.kontakt.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, fontWeight: 700, color: cl.green, textDecoration: "none" }}>
                      WhatsApp: {selected.kontakt}
                    </a>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
                    {Array.from({ length: Math.min(selected.miejsc_total, 22) }).map((_, i) => (
                      <div key={i} style={{ width: 21, height: 21, borderRadius: "50%", background: i < selected.miejsc_zajete ? cl.green : cl.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {i < selected.miejsc_zajete && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: cl.muted, fontWeight: 600 }}>{selected.miejsc_zajete}/{selected.miejsc_total} graczy</div>
                </div>
                {!isOwner(selected) && (
                  <button onClick={() => zapisz(selected.id, selected.miejsc_zajete, selected.miejsc_total)}
                    disabled={selected.miejsc_zajete >= selected.miejsc_total}
                    style={{ padding: "10px 22px", background: selected.miejsc_zajete >= selected.miejsc_total ? cl.border : cl.green, color: selected.miejsc_zajete >= selected.miejsc_total ? cl.muted : "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: selected.miejsc_zajete >= selected.miejsc_total ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                    {selected.miejsc_zajete >= selected.miejsc_total ? "Brak miejsc" : `Zapisz się — ${selected.miejsc_total - selected.miejsc_zajete} wolnych`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showForm && <GierkaForm initial={emptyForm} onSave={dodaj} onClose={() => setShowForm(false)} title="Dodaj gierkę" submitLabel="⚽ Opublikuj gierkę" />}
      {showEdit && <GierkaForm initial={editInitial} onSave={edytuj} onClose={() => setShowEdit(false)} title="Edytuj gierkę" submitLabel="💾 Zapisz zmiany" />}
    </div>
  )
}