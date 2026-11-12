import AppHeader from './AppHeader'

/**
 * Page frame: header + content.
 * Default: centered content column. `fill`: the content gets the whole
 * remaining screen (the tree page's canvas). `toolbar` puts page-specific
 * controls in the header.
 */
export default function AppShell({ children, fill = false, toolbar = null }) {
  return (
    <div className={`flex flex-col bg-page text-ink ${fill ? 'h-screen' : 'min-h-screen'}`}>
      <AppHeader toolbar={toolbar} />
      {fill ? (
        <div className="flex min-h-0 flex-1 flex-wrap">{children}</div>
      ) : (
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 pt-9 pb-18">{children}</main>
      )}
    </div>
  )
}
