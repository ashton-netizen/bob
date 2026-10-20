import { expect, test } from 'claude-code/testing'

// Every record below is SYNTHETIC (is_synthetic true) and deliberately differs
// from fixtures/ so a pane that hard-codes the spike's values fails here.
// Nothing sits beneath the plugin: each `on` stands for the engine.

const PANE = {
  plugin: 'bob',
  component: 'Pane',
  requestId: 'bob-board',
  props: {
    title: 'BOB',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const T = '2026-10-21T10:00:00+11:00'
const base = (source: string) => ({ created_at: T, source, is_synthetic: true })

const SCHEMA = {
  record_base: { required: ['id', 'created_at', 'source', 'is_synthetic'], source_values: ['human', 'ai', 'tool'] },
  requirement: {
    states: ['not_assessed', 'blocked', 'designed', 'implemented', 'reported', 'verified', 'accepted'],
    transitions: {
      not_assessed: ['designed', 'blocked'],
      blocked: ['designed', 'not_assessed'],
      designed: ['implemented', 'blocked'],
      implemented: ['reported', 'verified', 'blocked'],
      reported: ['verified', 'implemented', 'blocked'],
      verified: ['accepted', 'implemented'],
      accepted: ['implemented'],
    },
    transition_rules: { model_prose_may_set_at_most: 'reported' },
  },
  increment: { states: ['proposed', 'approved', 'active', 'done', 'returned'] },
  run: { states: ['queued', 'running', 'verifying', 'completed'] },
  evidence: { kinds: ['diff', 'test', 'artefact', 'screenshot'] },
}

const req = (id: string, text: string, state: string, evidence_ids: string[] = []) => ({
  id, priority: 'MUST', text, check: `check ${id}`, state, evidence_ids, source_ids: [], ...base('ai'),
})

const BRIEF = {
  requirements: [
    req('R-T-01', 'register', 'accepted', ['E-T-01']),
    req('R-T-02', 'dedupe', 'verified', ['E-T-02']),
    req('R-T-03', 'bank', 'implemented', ['E-T-03']),
    req('R-T-04', 'pulls', 'designed'),
    req('R-T-05', 'export', 'blocked'),
  ],
}

const evidence = (id: string, requirement_id: string, at: string) => ({
  id, requirement_id, kind: 'test', ref: `docs/evidence/${id}.txt`, captured_at: at, origin: 'tool', ...base('tool'),
})

const LEDGER = {
  increments: [
    { id: 'INC-T-1', title: 'register', requirement_ids: ['R-T-01', 'R-T-02'], state: 'done', approval_id: 'AP-T-1', ...base('ai') },
    { id: 'INC-T-2', title: 'bank and pulls', requirement_ids: ['R-T-03', 'R-T-04'], state: 'active', approval_id: 'AP-T-2', ...base('ai') },
  ],
  runs: [
    { id: 'RUN-T-9', increment_id: 'INC-T-2', state: 'completed', started_at: '2026-10-21T09:00:00+11:00', last_event_at: '2026-10-21T09:30:00+11:00', session_id: 's', cancel_requested: false, exit_reason: 'success', cost_usd_reported: null, ...base('tool') },
  ],
  events: [
    { id: 'EV-T-1', run_id: 'RUN-T-9', at: '2026-10-21T09:00:00+11:00', origin: 'runtime', type: 'started', detail: 'T-9 seed the bank', ...base('tool') },
    { id: 'EV-T-2', run_id: 'RUN-T-9', at: '2026-10-21T09:30:00+11:00', origin: 'runtime', type: 'finished', detail: 'exit success', ...base('tool') },
  ],
  evidence: [
    evidence('E-T-01', 'R-T-01', '2026-10-20T09:00:00+11:00'),
    evidence('E-T-02', 'R-T-02', '2026-10-20T09:10:00+11:00'),
    evidence('E-T-03', 'R-T-03', '2026-10-21T09:20:00+11:00'),
  ],
}

const LAST_EVENT_MS = Date.parse('2026-10-21T09:30:00+11:00')

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type World = {
  governed: boolean
  ownLedger?: boolean
  brief: unknown
  approvals: unknown[]
  ledger: unknown
  ledgerMtimeMs: number
  preflight?: { exitCode: number; stdout: string; stderr: string }
}

// Wires the engine's file system and process events to one synthetic world.
// Paths are matched by their tail so $.plugin.root can be anything.
function world(on: any, w: World) {
  const text = (path: string): string | undefined => {
    const dir = w.governed ? 'bob' : 'fixtures'
    if (path.endsWith('bob/schema.json')) return JSON.stringify(SCHEMA)
    if (path.endsWith(`${dir}/brief.json`)) return JSON.stringify(w.brief)
    if (path.endsWith(`${dir}/approvals.json`)) return JSON.stringify({ approvals: w.approvals })
    if (path.endsWith(`${dir}/ledger.json`)) return JSON.stringify(w.ledger)
    if (w.ownLedger && path.endsWith('bob/ledger.json')) return JSON.stringify(w.ledger)
    return undefined
  }
  on('fs.exists', (_: unknown, e: { path: string }) => {
    if (e.path.endsWith('bob/brief.json')) return { value: w.governed }
    return { value: text(e.path) !== undefined }
  })
  on('fs.read', (_: unknown, e: { path: string; as: string }) => {
    const t = text(e.path)
    if (t === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: e.as === 'bytes' ? { base64: btoa(unescape(encodeURIComponent(t))) } : t }
  })
  on('fs.stat', (_: unknown, e: { path: string }) => {
    if (text(e.path) === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: { kind: 'file', size: 1, mtimeMs: w.ledgerMtimeMs, isLink: false } }
  })
  on('process.run', () => ({
    value: {
      exitCode: w.preflight?.exitCode ?? 0,
      stdout: w.preflight?.stdout ?? 'preflight · clear\n',
      stderr: w.preflight?.stderr ?? '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('command.register', () => ({ value: { command: 'bob' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('classic.Stop', () => ({}))
}

const said = (r: unknown) => {
  const o = r as { deny?: string; text?: string; isError?: boolean }
  return o.deny ?? (o.isError ? o.text ?? '' : '')
}

const stopInput = (active = false) => ({
  hook_event_name: 'Stop' as const,
  stop_hook_active: active,
  session_id: 'test',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/',
  permission_mode: 'default',
})

async function approvedWorld(on: any, over: Partial<World> = {}): Promise<World> {
  const w: World = {
    governed: true,
    brief: BRIEF,
    approvals: [{ id: 'AP-T-2', brief_hash: await sha256(JSON.stringify(BRIEF)), scope_increment_ids: ['INC-T-2'], approver: 'Mags (fixture)', approved_at: T, ...base('human') }],
    ledger: LEDGER,
    ledgerMtimeMs: LAST_EVENT_MS + 60_000,
    ...over,
  }
  world(on, w)
  return w
}

test('the pane draws the ledger on every surface: Now, Board with a blocked chip, Evidence, and a stale flag', async ($, on) => {
  const w = await approvedWorld(on, { ledgerMtimeMs: LAST_EVENT_MS - 60_000 })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /INC-T-2/ }))?.text).toContain('INC-T-2')
    expect((await ui.find({ type: 'Text', text: /T-9 seed the bank/ }))?.text).toContain('T-9 seed the bank')
    expect((await ui.find({ type: 'Text', text: /Next action/ }))?.text).toBe('Next action: Claude: capture evidence for R-T-04')
    expect((await ui.find({ type: 'Text', text: /\[blocked\]/ }))?.text).toBe('[blocked]')
    expect((await ui.find({ type: 'Text', text: /E-T-03/ }))?.text).toContain('E-T-03')
    expect((await ui.find({ type: 'Text', text: /stale/ }))?.text).toContain('stale')
    await ui.unmount()
  }

  // A ledger newer than its last event is not stale.
  w.ledgerMtimeMs = LAST_EVENT_MS + 60_000
  const fresh = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await fresh.find({ type: 'Text', text: /stale/ })).toBe(undefined)
  await fresh.unmount()
})

test('Gate A refuses a write when no approval covers the active increment, naming the approval and one next action', async ($, on) => {
  await approvedWorld(on, { approvals: [] })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const write = said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))
  expect(write).toContain('Gate A')
  expect(write).toContain('INC-T-2')
  expect(write).toContain('approval')
  expect(write).toContain('Ash needs to')

  const edit = said(await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.ts', old_string: 'a', new_string: 'b' }))
  expect(edit).toContain('Gate A')

  const bash = said(await $.tool.call({ tool: 'Bash', command: 'echo hi > /repo/out.txt' }))
  expect(bash).toContain('Gate A')

  // A read-only command passes.
  expect(said(await $.tool.call({ tool: 'Bash', command: 'git status' }))).toBe('')
})

test('Gate A allows a write under a matching approval', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')
  expect(said(await $.tool.call({ tool: 'Bash', command: 'echo hi > /repo/out.txt' }))).toBe('')
})

test('Gate A refuses again when bob/brief.json changed by one byte after approval', async ($, on) => {
  const changed = { ...BRIEF, requirements: [...BRIEF.requirements, req('R-T-06', 'late add', 'designed')] }
  await approvedWorld(on, { brief: changed })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))
  expect(out).toContain('Gate A')
  expect(out).toContain('changed')
  expect(out).toContain('AP-T-2')
})

test('Gate A idles in a repo BOB does not govern (no bob/brief.json)', async ($, on) => {
  await approvedWorld(on, { governed: false, approvals: [] })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'x' }))).toBe('')
})

test('a repo with bob/ledger.json but no brief shows its own ledger, not synthetic, and the gates idle', async ($, on) => {
  await approvedWorld(on, { governed: false, ownLedger: true, approvals: [] })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /ledger\.json/ }))?.text).toBe('bob/ledger.json')
  expect(await ui.find({ type: 'Text', text: /SYNTHETIC/ })).toBe(undefined)
  expect((await ui.find({ type: 'Text', text: /INC-T-2/ }))?.text).toContain('INC-T-2')
  await ui.unmount()
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'x' }))).toBe('')
})

test('Gate B blocks the end of a round that wrote files but gained no evidence, naming the ids; passes once evidence lands', async ($, on) => {
  const w = await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' })

  const blocked = await $.classic.Stop(stopInput())
  expect(blocked.block ?? '').toContain('Gate B')
  expect(blocked.block ?? '').toContain('R-T-03')
  expect(blocked.block ?? '').toContain('R-T-04')
  expect(blocked.block ?? '').toContain('evidence')

  // One block per round: when the engine says a stop hook already continued, the turn may end.
  expect((await $.classic.Stop(stopInput(true))).block).toBe(undefined)

  const ledger = LEDGER as { evidence: unknown[] }
  w.ledger = { ...LEDGER, evidence: [...ledger.evidence, evidence('E-T-04', 'R-T-04', '2026-10-21T11:00:00+11:00')] }
  expect((await $.classic.Stop(stopInput())).block).toBe(undefined)
})

test('Gate B lets a round that wrote nothing end', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await $.classic.Stop(stopInput())).block).toBe(undefined)
})

test('state table: verified without evidence is rejected; accepted from a tool call is rejected; a lawful step is allowed', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const withState = (id: string, state: string) =>
    JSON.stringify({ ...BRIEF, requirements: BRIEF.requirements.map(r => (r.id === id ? { ...r, state } : r)) })

  const verified = said(await $.tool.call({ tool: 'Write', file_path: '/repo/bob/brief.json', content: withState('R-T-04', 'verified') }))
  expect(verified).toContain('R-T-04')
  expect(verified).toContain('evidence')

  const accepted = said(await $.tool.call({ tool: 'Write', file_path: '/repo/bob/brief.json', content: withState('R-T-02', 'accepted') }))
  expect(accepted).toContain('R-T-02')
  expect(accepted).toContain('human')

  const skip = said(await $.tool.call({ tool: 'Write', file_path: '/repo/bob/brief.json', content: withState('R-T-04', 'accepted') }))
  expect(skip).toContain('transition')

  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/bob/brief.json', content: withState('R-T-04', 'implemented') }))).toBe('')

  const edit = said(await $.tool.call({ tool: 'Edit', file_path: '/repo/bob/brief.json', old_string: '"state":"designed"', new_string: '"state":"verified"' }))
  expect(edit).toContain('evidence')
})

test('a preflight STOP shows on the board and in /bob status', async ($, on) => {
  await approvedWorld(on, { preflight: { exitCode: 2, stdout: 'preflight · present bob/schema.json\n', stderr: 'preflight · STOP · on main with 3 commits. Create a branch first: git switch -c build-1\n' } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /STOP/ }))?.text).toContain('on main with 3 commits')
  await ui.unmount()

  const status = await $.command.run({ command: 'bob', args: 'status' })
  expect(status.text).toContain('INC-T-2')
  expect(status.text).toContain('Next action')
  expect(status.text).toContain('STOP')
})
