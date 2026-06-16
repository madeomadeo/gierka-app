import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabase'

export default function AuthModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", marginBottom: 4 }}>
          <span style={{ color: "#16A34A" }}>Gierka</span>.nl
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>Zaloguj się żeby zapisywać się na gierki i dodawać własne</div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#16A34A', brandAccent: '#15803D' } } } }}
          providers={['google']}
          localization={{ variables: { sign_in: { email_label: 'Email', password_label: 'Hasło', button_label: 'Zaloguj się', social_provider_text: 'Kontynuuj przez {{provider}}' }, sign_up: { email_label: 'Email', password_label: 'Hasło', button_label: 'Zarejestruj się' } } }}
        />
      </div>
    </div>
  )
}