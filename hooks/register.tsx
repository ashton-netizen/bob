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
  governed: boolean
  schema: Any | null
  brief: Any | null
  approvals: Any[]
  ledger: Any | null
  ledgerPath: string
  ledgerMtimeMs: number | null
  hash: string | null
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

async function load($: Engine): Promise<Model> {
  const parseErrors: string[] = []
  const schema = await readJson($, `${$.plugin.root}/bob/schema.json`, parseErrors)
  const governed = await exists($, 'bob/brief.json')
  const dir = governed ? 'bob' : 'fixtures'
  const brief = await readJson($, `${dir}/brief.json`, parseErrors)
  const approvals = ((await readJson($, `${dir}/approvals.json`, parseErrors))?.approvals ?? []) as Any[]
  const ledgerPath = `${dir}/ledger.json`
  const ledger = await readJson($, ledgerPath, parseErrors)
  let ledgerMtimeMs: number | null = null
  try {
    ledgerMtimeMs = Number((await $.fs.stat(ledgerPath)).mtimeMs)
  } catch {
    ledgerMtimeMs = null
  }
  const hash = brief ? await sha256File($, `${dir}/brief.json`) : null
  return { governed, schema, brief, approvals, ledger, ledgerPath, ledgerMtimeMs, hash, parseErrors }
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
  if (m.parseErrors.length) return { ok: false, reason: m.parseErrors.join('; '), next: 'Ash needs to restore the file from git (git checkout -- <file>)' }
  if (!m.brief || !m.ledger) return { ok: false, reason: 'bob/brief.json or bob/ledger.json is missing', next: 'Ash needs to run /bob adopt, or restore the files from git' }
  const active = activeIncrement(m)
  if (!active) return { ok: false, reason: 'no increment in bob/ledger.json has state active', next: 'Ash needs to approve an increment (a record in bob/approvals.json) and set its state to active' }
  const inScope = m.approvals.filter(a => (a.scope_increment_ids ?? []).includes(active.id))
  const match = inScope.find(a => a.brief_hash === m.hash)
  if (match) return { ok: true, note: `${active.id} approved by ${match.id}` }
  if (inScope.length) {
    const ids = inScope.map(a => a.id).join(', ')
    return {
      ok: false,
      reason: `bob/brief.json changed after approval ${ids}: its hash ${short(m.hash)} matches no approval of ${active.id}`,
      next: `Ash needs to re-approve ${active.id} against the current brief: one new record in bob/approvals.json with brief_hash ${m.hash ?? 'unknown'}`,
    }
  }
  return {
    ok: false,
    reason: `no approval record in bob/approvals.json covers ${active.id} at brief hash ${short(m.hash)}`,
    next: `Ash needs to approve ${active.id}: one new record in bob/approvals.json with brief_hash ${m.hash ?? 'unknown'} and scope_increment_ids ["${active.id}"]`,
  }
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

// Bash that writes files: redirects, the usual writers, and git or package
// commands that change the tree. Bounded on purpose; the remote checks are the
// real gate (product-plan Part 3).
const FILE_WRITING_BASH =
  /(^|[\s;&|(`])(tee|sed\s+-i|perl\s+-[a-z]*i|mv|cp|rm|rmdir|touch|mkdir|install|dd|truncate|chmod|chown|ln|patch|rsync|unzip|tar\s+-?[a-z]*x|git\s+(commit|push|merge|rebase|reset|checkout|switch|add|rm|mv|stash|apply|cherry-pick|tag|clean)|npm\s+(install|i|ci|uninstall|update)|pip3?\s+install|pnpm\s+(install|add)|yarn\s+(add|install))(\s|$)|>{1,2}/

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
  if (latestRun && ['running', 'verifying'].includes(latestRun.state)) {
    const last = Date.parse(String(latestRun.last_event_at))
    if (!Number.isNaN(last) && now - last > 120_000) stale = `stale, reconciling: run ${latestRun.id} ${latestRun.state} with no event for ${Math.round((now - last) / 1000)}s`
  }

  const notes: string[] = []
  if (!m.governed) notes.push('SYNTHETIC: not governed (no bob/brief.json); showing fixtures/. Gates idle.')
  if (m.parseErrors.length) notes.push(...m.parseErrors)
  if (!m.schema) notes.push('bob/schema.json not found in the plugin folder')
  notes.push('No percentage is shown. No state is set from prose.')

  return {
    source: m.governed ? m.ledgerPath : `${m.ledgerPath} (synthetic)`,
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
    await $.command.register({ name: 'bob', description: 'BOB: status (default) or open the board pane' })

    try {
      const ran = await $.process.run(['bash', `${$.plugin.root}/scripts/preflight.sh`])
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
    if (arg === 'open') {
      const placed = await $.ui.open({ id: PANE, title: TITLE })
      return { text: placed.isPlaced ? 'BOB board pane opened.' : 'BOB board pane requested, but this surface did not seat it.' }
    }
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
      const current = (await readText($, 'bob/brief.json')) ?? ''
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
    if (!FILE_WRITING_BASH.test(e.command ?? '')) return next(e)
    const m = await load($)
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
