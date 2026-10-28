import type { Any, Board, Model } from './board'

// R-bob-17: the map, BOB's home page (docs/map.html). Pure functions: the
// page is a view of bob/brief.json and bob/ledger.json, so no state or count on
// it is typed by hand. The branches for BOB's own project live once, in
// bob/schema.json (map.branches); any other project gets one branch per round.

export type Dot = { id: string; state: 'proven' | 'built' | 'todo'; label: string; plain: string }
export type Branch = { id: string; name: string; blurb: string; items: Dot[] }
export type MapData = {
  project: string
  generatedAt: string
  round: string
  next: { doer: string; text: string }
  proven: number
  total: number
  branches: Branch[]
}
export type MapAssets = { character: string; dark: string; light: string }

const PROVEN = ['verified', 'accepted']
const BUILT = ['designed', 'implemented', 'reported']

// A dot is proven only when the state says so AND an evidence record exists.
export const dotState = (state: string, hasEvidence: boolean): Dot['state'] =>
  PROVEN.includes(state) && hasEvidence ? 'proven' : PROVEN.includes(state) || BUILT.includes(state) ? 'built' : 'todo'

const WORDS: Record<Dot['state'], string> = { proven: 'Proven', built: 'Built, never seen', todo: 'Not started' }
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function buildMapData(m: Model, b: Board, generatedAt: string): MapData {
  const reqs = ((m.brief?.requirements ?? []) as Any[])
  const evidence = ((m.ledger?.evidence ?? []) as Any[])
  const incs = ((m.ledger?.increments ?? []) as Any[])
  const byId = new Map(reqs.map(r => [String(r.id), r]))
  const dot = (id: string, label?: string): Dot => {
    const r = byId.get(id) as Any
    const ev = evidence.filter(e => e.requirement_id === id).map(e => String(e.id))
    const state = dotState(String(r.state ?? ''), ev.length > 0)
    const said = clip(String(r.text ?? ''), 240).replace(/^./, c => c.toUpperCase())
    const plain = `${WORDS[state]}. ${said}${/[.…]$/.test(said) ? '' : '.'}${ev.length ? ` Evidence: ${ev.join(', ')}.` : ' No evidence recorded yet.'}`
    return { id, state, label: label ?? clip(String(r.text ?? id), 60), plain }
  }

  const themed = ((m.schema?.map?.branches ?? []) as Any[]).filter(br => (br.items ?? []).some((i: Any) => byId.has(String(i.id))))
  const used = new Set<string>()
  let branches: Branch[]
  if (themed.length) {
    branches = themed.map(br => {
      const items = (br.items as Any[]).filter(i => byId.has(String(i.id))).map(i => { used.add(String(i.id)); return dot(String(i.id), String(i.label)) })
      return { id: String(br.id), name: String(br.name), blurb: String(br.blurb ?? ''), items }
    }).filter(br => br.items.length)
  } else {
    branches = incs
      .map(i => {
        const ids = ((i.requirement_ids ?? []) as string[]).filter(id => byId.has(id) && !used.has(id))
        ids.forEach(id => used.add(id))
        return { id: String(i.id), name: String(i.id), blurb: String(i.title ?? ''), items: ids.map(id => dot(id)) }
      })
      .filter(br => br.items.length)
  }
  const rest = reqs.map(r => String(r.id)).filter(id => !used.has(id))
  if (rest.length) branches.push({ id: 'other', name: branches.length ? 'Other' : 'Requirements', blurb: 'Requirements not on a branch above.', items: rest.map(id => dot(id)) })

  const all = branches.flatMap(br => br.items)
  const m1 = b.next.match(/^(Ash needs to|Claude):?\s*([\s\S]*)$/i)
  return {
    project: String(m.brief?.project?.name ?? m.place?.project ?? 'this project'),
    generatedAt,
    round: b.increment,
    next: { doer: m1 ? (m1[1].toLowerCase().startsWith('ash') ? 'ASH NEEDS TO' : 'CLAUDE') : 'NEXT', text: m1 ? m1[2] : b.next },
    proven: all.filter(d => d.state === 'proven').length,
    total: all.length,
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
