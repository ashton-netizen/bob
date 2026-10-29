import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Pending, Preflight } from '../types'
import { buildMapData, designMapData, renderMap, QUESTION, type MapData, type MapFile } from './map'
import { lightUp, toOpml, toProduct, type Product } from './product'
import { STALE_MS, activeIncrement, canonical, approvalVerdict, clipText, describe, evidenceFor, renderStatusHtml, scopeHashOf, sha256Bytes, short, stateWords, statusText, titleOf, when } from './board'
import { WORKSPACE_FILE, WORKSPACE_REPAIR } from './board'
import type { Any, Model, Place, Verdict } from './board'

// BOB, Build 1. One hooks module: the board pane, Gate A (approval), Gate B
// (evidence), the state-table guard, the session preflight and /bob.
//
// States, transitions and evidence kinds are READ from bob/schema.json in the
// plugin's own folder. Nothing here restates them. A governed repo is one with
// bob/brief.json; a repo without one is shown from fixtures/ (synthetic) and
// the gates idle. The gates never act on fixture records.

const PANE = 'bob-board'
const TITLE = 'BOB'

const preflightAtom = atom({ plugin: 'bob', key: 'preflight' } as const, null as Preflight | null)
const baselineAtom = atom({ plugin: 'bob', key: 'baseline' } as const, [] as string[])
const touchedAtom = atom({ plugin: 'bob', key: 'touched' } as const, [] as string[])
// Gate B's carry-over (R-bob-10): a round that ended with unproven writes.
const pendingAtom = atom({ plugin: 'bob', key: 'pending' } as const, null as Pending | null)
// R-bob-18: set when Gate B takes new evidence into the baseline during a round,
// so the round that gained it is never judged unproven afterwards.
const provenAtom = atom({ plugin: 'bob', key: 'proven' } as const, false as boolean)
// The last pane action's outcome, shown in the pane (R-bob-09).
const noteAtom = atom({ plugin: 'bob', key: 'note' } as const, null as string | null)
// The main loop's running turn, for Pause (R-bob-12); null between turns.
const turnAtom = atom({ plugin: 'bob', key: 'turn' } as const, null as string | null)
// The run an Approve click started (phase one, R-bob-demo-17): closed with a
// finished event when the turn it started ends; null when no click started one.
const runAtom = atom({ plugin: 'bob', key: 'run' } as const, null as string | null)
// The turn the click landed in (its Stop must not close the run; the next turn's does).
const runTurnAtom = atom({ plugin: 'bob', key: 'runTurn' } as const, '' as string)

type Engine = Any

async function readText($: Engine, path: string): Promise<string | null> {
  try {
    return (await $.fs.read(path)) as string
  } catch {
    return null
  }
}

async function readJson($: Engine, path: string, errors: string[]): Promise<Any | null> {
  const text = await readText($, path)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    errors.push(`${path} does not parse as JSON`)
    return null
  }
}

async function exists($: Engine, path: string): Promise<boolean> {
  try {
    return Boolean(await $.fs.exists(path))
  } catch {
    return false
  }
}

async function sha256File($: Engine, path: string): Promise<string | null> {
  try {
    const { base64 } = (await $.fs.read(path, { as: 'bytes' })) as { base64: string }
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return await sha256Bytes(bytes)
  } catch {
    return null
  }
}

const at = (root: string, path: string) => `${root}/${path}`

// Build 3 (Cowork ADR-03): the BOB workspace. One folder per machine, opened as
// a saved environment, holds bob-workspace.json and one subfolder per project.
// A session on it works on the CURRENT project, so every repo path resolves
// under that subfolder: the gates, the preflight, /bob adopt and the pane all
// follow /bob switch. A file that does not parse fails closed (Gate A refuses).


async function locate($: Engine): Promise<Place> {
  const session = String(await $.session.root()).replace(/\/+$/, '')
  const folder = session.replace(/^.*\//, '') || session
  const plain: Place = { session, root: session, workspace: null, workspaceError: null, project: folder }
  if (!(await exists($, at(session, WORKSPACE_FILE)))) return plain
  const errors: string[] = []
  const workspace = await readJson($, at(session, WORKSPACE_FILE), errors)
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) return { ...plain, workspaceError: errors[0] ?? `${at(session, WORKSPACE_FILE)} is not a JSON object` }
  const current = ((workspace.projects ?? []) as Any[]).find(p => p && p.name === workspace.current)
  if (!current) return { ...plain, workspace, project: '' }
  const path = String(current.path ?? '')
  if (!path || path.startsWith('/') || path.split('/').includes('..')) return { ...plain, workspaceError: `${WORKSPACE_FILE}: project ${current.name} has path "${path}", which is not a subfolder of the workspace` }
  return { session, root: at(session, path), workspace, workspaceError: null, project: String(current.name) }
}

// The repo root, absolute: the current project inside a workspace, else the
// session root. The one home for resolving a repo path.
async function repoRoot($: Engine): Promise<string> {
  return (await locate($)).root
}

async function load($: Engine): Promise<Model> {
  const parseErrors: string[] = []
  const place = await locate($)
  const root = place.root
  const schema = await readJson($, `${$.plugin.root}/bob/schema.json`, parseErrors)
  const governed = await exists($, at(root, 'bob/brief.json'))
  // The repo's own ledger wins over fixtures as soon as it exists, brief or not.
  const ownLedger = governed || (await exists($, at(root, 'bob/ledger.json')))
  const fixtures = !ownLedger && (await exists($, at(root, 'fixtures/ledger.json')))
  const dir = ownLedger ? 'bob' : 'fixtures'
  const brief = await readJson($, at(root, `${dir}/brief.json`), parseErrors)
  const approvals = ((await readJson($, at(root, `${dir}/approvals.json`), parseErrors))?.approvals ?? []) as Any[]
  const ledgerPath = `${dir}/ledger.json`
  const ledger = await readJson($, at(root, ledgerPath), parseErrors)
  let ledgerMtimeMs: number | null = null
  try {
    ledgerMtimeMs = Number((await $.fs.stat(at(root, ledgerPath))).mtimeMs)
  } catch {
    ledgerMtimeMs = null
  }
  const hash = brief ? await sha256File($, at(root, `${dir}/brief.json`)) : null
  const scopeHash = brief ? await scopeHashOf(brief) : null
  return { root, place, governed, ownLedger, fixtures, schema, brief, approvals, ledger, ledgerPath, ledgerMtimeMs, hash, scopeHash, parseErrors }
}

// The test kit's $ has no ui.invalidate; a live session does.
// docs/status.html: the board as a branded page in the governed repo, so a
// Stepper can open it with no session running. Never from fixtures.
// bob/map.json: where each promise sits on the ten stages, short labels, and the
// product schematic. Written by the design room; absent means stage 8 for all.
async function readMapFile($: Engine, m: Model): Promise<MapFile> {
  const file = await readJson($, at(m.root, 'bob/map.json'), [])
  return file && typeof file === 'object' ? (file as MapFile) : {}
}

// The picture of the product (bob/product.json) and its mind map twin
// (docs/product.opml). When the person saved the mind map more recently than
// the picture file, their edits win: BOB reads them back into product.json.
// When the picture is newer, BOB rewrites the mind map. Nothing here passes
// through Gate A: these are BOB's own files, views of the brief.
async function mtime($: Engine, path: string): Promise<number | null> {
  try { return Number((await $.fs.stat(path)).mtimeMs) } catch { return null }
}

async function readPicture($: Engine, m: Model): Promise<{ product: Product | null; editedAt: string | null }> {
  const jsonPath = at(m.root, 'bob/product.json')
  const opmlPath = at(m.root, 'docs/product.opml')
  let product = (await readJson($, jsonPath, [])) as Product | null
  if (product && (!Array.isArray(product.nodes) || !Array.isArray(product.edges))) product = null
  const jsonAt = await mtime($, jsonPath)
  const opmlAt = await mtime($, opmlPath)
  let editedAt: string | null = null
  if (opmlAt !== null && (jsonAt === null || opmlAt > jsonAt + 1000)) {
    const xml = await readText($, opmlPath)
    const edited = xml === null ? null : toProduct(xml, product)
    if (!edited) await update($, noteAtom, () => 'Your mind map was saved but BOB could not read it as a picture (it needs the seven headings BOB wrote). The last picture stands; press Edit the picture to reopen it.')
    if (edited) {
      if (product) await $.fs.write(at(m.root, 'bob/product.previous.json'), pretty(product))
      product = edited
      editedAt = new Date(opmlAt).toISOString()
      await $.fs.write(jsonPath, pretty({ $comment: 'Read back from docs/product.opml (your mind map) by BOB. Edit either; the newer one wins.', ...edited }))
    }
  } else if (product && (opmlAt === null || (jsonAt !== null && jsonAt > opmlAt + 1000))) {
    await $.fs.write(opmlPath, toOpml(product))
  }
  return { product, editedAt }
}

async function pictureOf($: Engine, m: Model) {
  const { product, editedAt } = await readPicture($, m)
  if (!product) return null
  return lightUp(product, (m.brief?.requirements ?? []) as Any[], (m.ledger?.evidence ?? []) as Any[], editedAt)
}

async function writePage($: Engine) {
  try {
    const m = await load($)
    if (!m.ownLedger) {
      // A project being designed, or a fresh one with nothing yet: the same
      // ten-stage map, with the one question when nothing has started.
      if (m.place.workspace && !m.place.project) return
      const d = await designOf($, m)
      const done = d ? d.done : STAGES.map(() => false)
      if (d || (m.place.workspace && m.place.project)) await writeMap($, m, null, designMapData(m, String(m.place?.project ?? 'this project'), STAGES, done, new Date().toISOString(), await readMapFile($, m), await pictureOf($, m)))
      return
    }
    const b = describe(m, await read($, preflightAtom), Date.now())
    const project = String(m.brief?.project?.name ?? m.place?.project ?? m.root.split('/').pop() ?? 'this project')
    await $.fs.write(at(m.root, 'docs/status.html'), renderStatusHtml(b, { project, generatedAt: new Date().toISOString(), repo: m.root }, await pageAssets($)))
    await writeMap($, m, b)
    await writeNow($, m, b)
  } catch {
    // the page is a view; a failure to write it never blocks a session
  }
}

// Phase two (R-bob-demo-08, the new-hire test of 29 October 2026: a fresh
// reader could not tell which round was running from the files). BOB keeps a
// "Now" block at the top of docs/project-status.md, rewritten in place at
// session start and after every command, in plain words: the round, the
// approval, the proven count, the next step with its doer, and where the pages
// are. The log below it is never touched.
const NOW_OPEN = '<!-- BOB now -->'
const NOW_CLOSE = '<!-- /BOB now -->'

async function writeNow($: Engine, m: Model, b: ReturnType<typeof describe>) {
  const path = at(m.root, 'docs/project-status.md')
  const current = await readText($, path)
  if (current === null) return
  const reqs = ((m.brief?.requirements ?? []) as Any[])
  const evidence = ((m.ledger?.evidence ?? []) as Any[])
  const proven = reqs.filter(r => ['verified', 'accepted'].includes(String(r.state)) && evidence.some(e => e.requirement_id === r.id)).length
  const file = await readMapFile($, m)
  const links = ((file as Any).published ?? {}) as Record<string, string>
  const where = ['docs/map.html (the picture)', 'docs/status.html (the status page)'].concat(Object.entries(links).map(([k, v]) => `${k}: ${v}`)).join('; ')
  const lines = [
    NOW_OPEN,
    `**Now (written by BOB at ${when(new Date().toISOString())}; the log below is history):**`,
    `- ${/^idle/.test(b.increment) ? 'No round running' : `Round running: ${b.increment.replace(/ · .*$/, '')}`}${b.approval && b.approval !== 'missing' && b.approval !== 'none' ? `, ${b.approval}` : ''}.`,
    `- ${proven} of ${reqs.length} promises proven.`,
    `- Next step: ${b.next}.`,
    `- Where to look: ${where}.`,
    NOW_CLOSE,
  ].join('\n')
  const stripped = current.replace(new RegExp(`\\n?${NOW_OPEN}[\\s\\S]*?${NOW_CLOSE}\\n?`), '\n')
  const firstBreak = stripped.indexOf('\n')
  const next = firstBreak >= 0 && stripped.startsWith('#') ? `${stripped.slice(0, firstBreak)}\n\n${lines}\n${stripped.slice(firstBreak).replace(/^\n+/, '\n')}` : `${lines}\n\n${stripped}`
  if (next !== current) await $.fs.write(path, next)
}

// The real BOB files for both pages: the character and the two lockups.
async function pageAssets($: Engine): Promise<{ character: string; dark: string; light: string } | null> {
  try {
    const png = async (name: string) => String(((await $.fs.read(`${$.plugin.root}/assets/bob/web/${name}.png`, { as: 'bytes' })) as { base64: string }).base64)
    return { character: await png('character-280'), dark: await png('lockup-dark-760'), light: await png('lockup-light-760') }
  } catch {
    return null
  }
}

// docs/map.html, the project as a map. The template and the approved
// character and lockups ship with the plugin (templates/map.html,
// assets/bob/web/); the dots come from the records and nothing else.
async function writeMap($: Engine, m: Model, b: ReturnType<typeof describe> | null, data?: MapData) {
  try {
    const template = await readText($, `${$.plugin.root}/templates/map.html`)
    if (template === null) return
    const assets = await pageAssets($)
    if (!assets) return
    await $.fs.write(at(m.root, 'docs/map.html'), renderMap(template, assets, data ?? buildMapData(m, b as ReturnType<typeof describe>, new Date().toISOString(), await readMapFile($, m), await pictureOf($, m))))
  } catch {
    // a missing asset never blocks a session; the board page is still written
  }
}

const redraw = ($: Engine) => {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // the kit's $ has no invalidate; nothing to redraw there
  }
}

// ---------------------------------------------------------------------------
// Build 2: /bob adopt and /bob approve.
//
// adopt reads docs/evidence/adopt/adopt-proposal.json, validates every record
// against bob/schema.json in the plugin folder, and writes the bob/ files with
// bob/brief.json LAST, so Gate A engages only once every file exists. It never
// commits: committing stays a Gate A decision.
//
// approve is typed by a person and is the only writer of bob/approvals.json.
// It appends one immutable record and sets the named increment active. A
// plugin, the SDK or a scheduled prompt cannot approve.
// ---------------------------------------------------------------------------

const PROPOSAL_PATH = 'docs/evidence/adopt/adopt-proposal.json'
const BOB_FILES = ['bob/brief.json', 'bob/ledger.json', 'bob/sources.json', 'bob/approvals.json'] as const
const NON_HUMAN_ORIGINS = ['plugin', 'sdk', 'task-notification', 'scheduled', 'auto-continuation', 'coordinator', 'observer', 'observer-activity', 'peer-send-message', 'projects-relay', 'channel']

const stamp = () => new Date().toISOString()
const pretty = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`

// Every record carries id, created_at, source (a schema value) and is_synthetic
// false. The proposal is for a real repo: fixtures/ is the only home for
// synthetic records.
function baseRefusals(schema: Any, rec: Any, where: string): string[] {
  const out: string[] = []
  const required: string[] = schema?.record_base?.required ?? ['id', 'created_at', 'source', 'is_synthetic']
  const sources: string[] = schema?.record_base?.source_values ?? ['human', 'ai', 'tool']
  if (!rec || typeof rec !== 'object') return [`${where}: not a record`]
  const label = `${where} ${rec.id ?? '(no id)'}`
  for (const f of required) if (!(f in rec)) out.push(`${label}: missing ${f}`)
  if ('source' in rec && !sources.includes(rec.source)) out.push(`${label}: source "${rec.source}" is not one of ${sources.join(', ')}`)
  if ('is_synthetic' in rec && rec.is_synthetic !== false) out.push(`${label}: is_synthetic must be false in a real repo (fixtures/ is the only home for synthetic records)`)
  return out
}

function proposalRefusals(schema: Any, p: Any): string[] {
  const out: string[] = []
  if (!p || typeof p !== 'object') return ['the proposal is not a JSON object']
  const brief = p.brief, ledger = p.ledger, sources = p.sources
  if (!brief || typeof brief !== 'object') out.push('proposal.brief is missing')
  if (!ledger || typeof ledger !== 'object') out.push('proposal.ledger is missing')
  if (!Array.isArray(sources)) out.push('proposal.sources is missing or not an array')
  if (out.length) return out
  if (Array.isArray(p.approvals) && p.approvals.length) out.push('proposal.approvals must be empty: /bob approve is the only writer of bob/approvals.json')

  const req = schema?.requirement ?? {}
  const states: string[] = req.states ?? []
  const priorities: string[] = req.priority_values ?? []
  const kinds: string[] = schema?.evidence?.kinds ?? []
  const evOrigins: string[] = schema?.evidence?.origin_values ?? []
  const evidence: Any[] = Array.isArray(ledger.evidence) ? ledger.evidence : []

  if (brief.project) out.push(...baseRefusals(schema, brief.project, 'brief.project'))
  const reqs: Any[] = Array.isArray(brief.requirements) ? brief.requirements : []
  if (!reqs.length) out.push('brief.requirements is empty')
  for (const r of reqs) {
    out.push(...baseRefusals(schema, r, 'requirement'))
    if (!states.includes(r.state)) out.push(`requirement ${r.id}: state "${r.state}" is not a state in bob/schema.json`)
    if (priorities.length && !priorities.includes(r.priority)) out.push(`requirement ${r.id}: priority "${r.priority}" is not one of ${priorities.join(', ')}`)
    if (['verified', 'accepted'].includes(r.state)) {
      const backed = evidence.some(ev => ev.requirement_id === r.id && kinds.includes(ev.kind))
      if (!backed) out.push(`requirement ${r.id}: state ${r.state} needs an evidence record in ledger.evidence (kind ${kinds.join(', ')}) and none exists. Model prose is never evidence; use reported or not_assessed`)
    }
  }
  for (const key of ['decisions', 'assumptions', 'outputs']) {
    for (const rec of (Array.isArray(brief[key]) ? brief[key] : []) as Any[]) out.push(...baseRefusals(schema, rec, `brief.${key}`))
  }

  const incStates: string[] = schema?.increment?.states ?? []
  for (const inc of (Array.isArray(ledger.increments) ? ledger.increments : []) as Any[]) {
    out.push(...baseRefusals(schema, inc, 'increment'))
    if (!incStates.includes(inc.state)) out.push(`increment ${inc.id}: state "${inc.state}" is not a state in bob/schema.json`)
    if (inc.state === 'active') out.push(`increment ${inc.id}: adopt cannot propose an active increment; approval is a person\u2019s press on Approve in the BOB pane`)
    const reqIds = new Set(reqs.map(r => String(r.id)))
    for (const id of (inc.requirement_ids ?? []) as string[]) if (!reqIds.has(id)) out.push(`increment ${inc.id}: requirement ${id} is not in brief.requirements`)
  }
  // Phase rounds (Ash, 29 October 2026): one approval per phase, never one per fix.
  // INC-00 governs, then at most two phases; no promise is left outside a phase.
  const proposed: Any[] = Array.isArray(ledger.increments) ? ledger.increments : []
  if (proposed.length > 3) out.push(`the proposal has ${proposed.length} increments; BOB rounds are phases: INC-00 (govern), phase one (a working look) and phase two (the rest), so at most 3`)
  const planned = new Set(proposed.flatMap(i => (i.requirement_ids ?? []) as string[]))
  for (const r of reqs) if (!['verified', 'accepted'].includes(r.state) && !planned.has(String(r.id))) out.push(`requirement ${r.id} is in no increment; put it in phase one or phase two`)
  const runStates: string[] = schema?.run?.states ?? []
  for (const run of (Array.isArray(ledger.runs) ? ledger.runs : []) as Any[]) {
    out.push(...baseRefusals(schema, run, 'run'))
    if (!runStates.includes(run.state)) out.push(`run ${run.id}: state "${run.state}" is not a state in bob/schema.json`)
  }
  for (const ev of (Array.isArray(ledger.events) ? ledger.events : []) as Any[]) out.push(...baseRefusals(schema, ev, 'event'))
  for (const ev of evidence) {
    out.push(...baseRefusals(schema, ev, 'evidence'))
    if (!kinds.includes(ev.kind)) out.push(`evidence ${ev.id}: kind "${ev.kind}" is not one of ${kinds.join(', ')}`)
    if (evOrigins.length && !evOrigins.includes(ev.origin)) out.push(`evidence ${ev.id}: origin "${ev.origin}" is not one of ${evOrigins.join(', ')}`)
    if (!ev.ref) out.push(`evidence ${ev.id}: ref is empty; evidence points at a file`)
  }

  const access: string[] = schema?.source?.access_values ?? []
  const processing: string[] = schema?.source?.processing_values ?? []
  for (const s of sources as Any[]) {
    out.push(...baseRefusals(schema, s, 'source'))
    if (!access.includes(s.access)) out.push(`source ${s.id}: access "${s.access ?? '(missing)'}" is not one of ${access.join(', ')}`)
    if (!processing.includes(s.processing)) out.push(`source ${s.id}: processing "${s.processing ?? '(missing)'}" is not one of ${processing.join(', ')}`)
  }
  return out
}

const refusedText = (what: string, reasons: string[], next = what === 'adopt' ? `Claude: fix the proposal at ${PROPOSAL_PATH}; Ash then presses Adopt in the BOB pane` : 'Ash needs to: fix what is named above, then try again from the BOB pane') =>
  [`BOB ${what} refused. Nothing was written.`, ...reasons.map(r => `- ${r}`), `Next action: ${next}.`].join('\n')


async function adopt($: Engine): Promise<string> {
  const errors: string[] = []
  const schema = await readJson($, `${$.plugin.root}/bob/schema.json`, errors)
  if (!schema) return refusedText('adopt', ['bob/schema.json is missing or does not parse in the plugin folder. Ash needs to reinstall BOB'])

  const place = await locate($)
  if (place.workspaceError) return refusedText('adopt', [place.workspaceError], WORKSPACE_REPAIR)
  if (place.workspace && !place.project) return refusedText('adopt', ['this is the BOB workspace and no project is current, so there is nothing to adopt'], 'Ash needs to: open a project from the Projects box in the BOB pane, or start one there')
  const root = place.root
  // R-bob-05: a repo that already holds a ledger (or sources, or approvals) but no
  // brief is adopted by merging, never by overwriting. Only bob/brief.json means
  // the repo is governed already.
  if (await exists($, at(root, 'bob/brief.json'))) return refusedText('adopt', ["bob/brief.json already exists; adopt never overwrites a governed repo's files"])
  const priorErrors: string[] = []
  const priorLedger = (await readJson($, at(root, 'bob/ledger.json'), priorErrors)) as Any | null
  const priorSources = (await readJson($, at(root, 'bob/sources.json'), priorErrors)) as Any | null
  if (priorErrors.length) return refusedText('adopt', priorErrors)
  const hasApprovals = await exists($, at(root, 'bob/approvals.json'))

  const text = await readText($, at(root, PROPOSAL_PATH))
  if (text === null) return refusedText('adopt', [`${PROPOSAL_PATH} not found under ${root}. The adopt-under-bob skill writes it`])
  let p: Any
  try {
    p = JSON.parse(text)
  } catch {
    return refusedText('adopt', [`${PROPOSAL_PATH} does not parse as JSON`])
  }
  const reasons = proposalRefusals(schema, p)
  if (reasons.length) return refusedText('adopt', reasons)

  const brief: Any = {
    $comment: 'Written by /bob adopt from docs/evidence/adopt/adopt-proposal.json. States and transitions: bob/schema.json in the BOB plugin. No state here comes from prose.',
    project: p.brief.project ?? null,
    requirements: p.brief.requirements,
    decisions: p.brief.decisions ?? [],
    assumptions: p.brief.assumptions ?? [],
    outputs: p.brief.outputs ?? [],
  }
  const ledger: Any = {
    $comment: 'Written by /bob adopt. Evidence records are written by hand from tool results; model prose is never evidence.',
    increments: p.ledger.increments ?? [],
    runs: p.ledger.runs ?? [],
    events: p.ledger.events ?? [],
    evidence: p.ledger.evidence ?? [],
  }
  const sources: Any = { $comment: 'Written by /bob adopt. access and processing say what was observed; a source nobody opened is never extracted.', sources: p.sources }

  // Merge into what is already there: existing records first and untouched, the
  // proposal's records after them. A reused id with different content refuses.
  const clashes: string[] = []
  const mergeList = (kind: string, prior: Any[], added: Any[]): Any[] => {
    const byId = new Map(prior.map(r => [String(r.id), canonical(r)]))
    const fresh: Any[] = []
    for (const r of added) {
      const seen = byId.get(String(r.id))
      if (seen === undefined) fresh.push(r)
      else if (seen !== canonical(r)) clashes.push(`${kind} ${r.id} already exists with different content`)
    }
    return [...prior, ...fresh]
  }
  const mergedLedger: Any = priorLedger
    ? {
        ...priorLedger,
        increments: mergeList('increment', priorLedger.increments ?? [], ledger.increments),
        runs: mergeList('run', priorLedger.runs ?? [], ledger.runs),
        events: mergeList('event', priorLedger.events ?? [], ledger.events),
        evidence: mergeList('evidence', priorLedger.evidence ?? [], ledger.evidence),
      }
    : ledger
  const mergedSources: Any = priorSources ? { ...priorSources, sources: mergeList('source', priorSources.sources ?? [], sources.sources) } : sources
  if (clashes.length) return refusedText('adopt', clashes, `Claude: change the ids in ${PROPOSAL_PATH}; Ash then presses Adopt in the BOB pane`)

  const wrote: string[] = []
  await $.fs.write(at(root, 'bob/ledger.json'), pretty(mergedLedger)); wrote.push('bob/ledger.json')
  await $.fs.write(at(root, 'bob/sources.json'), pretty(mergedSources)); wrote.push('bob/sources.json')
  if (!hasApprovals) { await $.fs.write(at(root, 'bob/approvals.json'), pretty({ approvals: [] })); wrote.push('bob/approvals.json') }
  // Last on purpose: Gate A engages the moment this file exists.
  await $.fs.write(at(root, 'bob/brief.json'), pretty(brief)); wrote.push('bob/brief.json')

  const incIds = (ledger.increments as Any[]).map(i => `${i.id} ${i.state}`).join(', ')
  const name = String(p.brief.project?.name ?? 'this repo')
  const first = (ledger.increments as Any[])[0]
  const line = `- adopt, ${stamp()}: implemented. bob/brief.json (${(brief.requirements as Any[]).length} requirements), bob/ledger.json (${incIds || 'no increments'}; ${(ledger.evidence as Any[]).length} evidence records), bob/sources.json (${(p.sources as Any[]).length} sources), bob/approvals.json (empty). Evidence: ${PROPOSAL_PATH}. Ash needs to: press Approve for “${titleOf(first)}” in the BOB pane.`
  const current = await readText($, at(root, 'docs/project-status.md'))
  const status = current === null
    ? `# ${name} · project status (living file, update in place)\n\nGoverned by BOB. States and transitions: bob/schema.json in the BOB plugin.\n\n## Build log (one line per step: step, state, evidence)\n${line}\n`
    : `${current.replace(/\s*$/, '')}\n${line}\n`
  await $.fs.write(at(root, 'docs/project-status.md'), status); wrote.push(`docs/project-status.md (${current === null ? 'created' : 'one line appended'})`)

  return [
    `BOB adopt: wrote ${wrote.length} files, refused 0 (under ${root}).`,
    ...wrote.map(w => `- wrote ${w}`),
    `Gate A is now engaged: no increment is active, so every write is refused until Ash presses Approve for “${titleOf(first)}” in the BOB pane.`,
    'Nothing was committed: committing is a Gate A decision in the session.',
  ].join('\n')
}

// Rounds approved before the rule existed are exempt, by instant (a string
// compare let "…57.282Z" sort before "…57Z" and exempted the live round: QA,
// 29 October 2026). A verdict is a file that exists under docs/evidence/review/
// with something in it, named by an evidence record; a record alone is nothing.
const REVIEW_RULE_FROM_MS = Date.parse('2026-10-29T00:46:00Z')
async function reviewed($: Engine, m: Model, inc: Any): Promise<boolean> {
  const approval = m.approvals.find(a => a.id === inc.approval_id)
  const at_ = Date.parse(String(approval?.approved_at ?? ''))
  if (!Number.isNaN(at_) && at_ < REVIEW_RULE_FROM_MS) return true
  const refs = evidenceFor(m, (inc.requirement_ids ?? []) as string[]).map(ev => String(ev.ref ?? '')).filter(r => r.startsWith('docs/evidence/review/'))
  for (const r of refs) {
    const text = await readText($, at(m.root, r))
    if (text !== null && text.trim().length > 0) return true
  }
  return false
}

async function approve($: Engine, idArg: string, originKind: string | undefined): Promise<string> {
  const id = idArg.trim()
  if (!id) return refusedText('approve', ['no increment named; approve is pressed per round in the BOB pane'])
  if (originKind && NON_HUMAN_ORIGINS.includes(originKind)) return refusedText('approve', [`this command came from "${originKind}", not a person. Only a person at the prompt approves`])

  const m = await load($)
  if (!m.governed) return refusedText('approve', ['this repo is not governed (no bob/brief.json). Adopt it first: the BOB pane offers Adopt once a proposal exists'])
  if (!m.ledger || !m.brief) return refusedText('approve', ['bob/ledger.json or bob/brief.json is missing or does not parse'])
  if (m.parseErrors.length) return refusedText('approve', m.parseErrors)
  if (!m.hash) return refusedText('approve', ['bob/brief.json could not be hashed'])

  const increments: Any[] = m.ledger.increments ?? []
  const inc = increments.find(i => i.id === id)
  if (!inc) return refusedText('approve', [`${id} is not an increment in bob/ledger.json (${increments.map(i => i.id).join(', ') || 'none'})`])
  // R-bob-15: an active increment whose requirements are all verified or
  // accepted is closed by this approval, so adding scope costs one approval.
  const other = increments.find(i => i.state === 'active' && i.id !== id)
  if (other) {
    const reqs = ((m.brief.requirements ?? []) as Any[])
    const open = ((other.requirement_ids ?? []) as string[]).filter(rid => !['verified', 'accepted'].includes(String(reqs.find(r => r.id === rid)?.state)))
    if (open.length) return refusedText('approve', [`${other.id} is active and ${open.join(', ')} ${open.length === 1 ? 'is' : 'are'} not verified yet; one increment at a time. Verify them, or close ${other.id} (done or returned), before approving ${id}`])
    // Phase two (R-bob-demo-19): a round closes as done only with a reviewer's
    // verdict on file, an evidence record whose file sits under
    // docs/evidence/review/ (the Infinite Leverage reviewers at stage nine).
    // Rounds approved before this rule (the ledger says so) are exempt.
    if (!(await reviewed($, m, other))) return refusedText('approve', [`${other.id} has every promise verified but no reviewer's verdict on file: run the reviewers (product manager and QA) on the round and save their verdict as an evidence record with its file under docs/evidence/review/, then approve ${id}`], `Claude: run the reviewers on \u201c${titleOf(other)}\u201d and file the verdict under docs/evidence/review/`)
  }
  if (['done', 'returned'].includes(inc.state)) return refusedText('approve', [`${id} is ${inc.state}; a closed increment is not re-approved`])
  const dup = m.approvals.find(a => (a.scope_increment_ids ?? []).includes(id) && (a.brief_hash === m.hash || (a.scope_hash && a.scope_hash === m.scopeHash)))
  if (dup) return refusedText('approve', [`${id} is already approved by ${dup.id} at the current brief hash ${short(m.hash)}; approvals are immutable and never duplicated`])

  let approver = ''
  try {
    const ran = await $.process.run(['git', 'config', 'user.name'], { cwd: m.root })
    approver = String(ran.stdout ?? '').trim()
  } catch {
    approver = ''
  }
  if (!approver) return refusedText('approve', ['git config user.name is empty, so the approver cannot be named. Ash needs to run: git config user.name "<name>"'])

  const n = m.approvals.length + 1
  const now = stamp()
  const record = {
    id: `AP-${String(n).padStart(2, '0')}`,
    brief_hash: m.hash,
    scope_hash: m.scopeHash,
    scope_increment_ids: [id],
    approver,
    approved_at: now,
    created_at: now,
    source: 'human',
    is_synthetic: false,
  }
  const approvalsFile = (await readJson($, at(m.root, 'bob/approvals.json'), [])) ?? {}
  await $.fs.write(at(m.root, 'bob/approvals.json'), pretty({ ...approvalsFile, approvals: [...m.approvals, record] }))

  const ledger = {
    ...m.ledger,
    increments: increments.map(i => (i.id === id ? { ...i, state: 'active', approval_id: record.id } : other && i.id === other.id ? { ...i, state: 'done' } : i)),
  }
  await $.fs.write(at(m.root, 'bob/ledger.json'), pretty(ledger))
  redraw($)

  return [
    `BOB approve: ${record.id} written to bob/approvals.json by ${approver} for ${id} at brief hash ${short(m.hash)}.`,
    ...(other ? [`${other.id} closed (done): every requirement in it is verified.`] : []),
    `${id} is now active (approved, then active). Gate A allows writes under it; Gate B requires evidence for ${(inc.requirement_ids ?? []).join(', ') || 'its requirement ids'} before a round that writes can end.`,
    'Nothing was committed.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Build 3: /bob new and /bob switch (Cowork ADR-03). A person types them in a
// session opened on the BOB workspace. new makes a project subfolder (git init
// on main, nothing committed), writes its status file, copies the workspace
// CLAUDE.md template once, then writes bob-workspace.json LAST with the project
// current. switch makes an existing subfolder current, registering it when
// something else made it (the design room does). Neither runs any other git.
// The name rules live in bob/schema.json (workspace).
// ---------------------------------------------------------------------------

const RETYPE = 'Ash needs to: fix what is named above and try again, or tell Claude the idea and Claude starts it'

async function workspaceRules($: Engine): Promise<Any | null> {
  return ((await readJson($, `${$.plugin.root}/bob/schema.json`, [])) ?? {}).workspace ?? null
}

async function placeRefusals($: Engine, place: Place, rules: Any, name: string): Promise<string[]> {
  const out: string[] = []
  if (place.workspaceError) out.push(`${place.workspaceError}. ${WORKSPACE_REPAIR}`)
  if (!new RegExp(String(rules.project_name_pattern)).test(name)) out.push(`"${name}" is not a project name: use lowercase letters, digits and hyphens, up to 40 characters, starting with a letter or digit`)
  else if (((rules.reserved_names ?? []) as string[]).includes(name)) out.push(`"${name}" is a reserved name inside a BOB workspace`)
  if (!place.workspace && !place.workspaceError) {
    if (await exists($, at(place.session, '.git'))) out.push(`${place.session} is a git repo, so it is a project, not the BOB workspace. /bob new and /bob switch run in the workspace folder (one per machine, for example ~/BOB), where each project is a subfolder`)
    else if ((await exists($, at(place.session, 'bob/brief.json'))) || (await exists($, at(place.session, 'bob/ledger.json')))) out.push(`${place.session} holds bob/ files, so it is a project, not the BOB workspace`)
  }
  return out
}

// Writes bob-workspace.json with `name` current, adding its record when new.
async function registerProject($: Engine, place: Place, name: string, source: string): Promise<boolean> {
  const now = stamp()
  const file: Any = place.workspace ?? {
    $comment: `The BOB workspace register. Written only by /bob new and /bob switch; never edit by hand. Shape: bob/schema.json (workspace) in the BOB plugin.`,
    id: 'WS-01',
    created_at: now,
    source: 'tool',
    is_synthetic: false,
    current: null,
    projects: [],
  }
  const projects = ((file.projects ?? []) as Any[])
  const known = projects.some(p => p.name === name)
  const record = { id: `P-${String(projects.length + 1).padStart(2, '0')}`, name, path: name, created_at: now, source, is_synthetic: false }
  await $.fs.write(at(place.session, WORKSPACE_FILE), pretty({ ...file, current: name, projects: known ? projects : [...projects, record] }))
  return !known
}

// The project changed under the session: rerun the preflight there and start
// Gate B's round afresh against the new project's ledger.
async function moved($: Engine) {
  await runPreflight($)
  await resetRound($)
  redraw($)
}

async function newProject($: Engine, nameArg: string, originKind: string | undefined): Promise<string> {
  const name = nameArg.trim()
  if (!name) return refusedText('new', ['no project name given (lowercase letters, digits and hyphens)'], RETYPE)
  const rules = await workspaceRules($)
  if (!rules) return refusedText('new', ['bob/schema.json in the plugin folder has no workspace section'], 'Ash needs to reinstall BOB')
  const place = await locate($)
  const why = await placeRefusals($, place, rules, name)
  if (why.length) return refusedText('new', why, RETYPE)
  const dir = at(place.session, name)
  if (await exists($, dir)) return refusedText('new', [`${name} already exists in this workspace. Open it from the Projects box in the BOB pane`], RETYPE)

  let git: Any = null
  try {
    git = await $.process.run(['git', '--version'], { cwd: place.session })
  } catch {
    git = null
  }
  if (!git || git.exitCode !== 0) return refusedText('new', ['stack gap: git not found, and every BOB project is a git repo'], 'Ash needs to install git, then try again')
  const init = await $.process.run(['git', 'init', '-b', 'main', dir], { cwd: place.session })
  if (init.exitCode !== 0) return refusedText('new', [`git init failed for ${dir}: ${String(init.stderr ?? '').trim() || `exit ${init.exitCode}`}`], RETYPE)

  const wrote: string[] = []
  const now = stamp()
  await $.fs.write(at(dir, 'docs/project-status.md'), `# ${name} · project status (living file, update in place)\n\nA BOB project in the workspace ${place.session}. Not governed yet: no bob/brief.json.\n\n## Build log (one line per step: step, state, evidence)\n- project started, ${now}: implemented. Folder ${dir} made, git initialised on main, nothing committed; registered in ${WORKSPACE_FILE} as the current project. Next: Ash tells Claude about the idea; Claude designs it with design-with-bob, and the BOB pane offers Adopt once the design is approved.\n`)
  wrote.push(`${name}/docs/project-status.md`)
  const notes: string[] = []
  if (!(await exists($, at(place.session, 'CLAUDE.md')))) {
    const template = await readText($, `${$.plugin.root}/templates/workspace/CLAUDE.md`)
    if (template !== null) {
      await $.fs.write(at(place.session, 'CLAUDE.md'), template)
      wrote.push('CLAUDE.md (the workspace template, written once)')
    } else {
      notes.push('- skipped CLAUDE.md: the plugin template is missing. Ash needs to reinstall BOB')
    }
  }
  // Last on purpose: the project becomes current only once its folder is whole.
  await registerProject($, place, name, originKind && NON_HUMAN_ORIGINS.includes(originKind) ? 'tool' : 'human')
  wrote.push(`${WORKSPACE_FILE} (${name} registered and current)`)
  await moved($)

  return [
    `BOB new: project ${name} made at ${dir} and set as the current project.`,
    `- ran git init -b main (nothing committed)`,
    ...wrote.map(w => `- wrote ${w}`),
    ...notes,
    'The pane now shows this project; the gates and the Adopt button work on it.',
    'Next action: Ash needs to: tell Claude about the idea; Claude designs it with design-with-bob, and the BOB pane offers Adopt once the design is approved.',
  ].join('\n')
}

async function switchProject($: Engine, nameArg: string, originKind: string | undefined): Promise<string> {
  const name = nameArg.trim()
  if (!name) return refusedText('switch', ['no project name given. Usage: /bob switch <name>'], RETYPE)
  const rules = await workspaceRules($)
  if (!rules) return refusedText('switch', ['bob/schema.json in the plugin folder has no workspace section'], 'Ash needs to reinstall BOB')
  const place = await locate($)
  const why = await placeRefusals($, place, rules, name)
  if (why.length) return refusedText('switch', why, RETYPE)
  const dir = at(place.session, name)
  if (!(await exists($, dir))) return refusedText('switch', [`${name} is not a folder in this workspace. Start it from the Start a project box in the BOB pane`], RETYPE)

  const added = await registerProject($, place, name, originKind && NON_HUMAN_ORIGINS.includes(originKind) ? 'tool' : 'human')
  await moved($)
  return [
    `BOB switch: ${name} is now the current project (${dir}).`,
    ...(added ? [`- registered ${name} in ${WORKSPACE_FILE}: something other than /bob new made the folder (the design room does)`] : []),
    'The pane, the gates and /bob adopt now work on it. Nothing was committed.',
  ].join('\n')
}

// R12 after an interrupted run: a run still running or verifying with no event
// past the stale window is closed by a `reconciled` event, never by prose. It
// becomes completed when the ledger already holds a finished event for it, else
// failed with exit_reason interrupted. Increments and requirements are not
// touched: what the interrupted work proved is for evidence and a person.
async function reconcile($: Engine): Promise<string> {
  const m = await load($)
  if (!m.ownLedger || !m.ledger) return refusedText('reconcile', ['this repo has no bob/ledger.json of its own; fixtures/ records are synthetic and never reconciled'])
  if (m.parseErrors.length) return refusedText('reconcile', m.parseErrors)
  const now = Date.now()
  const runs: Any[] = m.ledger.runs ?? []
  const events: Any[] = m.ledger.events ?? []
  const stale = runs.filter(r => ['running', 'verifying'].includes(r.state) && now - Date.parse(String(r.last_event_at)) > STALE_MS)
  if (!stale.length) return 'BOB reconcile: nothing to reconcile. No run is running or verifying past the stale window. Nothing was written.'

  const when = stamp()
  const added: Any[] = []
  const done: string[] = []
  const next = runs.map(r => {
    if (!stale.includes(r)) return r
    const finished = events.some(ev => ev.run_id === r.id && ev.type === 'finished')
    const state = finished ? 'completed' : 'failed'
    const exit_reason = finished ? (r.exit_reason ?? 'success') : 'interrupted'
    added.push({
      id: `EV-RECON-${r.id}-${events.length + added.length + 1}`,
      run_id: r.id,
      at: when,
      origin: 'bob',
      type: 'reconciled',
      detail: `${r.state} with no event since ${r.last_event_at}; ${finished ? 'a finished event exists' : 'no finished event'}, so ${state}`,
      created_at: when,
      source: 'tool',
      is_synthetic: false,
    })
    done.push(`${r.id} ${r.state} to ${state}`)
    return { ...r, state, exit_reason, last_event_at: when }
  })
  await $.fs.write(at(m.root, m.ledgerPath), pretty({ ...m.ledger, runs: next, events: [...events, ...added] }))
  redraw($)
  return [`BOB reconcile: ${done.length} run(s) closed: ${done.join('; ')}.`, 'One reconciled event per run was appended to the ledger; increments and requirement states were not touched.', 'Nothing was committed.'].join('\n')
}

async function runPreflight($: Engine) {
  try {
    // The preflight reads the repo, so it runs in the repo (its own fallback is $PWD).
    const root = await repoRoot($)
    const ran = await $.process.run(['bash', `${$.plugin.root}/scripts/preflight.sh`], { cwd: root, env: { CLAUDE_PROJECT_DIR: root } })
    const pf = parsePreflight(ran.exitCode, ran.stdout, ran.stderr, Date.now())
    await update($, preflightAtom, () => pf)
    if (pf.stops.length) $.ui.toast(`BOB preflight STOP: ${pf.stops[0]}`)
  } catch {
    await update($, preflightAtom, () => parsePreflight(1, '', 'preflight · STOP · scripts/preflight.sh could not run', Date.now()))
  }
}

// Gate B's baseline: the evidence the active increment already holds.
async function resetRound($: Engine) {
  const m = await load($)
  const active = activeIncrement(m)
  const ids = active ? evidenceFor(m, active.requirement_ids ?? []).map(ev => String(ev.id)) : []
  await update($, baselineAtom, () => ids)
  await update($, touchedAtom, () => [])
  await update($, pendingAtom, () => null)
  await update($, provenAtom, () => false)
}

// Evidence the active increment gained since the round's baseline.
async function gainedEvidence($: Engine, m: Model, ids: string[]): Promise<Any[]> {
  const base = new Set(await read($, baselineAtom))
  return evidenceFor(m, ids).filter(ev => !base.has(String(ev.id)))
}

// Gate B's carry-over (R-bob-10). Another plugin's Stop hook can answer the
// event before BOB sees it (seen 25 and 26 October 2026), and Gate B blocks
// once per round. So a round that wrote files and gained no evidence is
// carried into the next round, which may then write only the evidence.
async function carryOver($: Engine) {
  const wrote = await read($, touchedAtom)
  if (wrote.length === 0) return
  const m = await load($)
  const active = m.governed && m.ledger ? activeIncrement(m) : null
  if (!active) return
  const ids: string[] = active.requirement_ids ?? []
  const gained = await gainedEvidence($, m, ids)
  if (gained.length) {
    await update($, baselineAtom, list => [...list, ...gained.map(ev => String(ev.id))])
    return
  }
  if (await read($, provenAtom)) return
  await update($, pendingAtom, () => ({ increment: String(active.id), ids, files: wrote.length }))
}

// The text of the last assistant message in a Claude Code transcript (JSON lines),
// or null when it cannot be read as one.
function lastAssistantText(raw: string): string | null {
  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].trim()) continue
    try {
      const o = JSON.parse(lines[i]) as Any
      if (o.type !== 'assistant' && o.message?.role !== 'assistant') continue
      const parts = (o.message?.content ?? []) as Any[]
      const text = parts.filter(c => c?.type === 'text').map(c => String(c.text ?? '')).join('\n')
      return text.trim() ? text : null
    } catch {
      return null
    }
  }
  return null
}

// null when the write may go on; else the Gate B text. Evidence clears the hold.
async function heldByGateB($: Engine, m: Model, isEvidence: boolean): Promise<string | null> {
  const p = await read($, pendingAtom)
  if (!p) return null
  const active = activeIncrement(m)
  if (!active || String(active.id) !== p.increment) {
    await update($, pendingAtom, () => null)
    return null
  }
  const gained = await gainedEvidence($, m, p.ids)
  if (gained.length) {
    await update($, baselineAtom, list => [...list, ...gained.map(ev => String(ev.id))])
    await update($, pendingAtom, () => null)
    await update($, provenAtom, () => true)
    redraw($)
    return null
  }
  if (isEvidence) return null
  return (
    `BOB Gate B refused this write. The last round changed ${p.files} file(s) under ${p.increment} and ended with no evidence record for ${p.ids.join(', ')}. ` +
    `This round may write only the evidence: a record in bob/ledger.json evidence[] and its file under docs/evidence/. ` +
    `Next action: Claude: capture the evidence first, or set ${p.increment} to returned and say why.`
  )
}

const isEvidencePath = (m: Model, path: string) => {
  const r = path.startsWith(`${m.root}/`) ? path.slice(m.root.length + 1) : path
  return r === 'bob/ledger.json' || r.startsWith('docs/evidence/')
}

// R-bob-08: the model starts a project from the person's words, choosing the
// name itself; the same checks and writes as /bob new.
const START_PROJECT = {
  name: 'start_project',
  description:
    'Start a new BOB project when the person describes an idea they want built. Choose a short name yourself (lowercase letters, digits and hyphens, up to 40 characters, from the idea); never ask the person to type a command or a name. Runs in the BOB workspace only.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'the project name Claude chose, for example proposal-price-check' },
      idea: { type: 'string', description: 'the idea in the person\'s own words' },
    },
    required: ['name', 'idea'],
  },
  isDeferred: false,
}

// R-bob-09 and R-bob-12: pane actions are a person's. A press or a field
// submit is raised only by a surface the person uses; no plugin and no model
// tool can raise one. So the action is judged by the surface it came from and
// refused without one. ($.ui.view was tried first and answered "no main view
// here" to Ash's real click on the desktop app, 26 October 2026.)
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile']
const byPerson = (e: Any) => SURFACES.includes(String(e?.surface))

async function personRefused($: Engine, what: string, e: Any): Promise<boolean> {
  if (byPerson(e)) return false
  await update($, noteAtom, () => `${what} refused: it did not come from a person's own click or typing.`)
  redraw($)
  return true
}

async function pressApprove($: Engine, id: string, e: Any) {
  if (await personRefused($, 'Approve', e)) return
  const text = await approve($, id, undefined)
  const refused = text.includes('refused')
  const m = await load($)
  const inc = ((m.ledger?.increments ?? []) as Any[]).find(i => i.id === id)
  const approver = String(m.approvals[m.approvals.length - 1]?.approver ?? 'you')
  await update($, noteAtom, () => (refused ? 'Approve did not go through; Claude has the reason and says it in the chat.' : `Approved: “${titleOf(inc)}” by ${approver}. Claude starts now.`))
  await resetRound($)
  // An approval that lands while nobody is running stalls the build (29 October 2026,
  // AP-02 landed a minute after the window ended its turn). The click starts the
  // work, and the ledger says so: one run and one started event, both human-origin,
  // so the start is on record (phase one, R-bob-demo-17).
  if (!refused && m.ledger) {
    const now = stamp()
    const runs: Any[] = m.ledger.runs ?? []
    const events: Any[] = m.ledger.events ?? []
    const run = { id: `RUN-${String(runs.length + 1).padStart(2, '0')}`, increment_id: id, state: 'running', started_at: now, last_event_at: now, session_id: null, cancel_requested: false, exit_reason: null, cost_usd_reported: null, created_at: now, source: 'human', is_synthetic: false }
    const event = { id: `EV-BOB-${String(events.length + 1).padStart(2, '0')}`, run_id: run.id, at: now, origin: 'human', type: 'started', detail: `“${titleOf(inc)}” started by Ash’s click on Approve`, created_at: now, source: 'human', is_synthetic: false }
    await $.fs.write(at(m.root, m.ledgerPath), pretty({ ...m.ledger, runs: [...runs, run], events: [...events, event] }))
    await update($, runAtom, () => run.id)
    const landedIn = (await read($, turnAtom)) ?? ''
    await update($, runTurnAtom, () => landedIn)
  }
  await writePage($)
  redraw($)
  if (!refused) {
    const ids = ((inc?.requirement_ids ?? []) as string[]).join(', ')
    await $.prompt.submit({
      text: `Ash approved ${id}${inc?.title ? ` (${String(inc.title)})` : ''}. Start it now and run it to the end in this window: build it, capture evidence for ${ids || 'its requirement ids'} from tool results, rebuild docs/map.html, then give the three-line report (stage, live, next step with its doer). Do not stop to ask; ask Ash only for a person-only click, as one popup.`,
      asUser: true,
    })
  }
}

// The run an Approve click started ends with the turn it started: one finished
// event, the run completed. A run nobody closes shows as stale and is closed by
// Close stale run, which stays the route for an interrupted turn.
async function closeRun($: Engine) {
  const runId = await read($, runAtom)
  if (!runId) return
  const landed = await read($, runTurnAtom)
  const current = await read($, turnAtom)
  if (landed && current && landed === current) return
  await update($, runAtom, () => null)
  const m = await load($)
  if (!m.ownLedger || !m.ledger) return
  const runs: Any[] = m.ledger.runs ?? []
  const events: Any[] = m.ledger.events ?? []
  if (!runs.some(r => r.id === runId && r.state === 'running')) return
  const now = stamp()
  const event = { id: `EV-BOB-${String(events.length + 1).padStart(2, '0')}`, run_id: runId, at: now, origin: 'bob', type: 'finished', detail: 'the turn the click started has ended', created_at: now, source: 'tool', is_synthetic: false }
  await $.fs.write(at(m.root, m.ledgerPath), pretty({ ...m.ledger, runs: runs.map(r => (r.id === runId ? { ...r, state: 'completed', exit_reason: 'turn ended', last_event_at: now } : r)), events: [...events, event] }))
}

// Send back: the person's note goes to the ledger as a human event; the
// increment stays unapproved.
async function sendBack($: Engine, id: string, note: string, e: Any) {
  if (await personRefused($, `Send back ${id}`, e)) return
  const text = note.trim()
  if (!text) {
    await update($, noteAtom, () => `Send back ${id}: write the note first, then press Send back.`)
    redraw($)
    return
  }
  const m = await load($)
  if (!m.ownLedger || !m.ledger) return
  const events: Any[] = m.ledger.events ?? []
  const now = stamp()
  const event = { id: `EV-BOB-${String(events.length + 1).padStart(2, '0')}`, run_id: null, at: now, origin: 'human', type: 'sent_back', detail: `sent back ${id}: ${text}`, created_at: now, source: 'human', is_synthetic: false }
  await $.fs.write(at(m.root, m.ledgerPath), pretty({ ...m.ledger, events: [...events, event] }))
  await update($, noteAtom, () => `Sent back ${id} with your note. It stays unapproved; Claude reads the note next.`)
  await writePage($)
  redraw($)
}

async function pressSwitch($: Engine, name: string, e: Any) {
  if (await personRefused($, `Open ${name}`, e)) return
  const text = await switchProject($, name, undefined)
  await update($, noteAtom, () => text.split('\n')[0])
  redraw($)
}

// Start a project from the person's words: the idea goes to Claude as their
// own message, and Claude names the project and calls start_project.
async function submitIdea($: Engine, idea: string, e: Any) {
  if (await personRefused($, 'Start a project', e)) return
  const text = idea.trim()
  if (!text) return
  await $.prompt.submit({
    text: `Start a new BOB project for this idea, in my words: "${text}". Choose the project name yourself and call start_project; do not ask me to type a command.`,
    asUser: true,
  })
}

// R-bob-13: the design room's six stages, read from the files each stage
// writes (skills/design-with-bob/SKILL.md, "Files this skill writes").
const STAGES = ['Capture', 'Understand', 'Design the product', 'Data and knowledge', 'Make it visible', 'Challenge and approve']
const REVIEWS = [
  { key: 'journey', label: 'journey' },
  { key: 'screen-map', label: 'screens' },
  { key: 'data-trace', label: 'data trace' },
  { key: 'readiness', label: 'readiness check' },
]
type Design = { done: boolean[]; who: string | null; job: string | null; reviews: { key: string; label: string }[]; proposal: boolean }

const firstLineUnder = (md: string, heading: string): string | null => {
  const at = md.split('\n').findIndex(l => l.trim().toLowerCase() === `## ${heading.toLowerCase()}`)
  if (at < 0) return null
  const line = md.split('\n').slice(at + 1).find(l => l.trim() && !l.startsWith('#'))
  return line ? line.trim() : null
}

// null when the project is governed or the design room has not started.
async function designOf($: Engine, m: Model): Promise<Design | null> {
  if (m.governed) return null
  const has = (p: string) => exists($, at(m.root, p))
  const brief = (await readText($, at(m.root, 'bob/brief.md'))) ?? ''
  const sources = await has('bob/sources.json')
  const proposal = await has(PROPOSAL_PATH)
  if (!sources && !brief && !proposal) return null
  const page = (k: string) => has(`docs/evidence/design/${k}.md`)
  const done = [
    sources,
    /^## Conflicts\s*$/m.test(brief),
    /\bR-[A-Za-z0-9-]+-\d+\b/.test(brief),
    await page('data-trace'),
    (await page('journey')) && (await page('screen-map')),
    proposal,
  ]
  const reviews: Design['reviews'] = []
  for (const r of REVIEWS) if (await page(r.key)) reviews.push(r)
  return { done, who: firstLineUnder(brief, 'Who'), job: firstLineUnder(brief, 'Job'), reviews, proposal }
}

async function openReview($: Engine, key: string, project: string, e: Any) {
  if (await personRefused($, 'Open a review page', e)) return
  await $.prompt.submit({ text: `Open docs/evidence/design/${key}.md for ${project} and walk me through it in plain words.`, asUser: true })
}

async function pressAdopt($: Engine, e: Any) {
  if (await personRefused($, 'Adopt', e)) return
  const text = await adopt($)
  await update($, noteAtom, () => text.split('\n')[0])
  await resetRound($)
  await writePage($)
  redraw($)
}

async function pressReconcile($: Engine, e: Any) {
  if (await personRefused($, 'Close stale run', e)) return
  const text = await reconcile($)
  await update($, noteAtom, () => text.split('\n')[0])
  await writePage($)
  redraw($)
}

// A file:// link is drawn as plain text on the desktop app, so See evidence
// asks Claude to show the round's evidence in the chat.
async function seeEvidence($: Engine, id: string, e: Any) {
  if (await personRefused($, 'See evidence', e)) return
  await $.prompt.submit({ text: `Show me the evidence recorded for ${id}: each requirement, its state, and the evidence file behind it, in plain words.`, asUser: true })
}

// R-bob-17: the map is a file in the repo; a file:// link is plain text on the
// desktop app, so the button asks Claude to open it in the person's browser.
async function openMap($: Engine, e: Any) {
  if (await personRefused($, 'Open the map', e)) return
  await $.prompt.submit({ text: 'Open docs/map.html in my browser with the open command, then tell me in one line what the map shows: which parts are lit, and the next step with its doer.', asUser: true })
}

// The picture is the person's to change: one button opens its mind map file
// in MindNode (R-bob-demo-12, and never a path to hunt for, R-bob-demo-15).
async function pressEditPicture($: Engine, e: Any) {
  if (await personRefused($, 'Edit the picture', e)) return
  const m = await load($)
  const { product } = await readPicture($, m)
  if (!product) {
    await update($, noteAtom, () => 'There is no picture yet: it is drawn when the design reaches the "make it visible" step.')
    redraw($)
    return
  }
  const path = at(m.root, 'docs/product.opml')
  try {
    const ran = await $.process.run(['open', '-a', 'MindNode', path], { cwd: m.root })
    await update($, noteAtom, () => (ran.exitCode === 0 ? 'The picture is open in MindNode. Change it, save, and BOB redraws at the next turn.' : `MindNode did not open the picture (${String(ran.stderr ?? '').trim() || `exit ${ran.exitCode}`}). The file is docs/product.opml in the project folder.`))
  } catch {
    await update($, noteAtom, () => 'MindNode could not be opened from here. The file is docs/product.opml in the project folder.')
  }
  redraw($)
}

// R-bob-demo-18 (QA, 29 October 2026: a human-origin record Claude writes is
// self-declared). The person's look is their own press: "I've seen this" on a
// built promise a screen rests on writes the human-origin evidence record and
// its file, and moves the promise to verified. Claude cannot raise a press.
async function pressSeen($: Engine, rid: string, e: Any) {
  if (await personRefused($, 'I\u2019ve seen this', e)) return
  const m = await load($)
  if (!m.ownLedger || !m.ledger || !m.brief) return
  const req = ((m.brief.requirements ?? []) as Any[]).find(r => r.id === rid)
  if (!req || !['implemented', 'reported'].includes(String(req.state))) return
  const now = stamp()
  const evidence: Any[] = m.ledger.evidence ?? []
  const ref = `docs/evidence/looks/${rid}_${now.replace(/[:.]/g, '-')}.md`
  const text = `# Seen by a person: ${clipText(req.text, 120)}\n\nA person pressed \u201cI\u2019ve seen this\u201d in the BOB pane at ${when(now)} for this promise, on the pane and pages BOB had written from the records. Written by BOB on that press; not by Claude.\n`
  await $.fs.write(at(m.root, ref), text)
  const record = { id: `E-LOOK-${String(evidence.length + 1).padStart(2, '0')}`, requirement_id: rid, kind: 'screenshot', ref, captured_at: now, origin: 'human', created_at: now, source: 'human', is_synthetic: false }
  await $.fs.write(at(m.root, m.ledgerPath), pretty({ ...m.ledger, evidence: [...evidence, record] }))
  const brief = { ...m.brief, requirements: ((m.brief.requirements ?? []) as Any[]).map(r => (r.id === rid ? { ...r, state: 'verified', evidence_ids: [...((r.evidence_ids ?? []) as string[]), record.id] } : r)) }
  await $.fs.write(at(m.root, 'bob/brief.json'), pretty(brief))
  await update($, noteAtom, () => `Seen: \u201c${clipText(req.text, 60)}\u201d is now proven by your look.`)
  await writePage($)
  redraw($)
}

async function pressPause($: Engine, e: Any) {
  if (await personRefused($, 'Pause', e)) return
  const turnId = await read($, turnAtom)
  if (!turnId) return
  try {
    await $.turn.abort({ turnId })
    await update($, noteAtom, () => 'Paused: Claude stopped the running round. Send a message to carry on.')
  } catch {
    await update($, noteAtom, () => 'Pause: no round is running now.')
  }
  await update($, turnAtom, () => null)
  redraw($)
}

// The refusal Claude reads: plain words first, then the ids and hashes it needs.
const denial = (gate: string, v: Extract<Verdict, { ok: false }>) => `BOB ${gate} refused this write. ${v.reason}. Next action: ${v.next}.${v.detail ? ` For the files: ${v.detail}.` : ''}`

// Phase one (U-07, seen 29 October 2026): with no round approved, Claude may
// still PROPOSE: write bob/brief.json (the state guard still applies) and
// bob/ledger.json as long as nothing in the written ledger is active or
// approved. Approval stays a person's click; this only stops the gate closing
// one step early on the plan itself.
function proposesOnly(m: Model, path: string, e: Any): boolean {
  const r = path.startsWith(`${m.root}/`) ? path.slice(m.root.length + 1) : path
  if (r === 'bob/brief.json') return true
  if (r !== 'bob/ledger.json') return false
  const current = m.ledger ? JSON.stringify(m.ledger) : ''
  const text = e.tool === 'Write' ? String(e.content ?? '') : proposedText(e, current)
  if (text === null) return false
  try {
    const after = JSON.parse(text) as Any
    const incs = ((after.increments ?? []) as Any[])
    if (!incs.every(i => !['active', 'approved'].includes(String(i.state)))) return false
    // Every round that exists keeps its state (a ledger marking all rounds done
    // would read as idle and open every gate: QA, 29 October 2026). New rounds
    // may only be proposed; a proposed one may be withdrawn.
    const before = new Map<string, string>(((m.ledger?.increments ?? []) as Any[]).map(i => [String(i.id), String(i.state)]))
    for (const i of incs) {
      const was = before.get(String(i.id))
      if (was === undefined ? String(i.state) !== 'proposed' : was !== String(i.state)) return false
    }
    return [...before.keys()].every(id => incs.some(i => String(i.id) === id) || before.get(id) === 'proposed')
  } catch {
    return false
  }
}

// The state-table guard on bob/brief.json: every changed requirement state must
// be a transition the schema allows; verified needs an evidence record; accepted
// needs a human on the transition, and a tool call is never human.
// Phase two (R-bob-demo-18, cure 5 of the post-mortem): a promise about what a
// person sees is one that a screen in bob/product.json rests on. It reaches
// verified only on a person's own look: an evidence record of origin human.
// A test alone leaves it at built.
async function facePromises($: Engine, m: Model): Promise<Set<string>> {
  const product = (await readJson($, at(m.root, 'bob/product.json'), [])) as Product | null
  const ids = ((product?.nodes ?? []) as Any[]).filter(n => n.kind === 'screen').flatMap(n => (n.promises ?? []) as string[])
  return new Set(ids)
}

function transitionVerdict(m: Model, after: Any, source: string, face: Set<string> = new Set()): string | null {
  const rules = m.schema?.requirement
  if (!rules || !m.brief) return null
  const before = new Map<string, string>((m.brief.requirements ?? []).map((r: Any) => [r.id, r.state]))
  const kinds: string[] = m.schema?.evidence?.kinds ?? []
  for (const r of (after.requirements ?? []) as Any[]) {
    const from = before.get(r.id)
    const to = r.state
    if (!rules.states.includes(to)) return `${r.id}: "${to}" is not a requirement state in bob/schema.json`
    if (from === undefined || from === to) continue
    if (!(rules.transitions?.[from] ?? []).includes(to)) return `${r.id}: ${from} to ${to} is not a transition in bob/schema.json`
    if (to === 'verified') {
      const has = evidenceFor(m, [r.id]).some(ev => kinds.includes(ev.kind))
      if (!has) return `${r.id}: verified needs an evidence record in bob/ledger.json (kind ${kinds.join(', ')}) and none exists for it. Model prose is never evidence`
      if (face.has(r.id) && !evidenceFor(m, [r.id]).some(ev => ev.origin === 'human')) return `${r.id}: this promise is about what a person sees (a screen in bob/product.json rests on it), so verified needs a person's own look on record: an evidence record with origin human. A test alone leaves it at built`
    }
    if (to === 'accepted' && source !== 'human') return `${r.id}: accepted needs a human on the transition, and this write comes from ${source}. Ash needs to set it`
  }
  return null
}

// What a Write or Edit would leave in the file, computed before the tool runs.
function proposedText(e: Any, current: string): string | null {
  if (e.tool === 'Write') return String(e.content ?? '')
  if (e.tool === 'Edit') {
    const oldText = String(e.old_string ?? '')
    const newText = String(e.new_string ?? '')
    if (!oldText || !current.includes(oldText)) return null
    return e.replace_all ? current.split(oldText).join(newText) : current.replace(oldText, newText)
  }
  return null
}

// Bash that writes files. Read per command segment, not per text: a quote-aware
// split on ; | & ( ) and newlines, quoted text blanked, fd redirects and
// /dev/null ignored, and the writing verb read at the command position (for git,
// its subcommand). Bounded on purpose; the remote checks are the real gate
// (product-plan Part 3). The first version matched text anywhere, so
// `2>&1`, `2>/dev/null` and "git add" inside a quoted string were refused with
// no active increment (seen four times in Part B, 22 October 2026).
type Segment = { raw: string; bare: string }

function segments(command: string): Segment[] {
  const out: Segment[] = []
  let raw = ''
  let bare = ''
  let quote: string | null = null
  const push = () => {
    if (raw.trim()) out.push({ raw: raw.trim(), bare: bare.trim() })
    raw = ''
    bare = ''
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (quote) {
      raw += c
      if (c === '\\' && quote === '"' && i + 1 < command.length) {
        raw += command[++i]
        continue
      }
      if (c === quote) {
        quote = null
        bare += c
      }
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      raw += c
      bare += c
      continue
    }
    if (c === '\\' && i + 1 < command.length) {
      raw += c + command[i + 1]
      bare += '  '
      i++
      continue
    }
    if (c === ';' || c === '|' || c === '\n' || c === '(' || c === ')' || c === '`') {
      push()
      continue
    }
    if (c === '&') {
      // &> and the fd duplications 2>&1, >&2 are redirects, not separators.
      if (command[i + 1] === '>' || command[i - 1] === '>' || command[i - 1] === '<') {
        raw += c
        bare += c
        continue
      }
      push()
      continue
    }
    raw += c
    bare += c
  }
  push()
  return out
}

const PLAIN_WRITERS = new Set(['tee', 'mv', 'cp', 'rm', 'rmdir', 'touch', 'mkdir', 'install', 'dd', 'truncate', 'chmod', 'chown', 'ln', 'patch', 'rsync', 'unzip'])
const GIT_WRITERS = new Set(['commit', 'push', 'merge', 'rebase', 'reset', 'checkout', 'switch', 'add', 'rm', 'mv', 'stash', 'apply', 'cherry-pick', 'tag', 'clean'])
const INTERPRETERS = new Set(['python', 'python3', 'node', 'ruby', 'perl', 'php', 'deno', 'bun'])

function words(bare: string): string[] {
  const w = bare.split(/\s+/).filter(Boolean)
  while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['sudo', 'command', 'env', 'time'].includes(w[0]))) w.shift()
  return w
}

function gitSubcommand(w: string[]): string {
  for (let i = 1; i < w.length; i++) {
    if (w[i] === '-C' || w[i] === '-c') { i++; continue }
    if (w[i].startsWith('-')) continue
    return w[i]
  }
  return ''
}

function segmentWrites(seg: Segment): boolean {
  const noFd = seg.bare.replace(/\d*>&\d*-?/g, ' ').replace(/&?\d*>>?\s*\/dev\/null/g, ' ')
  if (/>/.test(noFd)) return true
  const w = words(noFd)
  const verb = (w[0] ?? '').replace(/^.*\//, '')
  if (verb === 'git') return GIT_WRITERS.has(gitSubcommand(w))
  if (PLAIN_WRITERS.has(verb)) return true
  const rest = w.slice(1)
  if (verb === 'sed') return rest.some(a => /^-[A-Za-z]*i/.test(a) || a === '--in-place')
  if (verb === 'perl') return rest.some(a => /^-[A-Za-z]*i/.test(a))
  if (verb === 'tar') return rest.some(a => /^-?[A-Za-z]*x/.test(a))
  if (verb === 'npm') return ['install', 'i', 'ci', 'uninstall', 'update'].includes(rest[0])
  if (verb === 'pip' || verb === 'pip3') return rest[0] === 'install'
  if (verb === 'pnpm') return ['install', 'add'].includes(rest[0])
  if (verb === 'yarn') return ['add', 'install'].includes(rest[0])
  return false
}

const isInterpreter = (seg: Segment): boolean => INTERPRETERS.has((words(seg.bare)[0] ?? '').replace(/^.*\//, ''))
const writesFiles = (command: string): boolean => segments(command).some(segmentWrites)

// The state guard runs on Edit and Write only. A Bash write to bob/brief.json
// (a redirect, sed -i, or an interpreter one-liner) would skip the state table,
// so it is refused outright; git on the file is a Gate A decision, not this one.
const writesBriefFromBash = (command: string): boolean =>
  segments(command).some(seg => /(^|[\s'"=\/])bob\/brief\.json/.test(seg.raw) && !/^git\b/.test(words(seg.bare).join(' ')) && (segmentWrites(seg) || isInterpreter(seg)))

const isBriefPath = (path: string) => /(^|\/)bob\/brief\.json$/.test(path)

const parsePreflight = (exitCode: number, stdout: string, stderr: string, at: number): Preflight => {
  const lines = `${stdout}\n${stderr}`.split('\n').map(l => l.trim()).filter(Boolean)
  const stops = lines.filter(l => /STOP/.test(l)).map(l => l.replace(/^preflight\s*·\s*STOP\s*·\s*/, ''))
  return { exitCode, lines, stops, at }
}

const colour = (r: Row) =>
  !r.known ? 'error'
  : r.state === 'accepted' || r.state === 'verified' ? 'success'
  : r.state === 'implemented' || r.state === 'reported' ? 'suggestion'
  : r.state === 'designed' ? 'warning'
  : r.state === 'blocked' ? 'error'
  : 'inactive'

// /bob <word>: the commands. Top level so the engine can follow $ into it.
async function bobCommand($: Engine, e: Any): Promise<{ text: string }> {
  const arg = (e.args ?? '').trim()
  const [word, ...rest] = arg.split(/\s+/)
  if (word === 'open') {
    const placed = await $.ui.open({ id: PANE, title: TITLE })
    return { text: placed.isPlaced ? 'BOB board pane opened.' : 'BOB board pane requested, but this surface did not seat it.' }
  }
  if (word === 'adopt') {
    const text = await adopt($)
    redraw($)
    return { text }
  }
  if (word === 'reconcile') return { text: await reconcile($) }
  if (word === 'new') return { text: await newProject($, rest.join(' '), (e as Any).origin?.kind) }
  if (word === 'switch') return { text: await switchProject($, rest.join(' '), (e as Any).origin?.kind) }
  if (word === 'approve') return { text: await approve($, rest.join(' '), (e as Any).origin?.kind) }
  const m = await load($)
  return { text: statusText(describe(m, await read($, preflightAtom), Date.now())) }
}

// R-bob-01: the closing report of a round under an active increment is at
// most three lines (stage, live, next step with its doer), after any detail.
// Phase one adds two cures from the post-mortem: the "live" line carries the
// map (its link or docs/map.html), so every round ends by showing the map
// (R-bob-demo-16); and the next step is never Claude's own, because a round
// that ends on a step Claude could take is a round that stopped for nothing
// (R-bob-demo-17). Blocks once per round; an unreadable transcript never
// blocks. null = allow.
async function reportCheck($: Engine, e: Any): Promise<{ block: string } | null> {
    if ((e as Any).stop_hook_active) return null
    const m = await load($)
    if (!m.governed || !m.ledger || !activeIncrement(m)) return null
    const path = String((e as Any).transcript_path ?? '')
    const raw = path ? await readText($, path) : null
    const last = raw === null ? null : lastAssistantText(raw)
    if (last === null) return null
    const paragraphs = last.trim().split(/\n\s*\n/)
    const closing = paragraphs[paragraphs.length - 1].split('\n').filter(l => l.trim())
    const lines = closing.length
    if (lines > 3) {
      return {
        block:
          `BOB report check: this round ended on a closing report of ${lines} lines. The closing report is at most three lines: stage, live, and the next step with its doer. ` +
          `Next action: Claude: keep the detail above and end on those three lines.`,
      }
    }
    const text = closing.join('\n')
    if (!/docs\/map\.html|(?:map|picture)[^\n]*https?:\/\/\S+|https?:\/\/\S+[^\n]*(?:map|picture)/i.test(text)) {
      return {
        block:
          'BOB report check: the closing report does not show the map. Every round ends by republishing the map and giving its link (or docs/map.html) on the live line, so the person sees it rather than reads about it. ' +
          'Next action: Claude: rebuild docs/map.html, publish it, and put the link on the live line.',
      }
    }
    const lastLine = closing[closing.length - 1]
    if (/^(?:\W*next[^:]*:\s*)?\**\s*claude\b/i.test(lastLine.trim())) {
      return {
        block:
          'BOB report check: the closing report ends on a next step whose doer is Claude. A round never ends on a step Claude could take itself: take it now, or end on the one step only a person can do (an approval, a look). ' +
          'Next action: Claude: do the step, then end on the person’s step.',
      }
    }
    return null
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'bob', description: 'BOB: status (default), open the board pane, new <name> (a project in the BOB workspace), switch <name>, adopt this project from a proposal, approve <increment id> (a person only), or reconcile a run left running after an interruption' })

    try {
      await $.tool.register(START_PROJECT)
    } catch {
      // a host that cannot register tools still has /bob new
    }

    await runPreflight($)
    await resetRound($)
    await writePage($)

    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  // A new round of the main loop: carry an unproven round over (Gate B), then
  // start the written-files list afresh. A subagent's turn is part of the round.
  on('turn.start', async ($, e, next) => {
    if ((e as Any).agentId !== undefined) return next(e)
    await carryOver($)
    await update($, touchedAtom, () => [])
    await update($, provenAtom, () => false)
    await update($, turnAtom, () => String((e as Any).turnId ?? '') || null)
    redraw($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if ((e as Any).agentId === undefined) {
      await update($, turnAtom, () => null)
      await closeRun($)
      redraw($)
    }
    return next(e)
  })

  on('tool.call', { tool: 'mcp__bob__start_project' }, async ($, e) => {
    const text = await newProject($, String((e as Any).name ?? ''), 'plugin')
    await writePage($)
    return text.startsWith('BOB new refused') ? { deny: text } : { result: text }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'BOB start_project failed before it wrote anything. Next action: Claude: report the failure to Ash.' }))

  on('command.run', { command: 'bob' }, async ($, e) => {
    const result = await bobCommand($, e as Any)
    await writePage($)
    return result
  })


  // Gate A and the state-table guard on the file-writing tools.
  on('tool.call', { tool: /^(Edit|Write|MultiEdit|NotebookEdit)$/ }, async ($, e, next) => {
    const m = await load($)
    const v = approvalVerdict(m)
    const path = String((e as Any).file_path ?? '')
    // Redraw on a refusal so the pane shows the Approve or Re-approve button
    // now, not when the turn ends. With no round approved, a write that only
    // proposes (the brief, or a ledger with nothing active) may go on.
    if (!v.ok && !(v.kind === 'unapproved' && proposesOnly(m, path, e as Any))) { redraw($); return { deny: denial('Gate A', v) } }

    // Gate B guards this repo only: a write outside it (a scratch page, a
    // notes file) is neither held nor counted as an unproven round.
    const inRepo = path.startsWith(`${m.root}/`)
    const held = m.governed && inRepo ? await heldByGateB($, m, isEvidencePath(m, path)) : null
    if (held) return { deny: held }
    if (m.governed && isBriefPath(path)) {
      const current = (await readText($, at(m.root, 'bob/brief.json'))) ?? ''
      const text = proposedText(e as Any, current)
      if (text !== null) {
        let after: Any | null = null
        try {
          after = JSON.parse(text)
        } catch {
          return { deny: 'BOB state guard refused this write: it would leave bob/brief.json as text that does not parse as JSON. Next action: Claude: write the whole file as valid JSON.' }
        }
        const why = transitionVerdict(m, after ?? {}, 'ai', await facePromises($, m))
        if (why) return { deny: `BOB state guard refused this write. ${why}. Next action: Claude: capture evidence first, or leave the state for Ash.` }
      }
    }

    if (m.governed && inRepo) await update($, touchedAtom, list => [...list, path].slice(-100))
    redraw($)
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'BOB Gate A: its guard failed, so this write is refused. Next action: Claude: report the failure to Ash.' }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const command = String(e.command ?? '')
    if (!writesFiles(command) && !writesBriefFromBash(command)) return next(e)
    const m = await load($)
    if (m.governed && writesBriefFromBash(command)) {
      return { deny: 'BOB state guard refused this command: it writes bob/brief.json from Bash, and the state guard (state table, evidence before verified, a person before accepted) only sees Edit or Write. Next action: Claude: change bob/brief.json with Edit or Write.' }
    }
    const v = approvalVerdict(m)
    if (!v.ok) { redraw($); return { deny: denial('Gate A', v) } }
    // A Bash write counts as evidence only when it names docs/evidence/; the
    // remote checks stay the real line for anything a command hides.
    const held = m.governed ? await heldByGateB($, m, command.includes('docs/evidence/')) : null
    if (held) return { deny: held }
    if (m.governed) await update($, touchedAtom, list => [...list, `bash: ${e.command.slice(0, 60)}`].slice(-100))
    redraw($)
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'BOB Gate A: its guard failed, so this command is refused. Next action: Claude: report the failure to Ash.' }))

  // Gate B: a round that wrote files cannot end until the active increment's
  // requirement ids gained an evidence record (bob/schema.json, gates.B_evidence).
  on('classic.Stop', async ($, e, next) => {
    // The turn an Approve click started is ending: close its run on the record.
    await closeRun($)
    await writePage($)
    const m = await load($)
    if (!m.governed || !m.ledger) return (await reportCheck($, e)) ?? next(e)
    const active = activeIncrement(m)
    if (!active) return (await reportCheck($, e)) ?? next(e)
    const wrote = await read($, touchedAtom)
    if (wrote.length === 0) return (await reportCheck($, e)) ?? next(e)

    const ids: string[] = active.requirement_ids ?? []
    const base = new Set(await read($, baselineAtom))
    const gained = evidenceFor(m, ids).filter(ev => !base.has(String(ev.id)))
    if (gained.length || (await read($, provenAtom))) {
      await update($, baselineAtom, list => [...list, ...gained.map(ev => String(ev.id))])
      await update($, touchedAtom, () => [])
      redraw($)
      return (await reportCheck($, e)) ?? next(e)
    }

    const kinds: string[] = m.schema?.evidence?.kinds ?? []
    const message =
      `BOB Gate B: this round changed ${wrote.length} file(s) under ${active.id} but gained no evidence record for ${ids.join(', ')}. ` +
      `Evidence is one new record in bob/ledger.json evidence[] with requirement_id one of those ids, kind ${kinds.join(', ')}, ` +
      `ref pointing at a file under docs/evidence/ captured from a tool result, origin tool or human, and the base fields (id, created_at, source, is_synthetic). ` +
      `Model prose is never evidence. Add the record and its file, or set ${active.id} to returned and say why.`

    if (e.stop_hook_active) {
      $.ui.toast(`BOB: round left unproven for ${ids.join(', ')}`)
      return (await reportCheck($, e)) ?? next(e)
    }
    return { block: message }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const m = await load($)
    const b = describe(m, await read($, preflightAtom), Date.now())
    const pending = await read($, pendingAtom)
    const note = await read($, noteAtom)
    const turnId = await read($, turnAtom)

    const tracked = m.governed && m.ledger
    const reqs = ((m.brief?.requirements ?? []) as Any[])
    const stateOf = (rid: string) => String(reqs.find(r => r.id === rid)?.state ?? 'unknown')
    const active: Any | null = tracked ? activeIncrement(m) : null
    const activeDone = !!active && ((active.requirement_ids ?? []) as string[]).every(rid => ['verified', 'accepted'].includes(stateOf(rid)))
    // Every increment waiting for a person, while none is active or the active one is fully verified (R-bob-15).
    const waiting: Any[] = tracked && (!active || activeDone) ? ((m.ledger.increments ?? []) as Any[]).filter(i => ['proposed', 'approved'].includes(i.state)) : []
    const others: Any[] = m.place.workspace ? ((m.place.workspace.projects ?? []) as Any[]).filter(p => p.name !== m.place.project) : []
    const design = await designOf($, m)
    const current = design ? design.done.findIndex(d => !d) : -1
    const gateA = active ? approvalVerdict(m) : null
    const staleRun = !!b.stale && b.stale.startsWith('stale, reconciling')
    // Chips a person can read: the promise in a few words and its state, never an id.
    const textOf = (rid: string) => clipText(reqs.find(r => r.id === rid)?.text ?? 'a promise', 44)
    const chips = (ids: string[]) => (
      <Box flexDirection="column">
        {ids.map(rid => (
          <Text key={rid} color={colour({ id: rid, text: '', state: stateOf(rid), known: stateOf(rid) !== 'unknown', evidence: '', proofs: 0 })}>
            {`· ${textOf(rid)} [${stateOf(rid) === 'unknown' ? 'unknown state' : stateWords(stateOf(rid))}]`}
          </Text>
        ))}
      </Box>
    )
    // The first thing a new person sees: the one question (R-bob-demo-14). It leads
    // when the workspace has no project, or the current project has not started.
    const askFirst = !!m.place.workspace && (!m.place.project || (!tracked && !design))
    // Built promises a screen rests on, in the active round: proven only by a person's press.
    const face = active ? await facePromises($, m) : new Set<string>()
    const toSee: string[] = active ? ((active.requirement_ids ?? []) as string[]).filter(rid => face.has(rid) && ['implemented', 'reported'].includes(stateOf(rid))) : []

    return (
      <Box flexDirection="column" gap={1}>
        {askFirst ? (
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            <Text weight="semibold">{QUESTION}</Text>
            <Text dimColor>Say it in a sentence. BOB starts the project and the map lights up as each stage is proven.</Text>
            <Input key="start-idea" label={QUESTION} placeholder="describe your idea in a sentence" submitLabel="Start" onSubmit={(value, ev) => submitIdea($, value, ev)} />
          </Box>
        ) : null}

        {waiting.length ? (
          <Box flexDirection="column" gap={1} borderStyle="round" paddingX={1}>
            <Text weight="semibold">Waiting on you</Text>
            {waiting.map(inc => (
              <Box key={`wait-${inc.id}`} flexDirection="column">
                <Text>{`“${titleOf(inc)}” is ready for your yes.`}</Text>
                {chips((inc.requirement_ids ?? []) as string[])}
                <Button key={`approve-${inc.id}`} variant="primary" onPress={press => pressApprove($, String(inc.id), press)}>
                  {`Approve: ${titleOf(inc)}`}
                </Button>
                <Input key={`sendback-${inc.id}`} label="Send back with a note" placeholder="what needs to change" submitLabel="Send back" onSubmit={(value, ev) => sendBack($, String(inc.id), value, ev)} />
              </Box>
            ))}
          </Box>
        ) : null}

        {active ? (
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            <Text weight="semibold">{`Round: ${titleOf(active)}`}</Text>
            {chips((active.requirement_ids ?? []) as string[])}
            {toSee.map(rid => (
              <Button key={`seen-${rid}`} onPress={press => pressSeen($, rid, press)}>
                {`I\u2019ve seen this: ${textOf(rid)}`}
              </Button>
            ))}
            {gateA && !gateA.ok ? (
              <Button key={`reapprove-${active.id}`} variant="primary" onPress={press => pressApprove($, String(active.id), press)}>
                {`Approve again: ${titleOf(active)} (the brief changed)`}
              </Button>
            ) : null}
            <Box flexDirection="row" gap={2}>
              {turnId ? (
                <Button key="pause" onPress={press => pressPause($, press)}>
                  Pause
                </Button>
              ) : null}
              <Button key="see-evidence" onPress={press => seeEvidence($, String(active.id), press)}>
                See evidence
              </Button>
            </Box>
          </Box>
        ) : null}

        {tracked ? (
          <Box flexDirection="row" gap={2}>
            <Button key="open-map" onPress={press => openMap($, press)}>
              Open the picture
            </Button>
            <Button key="edit-picture" onPress={press => pressEditPicture($, press)}>
              Edit the picture
            </Button>
          </Box>
        ) : null}

        {design ? (
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            <Text weight="semibold">{`Designing ${m.place.project ?? 'this project'}`}</Text>
            {STAGES.map((name, i) => (
              <Text key={`stage-${i}`} color={design.done[i] ? 'success' : i === current ? 'suggestion' : 'inactive'}>
                {`${design.done[i] ? '✓' : i === current ? '▶' : '·'} ${name}`}
              </Text>
            ))}
            {design.who || design.job ? <Text weight="semibold">Brief so far</Text> : null}
            {design.who ? <Text>{`Who: ${design.who}`}</Text> : null}
            {design.job ? <Text>{`Job: ${design.job}`}</Text> : null}
            {design.reviews.length ? (
              <Box flexDirection="row" gap={1} flexWrap="wrap">
                {design.reviews.map(r => (
                  <Button key={`review-${r.key}`} onPress={press => openReview($, r.key, String(m.place.project ?? 'this project'), press)}>
                    {`See ${r.label}`}
                  </Button>
                ))}
              </Box>
            ) : null}
            {design.proposal ? (
              <Button key="adopt" variant="primary" onPress={press => pressAdopt($, press)}>
                Adopt this project
              </Button>
            ) : null}
          </Box>
        ) : null}

        {m.place.workspace ? (
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            <Text weight="semibold">Projects</Text>
            {others.map(p => (
              <Button key={`project-${p.name}`} plain onPress={press => pressSwitch($, String(p.name), press)}>
                {`Open ${p.name}`}
              </Button>
            ))}
            {askFirst ? null : (
              <Input key="start-idea" label="Start a project" placeholder="describe your idea in a sentence" submitLabel="Start" onSubmit={(value, ev) => submitIdea($, value, ev)} />
            )}
          </Box>
        ) : null}

        <Box flexDirection="column">
          <Text weight="semibold">BOB · Now</Text>
          <Text>Project: {b.project}</Text>
          {b.workspace ? <Text dimColor>Workspace: {b.workspace}</Text> : null}
          <Text dimColor>{b.source}</Text>
          <Text>Round: {b.increment}</Text>
          <Text>Approval: {b.approval}</Text>
          <Text>Current task: {b.task}</Text>
          <Text>Blocker: {b.blocker}</Text>
          <Text weight="semibold">Next action: {b.next}</Text>
          {note ? <Text dimColor>{note}</Text> : null}
          {pending ? (
            <Text color="warning">{`Gate B: the last round left ${pending.ids.length === 1 ? 'one promise' : `${pending.ids.length} promises`} unproven; only proof may be written until it lands`}</Text>
          ) : null}
          {b.stale ? <Text color="warning">{b.stale}</Text> : <Text dimColor>ledger: current</Text>}
          {staleRun ? (
            <Button key="reconcile" onPress={press => pressReconcile($, press)}>
              Close stale run
            </Button>
          ) : null}
          {b.preflight ? (
            b.preflight.stops.length ? (
              <Text color="error">Preflight STOP: {b.preflight.stops.join(' · ')}</Text>
            ) : (
              <Text dimColor>preflight: clear</Text>
            )
          ) : (
            <Text dimColor>preflight: not run this session</Text>
          )}
        </Box>

        <Box flexDirection="column">
          <Text weight="semibold">Board</Text>
          {b.rows.length === 0 ? <Text dimColor>no promises yet</Text> : null}
          {b.rows.map(r => (
            <Box key={r.id} flexDirection="row" gap={1}>
              <Text>{r.text}</Text>
              <Text color={colour(r)}>[{r.known ? stateWords(r.state) : `unknown state ${r.state}`}]</Text>
              {r.proofs ? <Text dimColor>{r.proofs === 1 ? 'one proof' : `${r.proofs} proofs`}</Text> : null}
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text weight="semibold">Evidence</Text>
          {b.evidence.length === 0 ? <Text dimColor>none</Text> : null}
          {b.evidence.map(ev => (
            <Text key={ev.id} dimColor>
              {`${ev.kind} for “${ev.about}” · ${when(ev.at)}`}
            </Text>
          ))}
          {b.notes.map(n => (
            <Text key={n} dimColor>
              {n}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
