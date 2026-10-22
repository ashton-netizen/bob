import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Preflight } from '../types'

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

type Any = Record<string, any>
type Engine = Any

type Model = {
  // The repo root, absolute, from $.session.root(). Every repo file is read and
  // written under it: a bare relative path resolves against the engine's own
  // working directory, which is the plugin folder, not the repo (seen live on
  // 21 October 2026: /bob adopt refused "bob/ledger.json already exists").
  root: string
  governed: boolean
  ownLedger: boolean
  schema: Any | null
  brief: Any | null
  approvals: Any[]
  ledger: Any | null
  ledgerPath: string
  ledgerMtimeMs: number | null
  hash: string | null
  // sha256 of the brief with requirement state and evidence_ids left out, keys sorted
  // (see scopeHashOf). A lawful state move changes `hash` and never this.
  scopeHash: string | null
  parseErrors: string[]
}

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

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
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

// Build 3: what an approval covers. A requirement walking one step through the
// state table (and gaining an evidence id) is guarded by the state guard, so it
// must not cost a re-approval; what a requirement SAYS, and which requirements
// exist, must. Canonical JSON (sorted keys) so whitespace and key order never
// matter. An approval written before 0.3.0 carries brief_hash only and keeps
// working byte for byte.
const canonical = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v as Any).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Any)[k])}`).join(',')}}`
  : JSON.stringify(v)

async function scopeHashOf(brief: Any): Promise<string | null> {
  try {
    const scoped = { ...brief, requirements: ((brief.requirements ?? []) as Any[]).map(({ state: _s, evidence_ids: _e, ...rest }) => rest) }
    return await sha256Bytes(new TextEncoder().encode(canonical(scoped)))
  } catch {
    return null
  }
}

// The repo root, absolute. The one home for resolving a repo path.
async function repoRoot($: Engine): Promise<string> {
  const root = String(await $.session.root())
  return root.replace(/\/+$/, '')
}
const at = (root: string, path: string) => `${root}/${path}`

async function load($: Engine): Promise<Model> {
  const parseErrors: string[] = []
  const root = await repoRoot($)
  const schema = await readJson($, `${$.plugin.root}/bob/schema.json`, parseErrors)
  const governed = await exists($, at(root, 'bob/brief.json'))
  // The repo's own ledger wins over fixtures as soon as it exists, brief or not.
  const ownLedger = governed || (await exists($, at(root, 'bob/ledger.json')))
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
  return { root, governed, ownLedger, schema, brief, approvals, ledger, ledgerPath, ledgerMtimeMs, hash, scopeHash, parseErrors }
}

// The test kit's $ has no ui.invalidate; a live session does.
const redraw = ($: Engine) => {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // the kit's $ has no invalidate; nothing to redraw there
  }
}

const short = (hash: string | null) => (hash ? hash.slice(0, 12) : 'unknown')
const activeIncrement = (m: Model): Any | undefined => (m.ledger?.increments ?? []).find((i: Any) => i.state === 'active')
const evidenceFor = (m: Model, ids: string[]): Any[] =>
  ((m.ledger?.evidence ?? []) as Any[]).filter(ev => ids.includes(ev.requirement_id))

type Verdict = { ok: true; note: string } | { ok: false; reason: string; next: string }

// Gate A: deny unless an approval record has brief_hash == sha256(bob/brief.json)
// and the active increment in scope_increment_ids (bob/schema.json, gates.A_approval).
function approvalVerdict(m: Model): Verdict {
  if (!m.governed) return { ok: true, note: 'not governed: no bob/brief.json, gates idle' }
  if (!m.schema) return { ok: false, reason: 'bob/schema.json is missing or does not parse in the plugin folder', next: 'Ash needs to reinstall BOB' }
  if (m.parseErrors.length) return { ok: false, reason: m.parseErrors.join('; '), next: 'Ash needs to restore the file from git (git checkout -- <file>), or ask Claude to remove stray typed text if it was never committed. A typed /bob command lands in an open file pane: Ash needs to close file panes before typing one' }
  if (!m.brief || !m.ledger) return { ok: false, reason: 'bob/brief.json or bob/ledger.json is missing', next: 'Ash needs to run /bob adopt, or restore the files from git' }
  const active = activeIncrement(m)
  if (!active) {
    const proposed = ((m.ledger.increments ?? []) as Any[]).find(i => ['proposed', 'approved'].includes(i.state))
    return {
      ok: false,
      reason: 'no increment in bob/ledger.json has state active',
      next: `Ash needs to type /bob approve ${proposed?.id ?? '<increment id>'} (the only writer of bob/approvals.json)`,
    }
  }
  const inScope = m.approvals.filter(a => (a.scope_increment_ids ?? []).includes(active.id))
  const match = inScope.find(a => a.brief_hash === m.hash || (a.scope_hash && a.scope_hash === m.scopeHash))
  if (match) return { ok: true, note: `${active.id} approved by ${match.id}` }
  if (inScope.length) {
    const ids = inScope.map(a => a.id).join(', ')
    return {
      ok: false,
      reason: `bob/brief.json changed after approval ${ids}: its hash ${short(m.hash)} matches no approval of ${active.id}`,
      next: `Ash needs to re-approve ${active.id} against the current brief by typing /bob approve ${active.id} (one new record at brief_hash ${m.hash ?? 'unknown'})`,
    }
  }
  return {
    ok: false,
    reason: `no approval record in bob/approvals.json covers ${active.id} at brief hash ${short(m.hash)}`,
    next: `Ash needs to type /bob approve ${active.id} (one new record in bob/approvals.json with brief_hash ${m.hash ?? 'unknown'})`,
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
    if (inc.state === 'active') out.push(`increment ${inc.id}: adopt cannot propose an active increment; approval is /bob approve`)
    const reqIds = new Set(reqs.map(r => String(r.id)))
    for (const id of (inc.requirement_ids ?? []) as string[]) if (!reqIds.has(id)) out.push(`increment ${inc.id}: requirement ${id} is not in brief.requirements`)
  }
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

const refusedText = (what: string, reasons: string[]) =>
  [`BOB ${what} refused. Nothing was written.`, ...reasons.map(r => `- ${r}`), `Next action: Claude: fix the proposal at ${PROPOSAL_PATH} and run /bob ${what} again.`].join('\n')

async function adopt($: Engine): Promise<string> {
  const errors: string[] = []
  const schema = await readJson($, `${$.plugin.root}/bob/schema.json`, errors)
  if (!schema) return refusedText('adopt', ['bob/schema.json is missing or does not parse in the plugin folder. Ash needs to reinstall BOB'])

  const root = await repoRoot($)
  const existing: string[] = []
  for (const f of BOB_FILES) if (await exists($, at(root, f))) existing.push(f)
  if (existing.length) return refusedText('adopt', existing.map(f => `${f} already exists; adopt never overwrites a governed repo's files`))

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

  const wrote: string[] = []
  await $.fs.write(at(root, 'bob/ledger.json'), pretty(ledger)); wrote.push('bob/ledger.json')
  await $.fs.write(at(root, 'bob/sources.json'), pretty(sources)); wrote.push('bob/sources.json')
  await $.fs.write(at(root, 'bob/approvals.json'), pretty({ approvals: [] })); wrote.push('bob/approvals.json')
  // Last on purpose: Gate A engages the moment this file exists.
  await $.fs.write(at(root, 'bob/brief.json'), pretty(brief)); wrote.push('bob/brief.json')

  const incIds = (ledger.increments as Any[]).map(i => `${i.id} ${i.state}`).join(', ')
  const name = String(p.brief.project?.name ?? 'this repo')
  const line = `- /bob adopt, ${stamp()}: implemented. bob/brief.json (${(brief.requirements as Any[]).length} requirements), bob/ledger.json (${incIds || 'no increments'}; ${(ledger.evidence as Any[]).length} evidence records), bob/sources.json (${(p.sources as Any[]).length} sources), bob/approvals.json (empty). Evidence: ${PROPOSAL_PATH}. Ash needs to: type /bob approve ${(ledger.increments as Any[])[0]?.id ?? '<increment id>'}.`
  const current = await readText($, at(root, 'docs/project-status.md'))
  const status = current === null
    ? `# ${name} · project status (living file, update in place)\n\nGoverned by BOB. States and transitions: bob/schema.json in the BOB plugin.\n\n## Build log (one line per step: step, state, evidence)\n${line}\n`
    : `${current.replace(/\s*$/, '')}\n${line}\n`
  await $.fs.write(at(root, 'docs/project-status.md'), status); wrote.push(`docs/project-status.md (${current === null ? 'created' : 'one line appended'})`)

  return [
    `BOB adopt: wrote ${wrote.length} files, refused 0 (under ${root}).`,
    ...wrote.map(w => `- wrote ${w}`),
    `Gate A is now engaged: no increment is active, so every write is refused until a person types /bob approve ${(ledger.increments as Any[])[0]?.id ?? '<increment id>'}.`,
    'Nothing was committed: committing is a Gate A decision in the session.',
  ].join('\n')
}

async function approve($: Engine, idArg: string, originKind: string | undefined): Promise<string> {
  const id = idArg.trim()
  if (!id) return refusedText('approve', ['no increment id given. Usage: /bob approve <increment id>'])
  if (originKind && NON_HUMAN_ORIGINS.includes(originKind)) return refusedText('approve', [`this command came from "${originKind}", not a person. Only a person at the prompt approves`])

  const m = await load($)
  if (!m.governed) return refusedText('approve', ['this repo is not governed (no bob/brief.json). Run /bob adopt first'])
  if (!m.ledger || !m.brief) return refusedText('approve', ['bob/ledger.json or bob/brief.json is missing or does not parse'])
  if (m.parseErrors.length) return refusedText('approve', m.parseErrors)
  if (!m.hash) return refusedText('approve', ['bob/brief.json could not be hashed'])

  const increments: Any[] = m.ledger.increments ?? []
  const inc = increments.find(i => i.id === id)
  if (!inc) return refusedText('approve', [`${id} is not an increment in bob/ledger.json (${increments.map(i => i.id).join(', ') || 'none'})`])
  const other = increments.find(i => i.state === 'active' && i.id !== id)
  if (other) return refusedText('approve', [`${other.id} is active; one increment at a time. Close ${other.id} (done or returned) before approving ${id}`])
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

  const ledger = { ...m.ledger, increments: increments.map(i => (i.id === id ? { ...i, state: 'active', approval_id: record.id } : i)) }
  await $.fs.write(at(m.root, 'bob/ledger.json'), pretty(ledger))
  redraw($)

  return [
    `BOB approve: ${record.id} written to bob/approvals.json by ${approver} for ${id} at brief hash ${short(m.hash)}.`,
    `${id} is now active (approved, then active). Gate A allows writes under it; Gate B requires evidence for ${(inc.requirement_ids ?? []).join(', ') || 'its requirement ids'} before a round that writes can end.`,
    'Nothing was committed.',
  ].join('\n')
}

// R12 after an interrupted run: a run still running or verifying with no event
// past the stale window is closed by a `reconciled` event, never by prose. It
// becomes completed when the ledger already holds a finished event for it, else
// failed with exit_reason interrupted. Increments and requirements are not
// touched: what the interrupted work proved is for evidence and a person.
const STALE_MS = 120_000

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

const denial = (gate: string, v: Extract<Verdict, { ok: false }>) => `BOB ${gate} refused this write. ${v.reason}. Next action: ${v.next}.`

// The state-table guard on bob/brief.json: every changed requirement state must
// be a transition the schema allows; verified needs an evidence record; accepted
// needs a human on the transition, and a tool call is never human.
function transitionVerdict(m: Model, after: Any, source: string): string | null {
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

type Row = { id: string; text: string; state: string; known: boolean; evidence: string }
type Board = {
  source: string
  increment: string
  approval: string
  task: string
  blocker: string
  next: string
  stale: string | null
  rows: Row[]
  evidence: { id: string; kind: string; requirement: string; at: string }[]
  preflight: Preflight | null
  notes: string[]
}

function describe(m: Model, pf: Preflight | null, now: number): Board {
  const states: string[] = m.schema?.requirement?.states ?? []
  const reqs = ((m.brief?.requirements ?? []) as Any[])
  const evidence = ((m.ledger?.evidence ?? []) as Any[])
  const active = activeIncrement(m)
  const runs = ((m.ledger?.runs ?? []) as Any[])
  const latestRun = runs.slice().sort((a, b) => String(a.last_event_at ?? '').localeCompare(String(b.last_event_at ?? '')))[runs.length - 1]
  const events = ((m.ledger?.events ?? []) as Any[])
  const runEvents = latestRun ? events.filter(ev => ev.run_id === latestRun.id) : events
  const started = runEvents.filter(ev => ev.type === 'started').slice(-1)[0]
  const lastEventAt = events.map(ev => Date.parse(String(ev.at))).filter(n => !Number.isNaN(n)).sort((a, b) => a - b).slice(-1)[0]

  const rows: Row[] = reqs.map(r => ({
    id: String(r.id),
    text: String(r.text ?? ''),
    state: String(r.state ?? ''),
    known: states.includes(r.state),
    evidence: evidence.filter(ev => ev.requirement_id === r.id).map(ev => ev.id).join(' '),
  }))

  const verdict = m.governed ? approvalVerdict(m) : null
  const blocked = rows.filter(r => r.state === 'blocked').map(r => r.id)
  let blocker = blocked.length ? `${blocked.join(', ')} blocked` : 'none'
  if (verdict && !verdict.ok) blocker = verdict.reason

  let next = 'Ash needs to: approve an increment and set it active'
  if (active) {
    const inScope = reqs.filter(r => (active.requirement_ids ?? []).includes(r.id))
    const unproven = inScope.find(r => ['implemented', 'reported', 'designed'].includes(r.state) && !evidence.some(ev => ev.requirement_id === r.id))
    const toAccept = inScope.find(r => r.state === 'verified')
    const toVerify = inScope.find(r => ['implemented', 'reported'].includes(r.state))
    if (verdict && !verdict.ok) next = verdict.next
    else if (unproven) next = `Claude: capture evidence for ${unproven.id}`
    else if (toVerify) next = `Claude: verify ${toVerify.id} against its check`
    else if (toAccept) next = `Ash needs to: accept or return ${toAccept.id}`
    else next = `Ash needs to: close ${active.id} and approve the next increment`
  }

  let stale: string | null = null
  if (m.ledgerMtimeMs !== null && lastEventAt !== undefined && m.ledgerMtimeMs < lastEventAt) stale = 'stale: ledger file is older than its last event'
  const staleRun = runs.find(r => ['running', 'verifying'].includes(r.state) && now - Date.parse(String(r.last_event_at)) > STALE_MS)
  if (staleRun) stale = `stale, reconciling: run ${staleRun.id} ${staleRun.state} with no event for ${Math.round((now - Date.parse(String(staleRun.last_event_at))) / 1000)}s. Type /bob reconcile to close it`

  const notes: string[] = []
  if (!m.governed && !m.ownLedger) notes.push('SYNTHETIC: not governed (no bob/brief.json); showing fixtures/. Gates idle.')
  if (!m.governed && m.ownLedger) notes.push('Not governed: no bob/brief.json, so no requirements are listed and the gates idle.')
  if (m.parseErrors.length) notes.push(...m.parseErrors)
  if (!m.schema) notes.push('bob/schema.json not found in the plugin folder')
  notes.push('No percentage is shown. No state is set from prose.')

  return {
    source: m.ownLedger ? m.ledgerPath : `${m.ledgerPath} (synthetic)`,
    increment: active ? `${active.id} · ${active.title ?? ''} · ${active.state}` : 'none active',
    approval: verdict ? (verdict.ok ? verdict.note : 'missing') : active ? `${active.approval_id ?? 'none'} (fixture, not checked)` : 'none',
    task: started ? String(started.detail ?? '') : 'none recorded',
    blocker,
    next,
    stale,
    rows,
    evidence: evidence.slice(-8).reverse().map(ev => ({ id: String(ev.id), kind: String(ev.kind), requirement: String(ev.requirement_id), at: String(ev.captured_at ?? '') })),
    preflight: pf,
    notes,
  }
}

const statusText = (b: Board): string =>
  [
    `BOB · Now (${b.source})`,
    `Increment: ${b.increment}`,
    `Approval: ${b.approval}`,
    `Current task: ${b.task}`,
    `Blocker: ${b.blocker}`,
    `Next action: ${b.next}`,
    b.stale ? `Ledger: ${b.stale}` : 'Ledger: current',
    b.preflight ? `Preflight: ${b.preflight.stops.length ? `STOP · ${b.preflight.stops.join(' · ')}` : 'clear'}` : 'Preflight: not run this session',
    '',
    'Board',
    ...b.rows.map(r => `${r.id} ${r.text} [${r.known ? r.state : `unknown state ${r.state}`}]${r.evidence ? ` ${r.evidence}` : ''}`),
    '',
    'Evidence',
    ...(b.evidence.length ? b.evidence.map(ev => `${ev.id} · ${ev.kind} · ${ev.requirement} · ${ev.at}`) : ['none']),
    ...b.notes,
  ].join('\n')

const colour = (r: Row) =>
  !r.known ? 'error'
  : r.state === 'accepted' || r.state === 'verified' ? 'success'
  : r.state === 'implemented' || r.state === 'reported' ? 'suggestion'
  : r.state === 'designed' ? 'warning'
  : r.state === 'blocked' ? 'error'
  : 'inactive'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'bob', description: 'BOB: status (default), open the board pane, adopt this repo from a proposal, approve <increment id> (a person only), or reconcile a run left running after an interruption' })

    try {
      // The preflight reads the repo, so it runs in the repo (its own fallback is $PWD).
      const ran = await $.process.run(['bash', `${$.plugin.root}/scripts/preflight.sh`], { cwd: await repoRoot($), env: { CLAUDE_PROJECT_DIR: await repoRoot($) } })
      const pf = parsePreflight(ran.exitCode, ran.stdout, ran.stderr, Date.now())
      await update($, preflightAtom, () => pf)
      if (pf.stops.length) $.ui.toast(`BOB preflight STOP: ${pf.stops[0]}`)
    } catch {
      await update($, preflightAtom, () => parsePreflight(1, '', 'preflight · STOP · scripts/preflight.sh could not run', Date.now()))
    }

    const m = await load($)
    const active = activeIncrement(m)
    const ids = active ? evidenceFor(m, active.requirement_ids ?? []).map(ev => String(ev.id)) : []
    await update($, baselineAtom, () => ids)
    await update($, touchedAtom, () => [])

    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, touchedAtom, () => [])
    return next(e)
  })

  on('command.run', { command: 'bob' }, async ($, e) => {
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
    if (word === 'approve') return { text: await approve($, rest.join(' '), (e as Any).origin?.kind) }
    const m = await load($)
    return { text: statusText(describe(m, await read($, preflightAtom), Date.now())) }
  })

  // Gate A and the state-table guard on the file-writing tools.
  on('tool.call', { tool: /^(Edit|Write|MultiEdit|NotebookEdit)$/ }, async ($, e, next) => {
    const m = await load($)
    const v = approvalVerdict(m)
    if (!v.ok) return { deny: denial('Gate A', v) }

    const path = String((e as Any).file_path ?? '')
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
        const why = transitionVerdict(m, after ?? {}, 'ai')
        if (why) return { deny: `BOB state guard refused this write. ${why}. Next action: Claude: capture evidence first, or leave the state for Ash.` }
      }
    }

    if (m.governed) await update($, touchedAtom, list => [...list, path].slice(-100))
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
    if (!v.ok) return { deny: denial('Gate A', v) }
    if (m.governed) await update($, touchedAtom, list => [...list, `bash: ${e.command.slice(0, 60)}`].slice(-100))
    redraw($)
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'BOB Gate A: its guard failed, so this command is refused. Next action: Claude: report the failure to Ash.' }))

  // Gate B: a round that wrote files cannot end until the active increment's
  // requirement ids gained an evidence record (bob/schema.json, gates.B_evidence).
  on('classic.Stop', async ($, e, next) => {
    const m = await load($)
    if (!m.governed || !m.ledger) return next(e)
    const active = activeIncrement(m)
    if (!active) return next(e)
    const wrote = await read($, touchedAtom)
    if (wrote.length === 0) return next(e)

    const ids: string[] = active.requirement_ids ?? []
    const base = new Set(await read($, baselineAtom))
    const gained = evidenceFor(m, ids).filter(ev => !base.has(String(ev.id)))
    if (gained.length) {
      await update($, baselineAtom, list => [...list, ...gained.map(ev => String(ev.id))])
      await update($, touchedAtom, () => [])
      redraw($)
      return next(e)
    }

    const kinds: string[] = m.schema?.evidence?.kinds ?? []
    const message =
      `BOB Gate B: this round changed ${wrote.length} file(s) under ${active.id} but gained no evidence record for ${ids.join(', ')}. ` +
      `Evidence is one new record in bob/ledger.json evidence[] with requirement_id one of those ids, kind ${kinds.join(', ')}, ` +
      `ref pointing at a file under docs/evidence/ captured from a tool result, origin tool or human, and the base fields (id, created_at, source, is_synthetic). ` +
      `Model prose is never evidence. Add the record and its file, or set ${active.id} to returned and say why.`

    if (e.stop_hook_active) {
      $.ui.toast(`BOB: round left unproven for ${ids.join(', ')}`)
      return next(e)
    }
    return { block: message }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const b = describe(await load($), await read($, preflightAtom), Date.now())

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text weight="semibold">BOB · Now</Text>
          <Text dimColor>{b.source}</Text>
          <Text>Increment: {b.increment}</Text>
          <Text>Approval: {b.approval}</Text>
          <Text>Current task: {b.task}</Text>
          <Text>Blocker: {b.blocker}</Text>
          <Text weight="semibold">Next action: {b.next}</Text>
          {b.stale ? <Text color="warning">{b.stale}</Text> : <Text dimColor>ledger: current</Text>}
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
          {b.rows.length === 0 ? <Text dimColor>no requirements</Text> : null}
          {b.rows.map(r => (
            <Box key={r.id} flexDirection="row" gap={1}>
              <Text mono>{r.id}</Text>
              <Text>{r.text}</Text>
              <Text color={colour(r)}>[{r.known ? r.state : `unknown state ${r.state}`}]</Text>
              {r.evidence ? <Text dimColor>{r.evidence}</Text> : null}
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text weight="semibold">Evidence</Text>
          {b.evidence.length === 0 ? <Text dimColor>none</Text> : null}
          {b.evidence.map(ev => (
            <Text key={ev.id} dimColor>
              {ev.id} · {ev.kind} · {ev.requirement} · {ev.at}
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
