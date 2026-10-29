import type { Any } from './board'

// The picture at the heart of BOB (Ash, 29 October 2026): a flowchart of the
// product being built, not of the build's progress. "I can see what I've built."
//
// bob/product.json holds it: one node per part of the product (what starts it,
// what comes in, what it reads, what it does, what it decides, what it
// produces, what it shows), edges for how information moves, and the promises
// each part rests on. A node lights from the ledger: proven when every promise
// it names is proven, built when any is built, otherwise not started.
//
// Ash edits it in his own tool: docs/product.opml is the same picture as a
// mind map file MindNode opens. When the OPML file is newer than product.json,
// BOB reads it back (toProduct) and redraws. Pure functions; no engine here.

export type Kind = 'trigger' | 'input' | 'source' | 'step' | 'decision' | 'output' | 'screen'
export type Node = { id: string; kind: Kind; name: string; says: string; promises: string[] }
export type Edge = { from: string; to: string; what: string }
export type Product = { name: string; nodes: Node[]; edges: Edge[] }
export type Light = 'proven' | 'built' | 'todo' | 'none'
export type LitNode = Node & { light: Light; proofs: number }
export type Picture = { name: string; nodes: LitNode[]; edges: Edge[]; editedAt: string | null }

export const KINDS: { kind: Kind; heading: string }[] = [
  { kind: 'trigger', heading: 'What starts it' },
  { kind: 'input', heading: 'What comes in' },
  { kind: 'source', heading: 'What it reads (sources and databases)' },
  { kind: 'step', heading: 'What it does' },
  { kind: 'decision', heading: 'What it decides' },
  { kind: 'output', heading: 'What it produces' },
  { kind: 'screen', heading: 'What it shows' },
]

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'part'

const PROVEN = ['verified', 'accepted']
const BUILT = ['designed', 'implemented', 'reported']

// Lights come from the records only: the brief's states and the ledger's evidence.
export function lightUp(product: Product, reqs: Any[], evidence: Any[], editedAt: string | null = null): Picture {
  const byId = new Map(reqs.map(r => [String(r.id), r]))
  const nodes: LitNode[] = product.nodes.map(n => {
    const ids = (n.promises ?? []).filter(id => byId.has(id))
    const states = ids.map(id => String((byId.get(id) as Any).state ?? ''))
    const proofs = ids.reduce((sum, id) => sum + evidence.filter(e => e.requirement_id === id).length, 0)
    const proven = ids.length > 0 && ids.every(id => PROVEN.includes(String((byId.get(id) as Any).state)) && evidence.some(e => e.requirement_id === id))
    const light: Light = !ids.length ? 'none' : proven ? 'proven' : states.some(s => PROVEN.includes(s) || BUILT.includes(s)) ? 'built' : 'todo'
    return { ...n, promises: ids, light, proofs }
  })
  return { name: product.name, nodes, edges: product.edges.filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to)), editedAt }
}

const escXml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const unXml = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')

// The picture as a mind map file (OPML 2.0, which MindNode opens and saves).
// Root: the product. Branches: the seven headings. Leaves: the parts, with
// what each says as the note, and one child per arrow out of it ("→ part: what").
export function toOpml(product: Product): string {
  const name = (id: string) => product.nodes.find(n => n.id === id)?.name ?? id
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<opml version="2.0">', `<head><title>${escXml(product.name)}</title></head>`, '<body>', `<outline text="${escXml(product.name)}">`]
  for (const k of KINDS) {
    const nodes = product.nodes.filter(n => n.kind === k.kind)
    lines.push(`  <outline text="${escXml(k.heading)}">`)
    for (const n of nodes) {
      const out = product.edges.filter(e => e.from === n.id)
      const open = `    <outline text="${escXml(n.name)}"${n.says ? ` _note="${escXml(n.says)}"` : ''}`
      if (!out.length) lines.push(`${open}/>`)
      else {
        lines.push(`${open}>`)
        for (const e of out) lines.push(`      <outline text="${escXml(`→ ${name(e.to)}${e.what ? `: ${e.what}` : ''}`)}"/>`)
        lines.push('    </outline>')
      }
    }
    lines.push('  </outline>')
  }
  lines.push('</outline>', '</body>', '</opml>', '')
  return lines.join('\n')
}

type Outline = { text: string; note: string; children: Outline[] }

// A small reader for the OPML shape above (and what MindNode writes back):
// nested <outline text="..."> elements, self-closing or not.
function readOutlines(xml: string): Outline[] {
  const root: Outline = { text: '', note: '', children: [] }
  const stack: Outline[] = [root]
  const re = /<outline\b([^>]*?)(\/?)>|<\/outline>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    if (m[0] === '</outline>') { if (stack.length > 1) stack.pop(); continue }
    const attrs = m[1]
    const attr = (name: string) => (attrs.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`)) ?? [])
    const text = unXml(attr('text')[1] ?? attr('text')[2] ?? '')
    const note = unXml(attr('_note')[1] ?? attr('_note')[2] ?? '')
    const node: Outline = { text, note, children: [] }
    stack[stack.length - 1].children.push(node)
    if (m[2] !== '/') stack.push(node)
  }
  return root.children
}

// The picture read back from the mind map file. Parts keep their promises by
// name (a renamed part starts with none, and the page says so). Returns null
// when the file is not the shape BOB wrote.
export function toProduct(xml: string, previous: Product | null): Product | null {
  const top = readOutlines(xml.replace(/<!--[\s\S]*?-->/g, ''))
  if (!top.length) return null
  const rootNode = top.length === 1 && top[0].children.some(c => KINDS.some(k => k.heading === c.text)) ? top[0] : null
  const groups = rootNode ? rootNode.children : top
  if (!groups.some(g => KINDS.some(k => k.heading === g.text))) return null
  const name = rootNode?.text || previous?.name || 'the product'
  const nodes: Node[] = []
  const arrows: { fromId: string; text: string }[] = []
  const used = new Set<string>()
  // A heading renamed in MindNode keeps its parts: each part keeps the kind it
  // had before by name, else the group's heading if known, else a step. A part
  // nested under a part is read as a part of the same kind (one level only was
  // read before and the rest was dropped: QA, 29 October 2026).
  const prevByName = (name: string) => previous?.nodes.find(n => n.name.trim().toLowerCase() === name.trim().toLowerCase())
  const addPart = (leaf: Outline, kind: Kind) => {
    if (leaf.text.startsWith('\u2192') || !leaf.text.trim()) return
    let id = slug(leaf.text)
    while (used.has(id)) id = `${id}-2`
    used.add(id)
    const prev = prevByName(leaf.text)
    nodes.push({ id, kind: prev?.kind ?? kind, name: leaf.text.trim(), says: leaf.note || prev?.says || '', promises: prev?.promises ?? [] })
    for (const c of leaf.children) {
      if (c.text.startsWith('\u2192')) arrows.push({ fromId: id, text: c.text })
      else addPart(c, prev?.kind ?? kind)
    }
  }
  for (const g of groups) {
    const known = KINDS.find(k => k.heading === g.text)?.kind
    const kind: Kind = known ?? (g.children.map(c => prevByName(c.text)?.kind).find(Boolean) as Kind | undefined) ?? 'step'
    for (const leaf of g.children) addPart(leaf, kind)
  }
  if (!nodes.length) return null
  const byName = (s: string) => nodes.find(n => n.name.trim().toLowerCase() === s.trim().toLowerCase())
  const edges: Edge[] = []
  for (const a of arrows) {
    const body = a.text.replace(/^→\s*/, '')
    const i = body.indexOf(':')
    const target = byName(i >= 0 ? body.slice(0, i) : body)
    if (target) edges.push({ from: a.fromId, to: target.id, what: i >= 0 ? body.slice(i + 1).trim() : '' })
  }
  return { name, nodes, edges }
}
