// BOB board logic with no engine imports: shared by hooks/register.tsx (the pane
// and /bob status) and by scripts/render-status.ts (the same board rendered as
// docs/status.html outside a session). One home for how a ledger is described.

import type { Preflight } from '../types'

export type Any = Record<string, any>

export type Place = {
  session: string
  root: string
  workspace: Any | null
  workspaceError: string | null
  project: string
}

export const WORKSPACE_FILE = 'bob-workspace.json'
export const WORKSPACE_REPAIR = `Ash needs to rename ${WORKSPACE_FILE} in Finder (for example to bob-workspace.broken.json, never delete it), then ask Claude to open the project again`

export type Model = {
  // The repo root, absolute, from $.session.root(). Every repo file is read and
  // written under it: a bare relative path resolves against the engine's own
  // working directory, which is the plugin folder, not the repo (seen live on
  // 21 October 2026: /bob adopt refused "bob/ledger.json already exists").
  root: string
  // Where this session sits: a plain repo, or a BOB workspace and its current project.
  place: Place
  governed: boolean
  ownLedger: boolean
  // Not governed and no ledger of its own, but fixtures/ exists here (BOB's own repo).
  fixtures: boolean
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


export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Build 3: what an approval covers. A requirement walking one step through the
// state table (and gaining an evidence id) is guarded by the state guard, so it
// must not cost a re-approval; what a requirement SAYS, and which requirements
// exist, must. Canonical JSON (sorted keys) so whitespace and key order never
// matter. An approval written before 0.3.0 carries brief_hash only and keeps
// working byte for byte.
export const canonical = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v as Any).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Any)[k])}`).join(',')}}`
  : JSON.stringify(v)

export async function scopeHashOf(brief: Any): Promise<string | null> {
  try {
    const scoped = { ...brief, requirements: ((brief.requirements ?? []) as Any[]).map(({ state: _s, evidence_ids: _e, ...rest }) => rest) }
    return await sha256Bytes(new TextEncoder().encode(canonical(scoped)))
  } catch {
    return null
  }
}

export const STALE_MS = 120_000

export const short = (hash: string | null) => (hash ? hash.slice(0, 12) : 'unknown')
export const activeIncrement = (m: Model): Any | undefined => (m.ledger?.increments ?? []).find((i: Any) => i.state === 'active')
export const evidenceFor = (m: Model, ids: string[]): Any[] =>
  ((m.ledger?.evidence ?? []) as Any[]).filter(ev => ids.includes(ev.requirement_id))

// R-bob-16: a governed repo whose every increment is done or returned (or that
// has none) is idle: no round is open, so there is nothing to approve. A
// proposed or approved increment, or a state the schema does not name, is not
// idle, so Gate A still refuses (fail closed).
export const IDLE = 'idle: no round started'
export const isIdle = (m: Model): boolean => ((m.ledger?.increments ?? []) as Any[]).every(i => ['done', 'returned'].includes(i.state))

// A refusal carries plain words for a person (reason, next) and, apart, the ids
// and hashes Claude needs (detail). `kind` names the one refusal under which
// Claude may still propose a round (see register.tsx, Gate A).
export type Verdict = { ok: true; note: string } | { ok: false; reason: string; next: string; detail?: string; kind?: 'unapproved' }

export const titleOf = (inc: Any | undefined): string => String(inc?.title ?? 'this round')
export const when = (iso: unknown): string => {
  const t = Date.parse(String(iso ?? ''))
  if (Number.isNaN(t)) return 'an unknown time'
  try {
    return new Date(t).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
  } catch {
    return new Date(t).toISOString()
  }
}

// Gate A: deny unless an approval record has brief_hash == sha256(bob/brief.json)
// and the active increment in scope_increment_ids, or the repo is idle
// (bob/schema.json, gates.A_approval).
export function approvalVerdict(m: Model): Verdict {
  if (m.place.workspaceError) return { ok: false, reason: m.place.workspaceError, next: WORKSPACE_REPAIR }
  if (!m.governed) return { ok: true, note: 'not governed: no bob/brief.json, gates idle' }
  if (!m.schema) return { ok: false, reason: 'BOB’s own rule file is missing or does not read', next: 'Ash needs to reinstall BOB', detail: 'bob/schema.json is missing or does not parse in the plugin folder' }
  if (m.parseErrors.length) return { ok: false, reason: 'a BOB record file does not read as it should', next: 'Ash needs to: ask Claude to restore the file from git, or to remove stray typed text if it was never committed. Text typed while a file pane is open lands in the file: close file panes before typing', detail: m.parseErrors.join('; ') }
  if (!m.brief || !m.ledger) return { ok: false, reason: 'the brief or the ledger is missing', next: 'Ash needs to: ask Claude to design and adopt this project (the BOB pane offers Adopt once the proposal exists), or restore the files from git', detail: 'bob/brief.json or bob/ledger.json is missing' }
  const active = activeIncrement(m)
  if (!active) {
    if (isIdle(m)) return { ok: true, note: `none needed: ${IDLE}` }
    const proposed = ((m.ledger.increments ?? []) as Any[]).find(i => ['proposed', 'approved'].includes(i.state))
    return {
      ok: false,
      kind: 'unapproved',
      reason: 'no round is approved yet',
      next: proposed ? `Ash needs to: press Approve for “${titleOf(proposed)}” in the BOB pane (a person’s click is the only thing that approves)` : 'Ash needs to: ask Claude to propose the next round, then approve it in the BOB pane',
      detail: `no increment in bob/ledger.json has state active${proposed ? `; ${proposed.id} is ${proposed.state}` : ''}`,
    }
  }
  const inScope = m.approvals.filter(a => (a.scope_increment_ids ?? []).includes(active.id))
  const match = inScope.find(a => a.brief_hash === m.hash || (a.scope_hash && a.scope_hash === m.scopeHash))
  if (match) return { ok: true, note: `approved by ${String(match.approver ?? 'unknown')}, ${when(match.approved_at)}` }
  if (inScope.length) {
    const ids = inScope.map(a => a.id).join(', ')
    return {
      ok: false,
      reason: 'the brief changed after this round was approved',
      next: `Ash needs to: press Approve again for “${titleOf(active)}” in the BOB pane, against the current brief`,
      detail: `bob/brief.json changed after approval ${ids}: its hash ${short(m.hash)} matches no approval of ${active.id}; a new record at brief_hash ${m.hash ?? 'unknown'} is needed`,
    }
  }
  return {
    ok: false,
    reason: 'no approval covers this round at the current brief',
    next: `Ash needs to: press Approve for “${titleOf(active)}” in the BOB pane`,
    detail: `no approval record in bob/approvals.json covers ${active.id} at brief hash ${short(m.hash)}`,
  }
}

// Plain words for a requirement where a person reads it: its text, clipped.
export const clipText = (s: unknown, n = 56): string => {
  const t = String(s ?? '').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}
export const stateWords = (state: string): string =>
  ({ not_assessed: 'not started', blocked: 'blocked', designed: 'designed', implemented: 'built', reported: 'reported', verified: 'proven', accepted: 'accepted', proposed: 'waiting for approval', approved: 'approved', active: 'in progress', done: 'done', returned: 'returned' } as Record<string, string>)[state] ?? state

export type Row = { id: string; text: string; state: string; known: boolean; evidence: string; proofs: number }
export type Board = {
  project: string
  workspace: string | null
  source: string
  increment: string
  approval: string
  task: string
  blocker: string
  next: string
  stale: string | null
  rows: Row[]
  evidence: { id: string; kind: string; requirement: string; about: string; at: string }[]
  preflight: Preflight | null
  notes: string[]
}

// `face`: the promises a screen in bob/product.json rests on. A built one with
// no person's look on record is Ash's "I've seen this" press, never Claude's
// verify (seen on the live picture page, 29 October 2026, 4:15 pm).
export function describe(m: Model, pf: Preflight | null, now: number, face: Set<string> = new Set()): Board {
  const states: string[] = m.schema?.requirement?.states ?? []
  const reqs = ((m.brief?.requirements ?? []) as Any[])
  const evidence = ((m.ledger?.evidence ?? []) as Any[])
  const active = activeIncrement(m)
  const runs = ((m.ledger?.runs ?? []) as Any[])
  // The current task is the active round's run; only with no active round
  // does the latest run by event stand in (a reconciled older run read as
  // "phase one" while phase two ran: seen on the status page, 29 October 2026).
  const newest = runs.slice().sort((a, b) => String(a.last_event_at ?? '').localeCompare(String(b.last_event_at ?? '')))[runs.length - 1]
  const latestRun = (active && runs.filter(r => r.increment_id === active.id).sort((a, b) => String(a.started_at ?? '').localeCompare(String(b.started_at ?? '')))[runs.filter(r => r.increment_id === active.id).length - 1]) || newest
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
    proofs: evidence.filter(ev => ev.requirement_id === r.id).length,
  }))
  const textOf = (id: string) => clipText(reqs.find(r => r.id === id)?.text ?? id)

  const verdict = m.governed ? approvalVerdict(m) : null
  const blocked = rows.filter(r => r.state === 'blocked').map(r => `“${clipText(r.text)}”`)
  let blocker = blocked.length ? `blocked: ${blocked.join(', ')}` : 'none'
  if (verdict && !verdict.ok) blocker = verdict.reason

  const fresh = !m.governed && !m.ownLedger && !m.fixtures
  let next = 'Ash needs to: approve an increment and set it active'
  if (m.place.workspaceError) next = WORKSPACE_REPAIR
  else if (m.place.workspace && !m.place.project) next = 'Ash needs to: describe your idea in the Start a project box in the BOB pane, or just tell Claude about it'
  else if (fresh) next = `Ash needs to: tell Claude about ${m.place.project}; Claude designs it with design-with-bob, and the BOB pane offers Adopt once the design is approved`
  const idle = !!m.governed && !!m.ledger && verdict?.ok === true && isIdle(m)
  if (idle) next = 'Claude: propose the next round before new build work; BOB is idle, so edits are allowed until then'
  if (active) {
    const inScope = reqs.filter(r => (active.requirement_ids ?? []).includes(r.id))
    const unproven = inScope.find(r => ['implemented', 'reported', 'designed'].includes(r.state) && !evidence.some(ev => ev.requirement_id === r.id))
    // No Accept button exists in the pane, so "accept or return" was an ask with
    // no button (the live map, 29 October 2026, 9:57 pm). A promise not yet
    // started is Claude's to start; with every promise proven, the Approve
    // press on the next round closes this one.
    const unstarted = inScope.find(r => ['not_assessed', 'designed'].includes(r.state))
    const needsLook = (r: Any) => face.has(r.id) && !evidence.some(ev => ev.requirement_id === r.id && ev.origin === 'human')
    const built = inScope.filter(r => ['implemented', 'reported'].includes(r.state))
    const toVerify = built.find(r => !needsLook(r))
    const toSee = built.find(needsLook)
    if (verdict && !verdict.ok) next = verdict.next
    else if (unproven) next = `Claude: capture proof for “${textOf(unproven.id)}”`
    else if (toVerify) next = `Claude: verify “${textOf(toVerify.id)}” against its check`
    else if (toSee) next = `Ash needs to: press I’ve seen this for “${textOf(toSee.id)}” in the BOB pane`
    else if (unstarted) next = `Claude: start on “${textOf(unstarted.id)}”`
    else next = `Ash needs to: press Approve on the next round in the BOB pane; “${titleOf(active)}” closes with it`
  }

  let stale: string | null = null
  if (m.ledgerMtimeMs !== null && lastEventAt !== undefined && m.ledgerMtimeMs < lastEventAt) stale = 'stale: the ledger file is older than its last event'
  const staleRun = runs.find(r => ['running', 'verifying'].includes(r.state) && now - Date.parse(String(r.last_event_at)) > STALE_MS)
  if (staleRun) stale = `stale, reconciling: a run has had no news for ${Math.round((now - Date.parse(String(staleRun.last_event_at))) / 1000)}s. Press Close stale run in the BOB pane`

  const notes: string[] = []
  if (m.place.workspaceError) notes.push(m.place.workspaceError)
  if (m.fixtures) notes.push('SYNTHETIC: not governed (no bob/brief.json); showing fixtures/. Gates idle.')
  if (fresh && !(m.place.workspace && !m.place.project)) notes.push('Not designed yet: no bob/brief.json and no ledger, so no requirements are listed and the gates idle.')
  if (!m.governed && m.ownLedger) notes.push('Not governed: no bob/brief.json, so no requirements are listed and the gates idle.')
  if (m.parseErrors.length) notes.push(...m.parseErrors)
  if (!m.schema) notes.push('bob/schema.json not found in the plugin folder')
  notes.push('No percentage is shown. No state is set from prose.')

  const projects = ((m.place.workspace?.projects ?? []) as Any[]).map(p => String(p.name))
  return {
    project: m.place.workspace && !m.place.project ? 'none yet' : `${m.place.project} · ${m.root}`,
    workspace: m.place.workspace ? `${m.place.session} · ${projects.length ? projects.join(', ') : 'no projects yet'}` : null,
    source: m.ownLedger ? m.ledgerPath : m.fixtures ? `${m.ledgerPath} (synthetic)` : 'no ledger yet',
    increment: active ? `${titleOf(active)} · ${stateWords(String(active.state))}` : idle ? IDLE : 'none active',
    approval: verdict ? (verdict.ok ? verdict.note : 'missing') : active ? 'fixture, not checked' : 'none',
    task: started ? String(started.detail ?? '') : 'none recorded',
    blocker,
    next,
    stale,
    rows,
    evidence: evidence.slice(-8).reverse().map(ev => ({ id: String(ev.id), kind: String(ev.kind), requirement: String(ev.requirement_id), about: textOf(String(ev.requirement_id)), at: String(ev.captured_at ?? '') })),
    preflight: pf,
    notes,
  }
}

export const statusText = (b: Board): string =>
  [
    `BOB · Now (${b.source})`,
    `Project: ${b.project}`,
    ...(b.workspace ? [`Workspace: ${b.workspace}`] : []),
    `Round: ${b.increment}`,
    `Approval: ${b.approval}`,
    `Current task: ${b.task}`,
    `Blocker: ${b.blocker}`,
    `Next action: ${b.next}`,
    b.stale ? `Ledger: ${b.stale}` : 'Ledger: current',
    b.preflight ? `Preflight: ${b.preflight.stops.length ? `STOP · ${b.preflight.stops.join(' · ')}` : 'clear'}` : 'Preflight: not run this session',
    '',
    'Board',
    ...b.rows.map(r => `${r.text} [${r.known ? stateWords(r.state) : `unknown state ${r.state}`}]${r.proofs ? ` · ${r.proofs === 1 ? 'one proof' : `${r.proofs} proofs`}` : ''}`),
    '',
    'Evidence',
    ...(b.evidence.length ? b.evidence.map(ev => `${ev.kind} for “${ev.about}” · ${when(ev.at)}`) : ['none']),
    ...b.notes,
  ].join('\n')


// ---------------------------------------------------------------------------
// docs/status.html: the same board as a page, written into the governed repo
// so a Stepper can open it in a browser with no session running. Brand: Step
// Change tokens (near-black and one raised surface, orange on one word and the
// primary action only, state colours for state), Bebas Neue and Instrument Sans
// from Google Fonts with Arial fallbacks, the real BOB mark. No logo or font is
// redrawn. No percentage. No state from prose.
// ---------------------------------------------------------------------------

// The real BOB files (assets/bob/web/: the character and the two lockups),
// handed in by the caller as base64, the same ones the map page carries. An
// empty slot here was a broken image on every status page from 23 to 29
// October 2026 (Ash: "you didn't render the icon").
export type PageAssets = { character: string; dark: string; light: string }
export type PageMeta = { project: string; generatedAt: string; repo: string }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const chipClass = (r: Row) =>
  !r.known ? 'bad' : r.state === 'accepted' || r.state === 'verified' ? 'ok' : r.state === 'implemented' || r.state === 'reported' ? 'info' : r.state === 'designed' ? 'warn' : r.state === 'blocked' ? 'bad' : 'dim'
const doer = (next: string) => (/^Ash needs to/i.test(next) ? 'ASH NEEDS TO' : /^Claude/i.test(next) ? 'CLAUDE' : 'NEXT')
const stripDoer = (next: string) => next.replace(/^(Ash needs to:?|Claude:?)\s*/i, '')

export function renderStatusHtml(b: Board, meta: PageMeta, assets: PageAssets | null = null): string {
  const img = (b64: string | undefined) => (b64 ? `data:image/png;base64,${b64}` : '')
  const rows = b.rows.length
    ? b.rows.map(r => `<div class="row"><div class="txt">${esc(r.text)}${r.proofs ? `<small>${r.proofs === 1 ? 'one proof on file' : `${r.proofs} proofs on file`}</small>` : ''}</div><span class="chip ${chipClass(r)}">${esc(r.known ? stateWords(r.state) : `unknown state ${r.state}`)}</span></div>`).join('\n')
    : '<p class="dim">No promises yet.</p>'
  const evidence = b.evidence.length
    ? b.evidence.map(ev => `<div class="ev"><span class="chip ok">${esc(ev.kind)}</span><div>for “${esc(ev.about)}”<br><code>${esc(when(ev.at))}</code></div></div>`).join('\n')
    : '<p class="dim">None yet. A green chip needs a file captured from a tool result.</p>'
  const preflight = b.preflight ? (b.preflight.stops.length ? `<span class="chip bad">preflight STOP</span> ${esc(b.preflight.stops.join(' · '))}` : '<span class="chip ok">preflight clear</span>') : '<span class="chip dim">preflight not run</span>'
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BOB · ${esc(meta.project)}</title>
${assets ? `<link rel="icon" type="image/png" href="${img(assets.character)}">` : ''}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Sans:wght@400;500;600;700&display=swap">
<style>
:root{--bg:#0F0F0F;--surface:#1A1A1A;--surface-2:#242424;--fg1:#FFFFFF;--fg2:rgba(255,255,255,.66);--fg3:rgba(255,255,255,.42);--hair:rgba(255,255,255,.12);--hair-strong:rgba(255,255,255,.22);--accent:#F75821;--grad:linear-gradient(90deg,#F75821,#FA381E,#FF1900);--ok:#6DCC6F;--warn:#FF9900;--info:#01DDE8;--bad:#F40219;--f-head:"Bebas Neue","Arial Narrow",Arial,sans-serif;--f-body:"Instrument Sans",Arial,Helvetica,sans-serif;color-scheme:dark}
@media (prefers-color-scheme: light){:root{--bg:#FFFFFF;--surface:#F3F3F2;--surface-2:#E9E9E7;--fg1:#0F0F0F;--fg2:rgba(15,15,15,.68);--fg3:rgba(15,15,15,.48);--hair:rgba(15,15,15,.12);--hair-strong:rgba(15,15,15,.24);--accent:#E24A14;--ok:#1E8E3E;--warn:#B86A00;--info:#007F87;--bad:#C4001A;color-scheme:light}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg1);font-family:var(--f-body);font-size:15px;line-height:1.5;padding:0 max(16px,env(safe-area-inset-left)) 64px max(16px,env(safe-area-inset-right))}
.wrap{max-width:1180px;margin:0 auto}h1,h2,h3,p{margin:0}
.eyebrow{font-family:var(--f-head);letter-spacing:.12em;font-size:15px;color:var(--fg3);text-transform:uppercase}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:20px 0;border-bottom:1px solid var(--hair)}
.brand{display:flex;align-items:center;gap:14px}.brand img.char{width:56px;height:56px;display:block;object-fit:contain}.brand img.lockup{height:44px;width:auto;display:block}.brand img.on-light{display:none}@media (prefers-color-scheme: light){.brand img.on-dark{display:none}.brand img.on-light{display:block}}.brand b{font-family:var(--f-head);font-weight:400;font-size:30px;letter-spacing:.06em;line-height:1}.brand span{color:var(--fg3);font-size:13px}
.hero{padding:40px 0 28px}.hero h1{font-family:var(--f-head);font-weight:400;font-size:clamp(44px,7vw,84px);line-height:.95}.hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.hero p{color:var(--fg2);max-width:60ch;margin-top:14px;font-size:17px}
section{padding-top:36px}.h{font-family:var(--f-head);font-weight:400;font-size:30px;letter-spacing:.06em;margin-bottom:6px}.sub{color:var(--fg2);margin-bottom:18px;max-width:70ch}
.app{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px}.panel{background:var(--surface);border:1px solid var(--hair);border-radius:18px;padding:22px;min-width:0}
.now{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px 24px;margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--hair)}.kv .k{font-family:var(--f-head);letter-spacing:.1em;font-size:14px;color:var(--fg3)}.kv .v{font-weight:600;margin-top:2px;overflow-wrap:anywhere}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:start;padding:14px 0;border-bottom:1px solid var(--hair)}.row:last-child{border-bottom:0}.txt{min-width:0}.txt small{display:block;color:var(--fg3);margin-top:2px;font-size:12.5px;overflow-wrap:anywhere}
.chip{font-family:var(--f-head);letter-spacing:.08em;font-size:15px;line-height:1;padding:6px 12px;border-radius:999px;border:1px solid currentColor;white-space:nowrap;text-transform:uppercase}.ok{color:var(--ok)}.info{color:var(--info)}.warn{color:var(--warn)}.bad{color:var(--bad)}.dim{color:var(--fg3)}
.next{display:flex;flex-direction:column;gap:14px}.who{font-family:var(--f-head);letter-spacing:.1em;font-size:16px;color:var(--accent)}.next h3{font-size:22px;line-height:1.25;font-weight:600}
.ev{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;font-size:13.5px;padding:10px 0;border-bottom:1px solid var(--hair)}.ev:last-child{border-bottom:0}.ev code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--fg3);font-size:12.5px}
.notes{color:var(--fg3);font-size:13px;margin-top:14px}footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--hair);color:var(--fg3);font-size:13px}
@media (max-width:820px){.app{grid-template-columns:minmax(0,1fr)}.next{order:-1}}
@media (max-width:480px){.row{grid-template-columns:minmax(0,1fr) auto}}
</style>
</head>
<body>
<div class="wrap">
  <header class="bar">
    <div class="brand">${assets ? `<img class="char" alt="BOB the orange sponge character" src="${img(assets.character)}"><img class="lockup on-dark" alt="BOB, Build Optimisation Buddy, by Step Change" src="${img(assets.dark)}"><img class="lockup on-light" alt="BOB, Build Optimisation Buddy, by Step Change" src="${img(assets.light)}">` : `<div><b>BOB</b><br><span>Build Optimisation Buddy · by Step Change</span></div>`}</div>
    <span class="chip dim">${esc(meta.project)}</span>
  </header>
  <div class="hero">
    <p class="eyebrow">Where this build is</p>
    <h1>No round starts <em>unapproved.</em><br>No round ends unproven.</h1>
    <p>${esc(meta.project)}: what is true now, the one next step and who does it, and the proof behind every green chip. Written by BOB from <code>${esc(b.source)}</code>.</p>
  </div>
  <section>
    <h2 class="h">Now</h2>
    <div class="app">
      <div class="panel">
        <div class="now">
          <div class="kv"><div class="k">ROUND</div><div class="v">${esc(b.increment)}</div></div>
          <div class="kv"><div class="k">APPROVAL</div><div class="v">${esc(b.approval)}</div></div>
          <div class="kv"><div class="k">CURRENT TASK</div><div class="v">${esc(b.task)}</div></div>
          <div class="kv"><div class="k">BLOCKER</div><div class="v">${esc(b.blocker)}</div></div>
          <div class="kv"><div class="k">LEDGER</div><div class="v">${esc(b.stale ?? 'current')}</div></div>
          <div class="kv"><div class="k">PREFLIGHT</div><div class="v">${preflight}</div></div>
        </div>
        <p class="eyebrow" style="margin-bottom:6px">Board</p>
        ${rows}
      </div>
      <div class="panel next">
        <p class="eyebrow">Next step</p>
        <p class="who">${esc(doer(b.next))}</p>
        <h3>${esc(stripDoer(b.next))}</h3>
        <p class="dim" style="font-size:14px">One recommended next action, with its owner. No percentage is shown. No state is set from prose.</p>
      </div>
    </div>
  </section>
  <section>
    <h2 class="h">Evidence</h2>
    <p class="sub">Every green chip points at a file captured from a tool result. Prose never counts.</p>
    <div class="panel">${evidence}</div>
    <div class="notes">${b.notes.map(n => esc(n)).join('<br>')}</div>
  </section>
  <footer>BOB · Build Optimisation Buddy, by Step Change. Written ${esc(meta.generatedAt)} into ${esc(meta.repo)}/docs/status.html. Reopen this file after any BOB command; it is regenerated, never edited by hand.</footer>
</div>
</body>
</html>
`
}
