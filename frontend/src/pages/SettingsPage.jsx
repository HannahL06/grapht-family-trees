import { AppShell, PillToggle } from '../components/ui'
import { useTheme } from '../theme'

const sectionTitle = 'mb-1 text-xs font-bold tracking-[0.08em] text-muted uppercase'

/** A ruled "label ... control" row; add new settings as more <Setting> rows. */
function Setting({ label, hint, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule py-[18px]">
      <div>
        <div className="text-base">{label}</div>
        {hint && <div className="mt-1 text-[13px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  return (
    <AppShell>
      <h1 className="mb-9 font-display text-5xl leading-none font-medium tracking-[-0.01em]">
        Settings
      </h1>
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
