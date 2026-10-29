import type { Any, Board, Model } from './board'
import type { Picture } from './product'

// The map, BOB's home page (docs/map.html). Pure functions: the page is a view
// of bob/brief.json, bob/ledger.json and bob/map.json, so no state or count on
// it is typed by hand.
//
// Phase one of the rebuild (29 October 2026, Ash's intent): the spine is Ash's
// ten-stage mind map, listed once in bob/schema.json (map.stages). A project
// says which promise sits at which stage in bob/map.json (stages: id to stage
// number), and carries its product schematic there (screens and flows). A stage
// lights only when every promise in it is proven. Nothing a person reads on the
// page carries a requirement code, increment number, approval number or hash
// (R-bob-demo-13): ids stay in the data for Claude and never reach a label.

export type Dot = { id: string; state: 'proven' | 'built' | 'todo'; label: string; plain: string }
export type Branch = { id: string; name: string; short: string; blurb: string; lit: boolean; half?: boolean; items: Dot[] }
export type Screen = { name: string; shows: string; does: string }
export type Flow = { from: string; to: string; what: string }
export type Schematic = { screens: Screen[]; flows: Flow[] } | null
export type MapData = {
  project: string
  generatedAt: string
  round: string
  next: { doer: string; text: string }
  proven: number
  total: number
  question: string | null
  schematic: Schematic
  // The picture at the heart (29 October 2026): the product's own flowchart,
  // lit from the records. The stages below are the strip behind it.
  picture: Picture | null
  branches: Branch[]
}
export type MapAssets = { character: string; dark: string; light: string }
// bob/map.json: the project's own say on where each promise sits and what the product looks like.
export type MapFile = { stages?: Record<string, number>; labels?: Record<string, string>; schematic?: Schematic }

const PROVEN = ['verified', 'accepted']
const BUILT = ['designed', 'implemented', 'reported']

// A dot is proven only when the state says so AND an evidence record exists.
export const dotState = (state: string, hasEvidence: boolean): Dot['state'] =>
  PROVEN.includes(state) && hasEvidence ? 'proven' : PROVEN.includes(state) || BUILT.includes(state) ? 'built' : 'todo'

export const WORDS: Record<Dot['state'], string> = { proven: 'Proven', built: 'Built, not yet proven', todo: 'Not started' }
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const sentence = (s: string) => s.replace(/^./, c => c.toUpperCase())

export const QUESTION = 'What do you want to build?'

// Where an unplaced promise goes: the build stage. Named here once so the page
// can say so in plain words.
const DEFAULT_STAGE = 8

type Stage = { n: number; name: string; short: string; blurb: string }
const stagesOf = (m: Model): Stage[] =>
  ((m.schema?.map?.stages ?? []) as Any[]).map(s => ({ n: Number(s.n), name: String(s.name), short: String(s.short ?? s.name), blurb: String(s.blurb ?? '') }))

const roundWords = (b: Board, m: Model): string => {
  const active = ((m.ledger?.increments ?? []) as Any[]).find(i => i.state === 'active')
  if (active) return `Round running: ${String(active.title ?? 'this round')}`
  if (/^idle/.test(b.increment)) return 'No round running'
  return 'Waiting for an approval'
}

export function buildMapData(m: Model, b: Board, generatedAt: string, file: MapFile = {}, picture: Picture | null = null): MapData {
  const reqs = ((m.brief?.requirements ?? []) as Any[])
  const evidence = ((m.ledger?.evidence ?? []) as Any[])
  const incs = ((m.ledger?.increments ?? []) as Any[])
  const byId = new Map(reqs.map(r => [String(r.id), r]))
  const dot = (id: string): Dot => {
    const r = byId.get(id) as Any
    const n = evidence.filter(e => e.requirement_id === id).length
    const state = dotState(String(r.state ?? ''), n > 0)
    const said = sentence(clip(String(r.text ?? ''), 240))
    const proof = n ? ` Proof on file: ${n === 1 ? 'one record' : `${n} records`}.` : ' No proof recorded yet.'
    const label = file.labels?.[id] ?? sentence(clip(String(r.text ?? ''), 60))
    return { id, state, label, plain: `${WORDS[state]}. ${said}${/[.…]$/.test(said) ? '' : '.'}${proof}` }
  }

  const stages = stagesOf(m)
  let branches: Branch[]
  if (stages.length) {
    const placed = new Map<number, string[]>()
    for (const r of reqs) {
      const n = Number(file.stages?.[String(r.id)] ?? DEFAULT_STAGE)
      const key = stages.some(s => s.n === n) ? n : DEFAULT_STAGE
      placed.set(key, [...(placed.get(key) ?? []), String(r.id)])
    }
    branches = stages.map(s => {
      const items = (placed.get(s.n) ?? []).map(dot)
      return { id: `stage-${s.n}`, name: s.name, short: s.short, blurb: s.blurb, lit: items.length > 0 && items.every(d => d.state === 'proven'), items }
    })
  } else {
    // No stage list in the schema: one branch per round, named by its title.
    const used = new Set<string>()
    branches = incs
      .map(i => {
        const ids = ((i.requirement_ids ?? []) as string[]).filter(id => byId.has(id) && !used.has(id))
        ids.forEach(id => used.add(id))
        const items = ids.map(dot)
        const name = String(i.title ?? 'a round')
        return { id: String(i.id), name, short: clip(name, 24), blurb: '', lit: items.length > 0 && items.every(d => d.state === 'proven'), items }
      })
      .filter(br => br.items.length)
    const rest = reqs.map(r => String(r.id)).filter(id => !used.has(id))
    if (rest.length) branches.push({ id: 'other', name: branches.length ? 'Other promises' : 'Promises', short: 'Other', blurb: 'Promises not in any round yet.', lit: false, items: rest.map(dot) })
  }

  const all = branches.flatMap(br => br.items)
  const m1 = b.next.match(/^(Ash needs to|Claude):?\s*([\s\S]*)$/i)
  return {
    project: String(m.brief?.project?.name ?? m.place?.project ?? 'this project'),
    generatedAt,
    round: roundWords(b, m),
    next: { doer: m1 ? (m1[1].toLowerCase().startsWith('ash') ? 'ASH NEEDS TO' : 'CLAUDE') : 'NEXT', text: m1 ? m1[2] : b.next },
    proven: all.filter(d => d.state === 'proven').length,
    total: all.length,
    question: all.length ? null : QUESTION,
    schematic: file.schematic ?? null,
    picture,
    branches,
  }
}

// JSON inside a <script>: nothing in it may close the tag or open a comment.
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

export const renderMap = (template: string, assets: MapAssets, data: MapData): string =>
  template
    .split('{{DATA}}').join(safeJson(data))
    .split('{{CHAR}}').join(assets.character)
    .split('{{DARK}}').join(assets.dark)
    .split('{{LIGHT}}').join(assets.light)

// A project still being designed has no ledger yet. Its six design stages sit
// on the same ten-stage spine (capture and understand feed stage one; design the
// product feeds three; data feeds four; visible feeds five; challenge feeds
// six): a lit dot (built, never proven) per stage whose file exists, nothing
// drawn proven, and the next step with its doer. With nothing done yet the
// page asks the one question.
const DESIGN_ON_SPINE = [1, 1, 3, 4, 5, 6]

export function designMapData(m: Model, project: string, stages: string[], done: boolean[], generatedAt: string, file: MapFile = {}, picture: Picture | null = null): MapData {
  const items: Dot[] = stages.map((name, i) => ({
    id: `stage-${i + 1}`,
    state: done[i] ? 'built' : 'todo',
    label: name,
    plain: `${done[i] ? 'Done: the stage’s file is on disk, not yet proven.' : 'Not started.'} Design step ${i + 1} of ${stages.length}.`,
  }))
  const current = done.findIndex(d => !d)
  const spine = stagesOf(m)
  // A stage lights in design once every design step on it is done, and shows
  // half lit as soon as one is: the first answer lights stage one (intent.md,
  // "her answer lights stage one"; product-manager review, 29 October 2026).
  const branches: Branch[] = spine.length
    ? spine.map(s => { const on = items.filter((_, i) => DESIGN_ON_SPINE[i] === s.n); const lit = on.length > 0 && on.every(d => d.state === 'built'); return { id: `stage-${s.n}`, name: s.name, short: s.short, blurb: s.blurb, lit, half: !lit && on.some(d => d.state === 'built'), items: on } })
    : [{ id: 'design', name: 'Design steps', short: 'Design', blurb: 'Six steps from your words to an approved design.', lit: false, items }]
  const started = done.some(Boolean)
  return {
    project,
    generatedAt,
    round: started ? 'Designing' : 'Not started',
    next: current === -1 ? { doer: 'ASH NEEDS TO', text: 'press Adopt this project in the BOB pane, so the build can be approved' } : { doer: 'CLAUDE', text: `finish the design step “${stages[current]}”` },
    proven: 0,
    total: items.length,
    question: started ? null : QUESTION,
    schematic: file.schematic ?? null,
    picture,
    branches,
  }
}
