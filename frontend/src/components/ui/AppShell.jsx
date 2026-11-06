import AppHeader from './AppHeader'

/** Page frame: header + centered content column. */
export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 pt-9 pb-18">{children}</main>
    </div>
  )
}
