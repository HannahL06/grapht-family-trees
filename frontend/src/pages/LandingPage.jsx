import { Link } from 'react-router-dom'
import { isLoggedIn } from '../api/auth'
import {
  ChevronRightIcon,
  Logo,
  PencilIcon,
  PlusIcon,
  RelationshipIcon,
  SearchIcon,
  SunIcon,
} from '../components/ui'

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

const FEATURES = [
  {
    icon: PencilIcon,
    title: 'Build your tree',
    text: 'Add people with their birth and death years, birthplace and notes, then link them as parents, spouses and children.',
  },
  {
    icon: RelationshipIcon,
    title: 'Two ways to see it',
    text: 'Explore the whole family as a graph, or switch to the traditional family-tree layout, generation by generation.',
  },
  {
    icon: SearchIcon,
    title: 'Find anyone fast',
    text: 'Search by name from the tree, or browse everyone in a clear list with birth years, birthplaces and marriages.',
  },
  {
    icon: ChevronRightIcon,
    title: 'A page for every person',
    text: 'Open any member to see their details and their family: parents, spouses with marriage notes, and children.',
  },
  {
    icon: PlusIcon,
    title: 'Several trees, one account',
    text: 'Keep a separate tree for each side of the family and open any of them from your Trees page.',
  },
  {
    icon: SunIcon,
    title: 'Light and dark',
    text: 'Pick a light or dark theme in Settings. Grapht remembers your choice on this device.',
  },
]

const STEPS = [
  {
    title: 'Add the people you know',
    text: 'Start with yourself or a grandparent. Add a name and whatever else you remember; every field is optional.',
  },
  {
    title: 'Link the relationships',
    text: 'Add a parent, a spouse or a child straight from a person, and record marriage and divorce years.',
  },
  {
    title: 'Explore the whole tree',
    text: 'Drag and zoom around the graph, click anyone for their card, and open their page for the full story.',
  },
]

const FAQ = [
  {
    q: 'Can I have more than one tree?',
    a: 'Yes. Each tree is separate, and you can open any of them from your Trees page.',
  },
  {
    q: 'Can I see a traditional family tree?',
    a: 'Yes. Use the Graph / Tree switch on the tree page to move between the network view and the generations layout.',
  },
  {
    q: 'What if someone married more than once?',
    a: 'A person can have several spouses. Each marriage keeps its own marriage year and, if it applies, a divorce year.',
  },
  {
    q: 'Can I work out how two people are related?',
    a: 'A relationship calculator is on its way. It appears in the tree toolbar and is marked as coming soon.',
  },
]

const sectionTitle = 'font-hero text-4xl leading-[1.1] font-medium tracking-[-0.01em]'

export default function LandingPage() {
  // Logged-in visitors skip registration
  const start = isLoggedIn() ? '/trees' : '/register'
  const cta =
    'inline-flex min-h-11 items-center rounded-full bg-accent px-[26px] text-[15px] font-medium text-on-accent no-underline hover:opacity-90'

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      {/* Just the logo: no links and no controls on the landing page's top bar */}
      <header className="px-10 py-5">
        <Logo className="h-12" />
      </header>

      <main className="flex flex-1 flex-col">
        <h1 className="mx-6 mt-14 text-center font-hero text-[clamp(44px,7vw,96px)] leading-[1.05] font-medium tracking-[-0.02em]">
          See your whole family.
        </h1>
        <p className="mx-auto mt-5 max-w-xl px-6 text-center text-lg leading-relaxed text-muted">
          Grapht turns the people in your family into a tree you can explore, search and keep up to
          date.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to={start} className={cta}>
            Get started
          </Link>
        </div>

        {/* side margins grow with the screen so the band doesn't run edge to edge */}
        <section className="relative mx-[clamp(32px,14vw,240px)] mt-12 min-h-[480px] overflow-hidden rounded-t-[48px] bg-band">
          <FamilyGraphIllustration />
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-8 pt-24">
          <h2 className={`${sectionTitle} mb-3`}>Everything you need to map your family</h2>
          <p className="mb-12 max-w-xl text-base leading-relaxed text-muted">
            A calm place to keep the people, places and dates of your family together.
          </p>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="border-t border-rule pt-5">
                <Icon size={22} strokeWidth={1.7} className="text-accent" />
                <h3 className="mt-4 mb-2 font-display text-2xl leading-[1.15] font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-8 pt-28">
          <h2 className={`${sectionTitle} mb-12`}>How it works</h2>
          <ol className="grid gap-x-10 gap-y-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-ink pt-5">
                <div className="font-display text-2xl text-accent">0{i + 1}</div>
                <h3 className="mt-3 mb-2 font-display text-2xl leading-[1.15] font-medium">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-8 pt-28">
          <div className="grid gap-x-16 gap-y-6 border-t border-rule pt-10 md:grid-cols-[1fr_2fr]">
            <h2 className={sectionTitle}>Who we are</h2>
            <div className="max-w-2xl text-base leading-relaxed text-muted">
              <p className="mb-4">
                We are a small team of designers and engineers who think a family&apos;s story
                deserves better than a shoebox of papers or a spreadsheet nobody can follow.
              </p>
              <p>
                Grapht began as a simple idea: show the people in a family the way they really
                connect, as a web rather than a list, and keep every detail one click away. We build
                it carefully, keep it quiet and easy to use, and add features only when they help you
                understand your family better.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-8 pt-28">
          <h2 className={`${sectionTitle} mb-10`}>Questions</h2>
          <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q} className="border-t border-rule pt-5">
                <dt className="mb-2 text-base font-bold">{f.q}</dt>
                <dd className="text-sm leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-8 py-28">
          <div className="flex flex-col items-center rounded-[28px] bg-band px-8 py-16 text-center">
            <h2 className={sectionTitle}>Start your family tree today.</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Create an account and add your first person in a minute.
            </p>
            <Link to={start} className={`${cta} mt-8`}>
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule px-10 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <Logo className="h-9" />
          <p className="text-[13px] text-muted">© Grapht. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
