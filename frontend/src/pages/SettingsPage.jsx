import { AppShell, PillToggle } from '../components/ui'
import { useTheme } from '../theme'

const sectionTitle = 'mb-2 text-[15px] font-bold tracking-[0.08em] text-muted uppercase'

/** A ruled "label ... control" row; add new settings as more <Setting> rows. */
function Setting({ label, hint, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-2 border-rule py-5">
      <div>
        <div className="text-[19px]">{label}</div>
        {hint && <div className="mt-1 text-[15px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  return (
    <AppShell>
      <h1 className="mb-8 font-display text-4xl font-semibold">Settings</h1>
      <section className="max-w-2xl">
        <h2 className={sectionTitle}>Appearance</h2>
        <Setting label="Theme" hint="Saved on this device.">
          <PillToggle
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Setting>
      </section>
    </AppShell>
  )
}
