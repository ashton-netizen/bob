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
  const prevByName = (name: string) => previous?.nodes.find(n => n.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? nearest(name)
  // A part whose name was edited a little (a typo fixed, a word changed) keeps
  // its promises and kind: a previous part that no longer appears by name and
  // shares most of its words is the same part (QA, 29 October 2026: a
  // spelling fix read back as a new part and dropped two promises).
  const texts = new Set<string>()
  const walk = (o: Outline) => { texts.add(o.text.trim().toLowerCase()); o.children.forEach(walk) }
  top.forEach(walk)
  const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2))
  function nearest(name: string): Node | undefined {
    const w = words(name)
    if (!previous || w.size < 2) return undefined
    let best: { n: Node; score: number } | undefined
    for (const n of previous.nodes) {
      if (texts.has(n.name.trim().toLowerCase())) continue
      const v = words(n.name)
      const common = [...w].filter(x => v.has(x)).length
      const score = common / Math.max(w.size, v.size)
      if (score >= 0.6 && (!best || score > best.score)) best = { n, score }
    }
    return best?.n
  }
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
    // A new branch off the centre with nothing under it is a part the person
    // added (Ash, 29 October 2026: an outcome, so "what it produces").
    // With children under it that were never parts before, the branch and its
    // children are all new parts (product-manager review, 29 October 2026: the
    // branch itself was lost and only its children were read).
    if (!known && !g.text.startsWith('\u2192') && !g.children.some(c => prevByName(c.text))) { addPart(g, prevByName(g.text)?.kind ?? 'output'); continue }
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


// ---------------------------------------------------------------------------
// MindNode's own file. MindNode Classic saves a .mindnode package (contents.xml,
// a binary plist) where the person last saved, not into BOB's OPML (seen 29
// October 2026). BOB finds the file by the product's name with Spotlight and
// reads it back through `plutil -convert xml1`, which every Mac has. This reads
// the XML plist form: the main node's title is the product, its children the
// seven headings, theirs the parts, and a child "→ part: what" an arrow.
// ---------------------------------------------------------------------------

type PlistValue = string | number | boolean | PlistValue[] | { [k: string]: PlistValue }

export function plistXml(xml: string): PlistValue | null {
  const tags = [...xml.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>/g)]
  let i = 0
  const textBetween = (from: number, to: number) => xml.slice(from, to)
  const decode = (t: string) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')
  const read = (): PlistValue | null => {
    const t = tags[i]
    if (!t) return null
    const [, close, name, , self] = t
    if (close) { i++; return null }
    if (self && name === 'array') { i++; return [] }
    if (self && name === 'dict') { i++; return {} }
    if (name === 'dict') {
      i++
      const out: { [k: string]: PlistValue } = {}
      while (tags[i] && !(tags[i][1] === '/' && tags[i][2] === 'dict')) {
        const k = tags[i]
        if (k[2] !== 'key') { i++; continue }
        const key = decode(textBetween(k.index! + k[0].length, tags[i + 1].index!))
        i += 2 // past <key> and </key>
        const v = read()
        if (v !== null) out[key] = v
      }
      i++ // </dict>
      return out
    }
    if (name === 'array') {
      i++
      const out: PlistValue[] = []
      while (tags[i] && !(tags[i][1] === '/' && tags[i][2] === 'array')) { const v = read(); if (v !== null) out.push(v) }
      i++
      return out
    }
    if (name === 'true' || name === 'false') { i++; return name === 'true' }
    if (self) { i++; return name === 'string' ? '' : null }
    // string, integer, real, date, data: text up to the closing tag
    const closeTag = tags[i + 1]
    const raw = closeTag ? textBetween(t.index! + t[0].length, closeTag.index!) : ''
    i += 2
    if (name === 'integer' || name === 'real') return Number(raw)
    return decode(raw)
  }
  // skip the <?xml …?> and <!DOCTYPE> (not matched as tags) and the <plist> wrapper
  while (tags[i] && tags[i][2] !== 'plist') i++
  i++
  const v = read()
  return v
}

const plainTitle = (t: PlistValue | undefined): string => {
  const raw = t && typeof t === 'object' && !Array.isArray(t) ? String((t as Any).text ?? '') : String(t ?? '')
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").trim()
}

// The picture read back from MindNode's own file (its XML plist form).
export function toProductFromMindNode(plistXmlText: string, previous: Product | null): Product | null {
  const root = plistXml(plistXmlText) as Any
  const main = root?.canvas?.mindMaps?.[0]?.mainNode
  if (!main) return null
  const toOutline = (n: Any): Outline => ({ text: plainTitle(n.title), note: plainTitle(n.note), children: ((n.subnodes ?? []) as Any[]).map(toOutline) })
  const outline = toOutline(main)
  // Reuse the OPML reader's walk by handing it the same shape.
  const xml = outlineToOpml(outline)
  return toProduct(xml, previous)
}

const escX = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function outlineToOpml(o: Outline): string {
  const line = (n: Outline): string => n.children.length
    ? `<outline text="${escX(n.text)}"${n.note ? ` _note="${escX(n.note)}"` : ''}>${n.children.map(line).join('')}</outline>`
    : `<outline text="${escX(n.text)}"${n.note ? ` _note="${escX(n.note)}"` : ''}/>`
  return `<opml version="2.0"><body>${line(o)}</body></opml>`
}
