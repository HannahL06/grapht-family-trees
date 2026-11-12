import { Link } from 'react-router-dom'
import { isLoggedIn } from '../api/auth'
import { Logo, MoonIcon, SunIcon } from '../components/ui'
import { useTheme } from '../theme'

// The illustration: a small family graph, drawn once. Only design tokens are
// used (fill-node-a, stroke-edge, ...), so dark mode needs no extra code.
const HUB = [260, 170]
const SPOKES = [
  [120, 70], [190, 40], [280, 50], [420, 130], [440, 200], [420, 270],
  [350, 310], [270, 300], [190, 290], [110, 240], [80, 160],
]
const BRANCHES = [
  [120, 70, 60, 40], [420, 130, 480, 90], [440, 200, 500, 230], [350, 310, 380, 350],
  [270, 300, 240, 350], [110, 240, 60, 290], [80, 160, 30, 170],
]
const MARRIAGE = [360, 70] // the one dashed line
const NODES_A = [
  [120, 70], [280, 50], [420, 130], [420, 270], [270, 300], [190, 290], [80, 160],
  [60, 40], [480, 90], [500, 230], [380, 350], [60, 290],
]
const NODES_B = [
  [190, 40], [360, 70], [350, 310], [110, 240], [240, 350], [30, 170],
]

function FamilyGraphIllustration() {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="-20 -20 580 420"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A family tree drawn as a graph of connected people"
    >
      <g className="stroke-edge" strokeWidth="1.4">
        {SPOKES.map(([x, y]) => (
          <line key={`s${x}-${y}`} x1={HUB[0]} y1={HUB[1]} x2={x} y2={y} />
        ))}
        {BRANCHES.map(([x1, y1, x2, y2]) => (
          <line key={`b${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
        <line
          x1={HUB[0]}
          y1={HUB[1]}
          x2={MARRIAGE[0]}
          y2={MARRIAGE[1]}
          strokeDasharray="5 4"
        />
      </g>
      <g className="fill-node-a stroke-line-a" strokeWidth="1.2">
        {NODES_A.map(([x, y]) => (
          <circle key={`a${x}-${y}`} cx={x} cy={y} r="9" />
        ))}
      </g>
      <g className="fill-node-b stroke-line-b" strokeWidth="1.2">
        {NODES_B.map(([x, y]) => (
          <circle key={`n${x}-${y}`} cx={x} cy={y} r="9" />
        ))}
        <circle cx={HUB[0]} cy={HUB[1]} r="12" />
        <circle cx="440" cy="200" r="11" />
      </g>
    </svg>
  )
}

const navLink =
  'px-4 py-2 text-[15px] font-medium text-ink no-underline underline-offset-8 hover:underline'

export default function LandingPage() {
  const { theme, toggle } = useTheme()
  // Logged-in visitors skip registration
  const start = isLoggedIn() ? '/trees' : '/register'

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-10 py-5">
        <div className="flex flex-1 items-center">
          <Logo className="h-16" />
        </div>
        <nav className="flex flex-wrap gap-2">
          <a href="#how-it-works" className={navLink}>
            How it works
          </a>
          <a href="#contact" className={navLink}>
            Contact
          </a>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-chrome text-ink"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link
            to={start}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-[26px] text-[15px] font-medium text-on-accent no-underline hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <h1 className="mx-6 mt-16 text-center font-hero text-[clamp(44px,7vw,96px)] leading-none font-medium tracking-[-0.03em]">
          See your whole family.
        </h1>

        {/* side margins grow with the screen so the band doesn't run edge to edge */}
        <section className="relative mx-[clamp(32px,14vw,240px)] mt-14 min-h-[480px] flex-1 overflow-hidden rounded-t-[48px] bg-band">
          <FamilyGraphIllustration />
        </section>

        {/* Placeholder sections the header links scroll to */}
        <section id="how-it-works" className="mx-auto w-full max-w-[1120px] scroll-mt-6 px-8 py-24">
          <h2 className="mb-4 font-display text-4xl font-semibold">How it works</h2>
          <p className="max-w-xl text-lg text-muted">
            Add the people in your family, link them as parents, spouses and children, and explore
            the whole tree as a graph. A fuller guide is coming soon.
          </p>
        </section>
        <section id="contact" className="mx-auto w-full max-w-[1120px] scroll-mt-6 px-8 pb-24">
          <h2 className="mb-4 font-display text-4xl font-semibold">Contact</h2>
          <p className="max-w-xl text-lg text-muted">Contact details are coming soon.</p>
        </section>
      </main>
    </div>
  )
}
