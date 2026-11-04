import { useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  PencilIcon,
  PillToggle,
  PlusIcon,
  SearchField,
  TextField,
  TrashIcon,
} from '../components/ui'

const swatches = ['page', 'chrome', 'rule', 'ink', 'muted', 'accent', 'band', 'node-a', 'node-b', 'edge']

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-bold tracking-widest text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

export default function Styleguide() {
  const [view, setView] = useState('tree')
  return (
    <AppShell>
      <h1 className="mb-8 font-display text-5xl font-semibold">Styleguide</h1>
      <Section title="Colors">
        <div className="flex flex-wrap gap-3">
          {swatches.map((s) => (
            <div key={s} className="w-28">
              <div
                className="h-14 rounded-xl border-2 border-rule"
                style={{ background: `var(--${s})` }}
              />
              <div className="mt-1 text-sm">{s}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Type">
        <p className="font-hero text-7xl tracking-tight">See your whole family.</p>
        <p className="font-display text-3xl font-semibold">Fraunces heading</p>
        <p className="text-lg">
          DM Sans body text. <span className="text-muted">Muted text.</span>
        </p>
      </Section>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Get started</Button>
          <Button variant="soft">Cancel</Button>
          <Button>
            <PlusIcon size={20} /> Add person
          </Button>
          <Button variant="row" aria-label="Edit">
            <PencilIcon />
          </Button>
          <Button variant="row" aria-label="Delete">
            <TrashIcon />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>
      <Section title="Toggle">
        <PillToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'tree', label: 'Tree' },
            { value: 'force', label: 'Force' },
          ]}
        />
      </Section>
      <Section title="Fields">
        <div className="grid max-w-md gap-4">
          <SearchField placeholder="Search members" />
          <TextField label="Name" placeholder="Member name" />
        </div>
      </Section>
      <Section title="Card">
        <Card className="max-w-sm">
          <div className="font-display text-2xl font-semibold">Tree name</div>
          <div className="text-muted">24 members</div>
        </Card>
      </Section>
    </AppShell>
  )
}
