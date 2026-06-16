import { supabase } from './supabase'

export default function AuthModal({ onClose }) {
  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          <span style={{ color: "#16A34A" }}>Gierka</span>.nl
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Zaloguj się żeby zapisywać się na gierki i dodawać własne</div>
        <button onClick={loginGoogle} style={{ width: "100%", padding: "12px 20px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
          Kontynuuj przez Google
        </button>
      </div>
    </div>
  )
}