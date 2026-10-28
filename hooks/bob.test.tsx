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
  evidence: { kinds: ['diff', 'test', 'artefact', 'screenshot'], origin_values: ['tool', 'human'] },
  // Mirrors bob/schema.json's source dimensions: adopt refuses a source whose
  // access or processing is not one of these.
  source: {
    access_values: ['available', 'permission_needed', 'missing', 'inaccessible'],
    processing_values: ['queued', 'reading', 'extracted', 'partial', 'failed', 'unsupported'],
  },
  // Mirrors bob/schema.json's workspace section (Build 3, /bob new).
  workspace: {
    file: 'bob-workspace.json',
    project_name_pattern: '^[a-z0-9][a-z0-9-]{0,39}$',
    reserved_names: ['bob', 'docs', 'fixtures', 'sources', 'templates'],
  },
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
  // Repo files by relative path (the proposal, the status file, and whatever
  // the module writes). A file here wins over the brief/approvals/ledger above.
  files?: Record<string, string>
  // Every $.fs.write the module made, in order, EXCEPT docs/status.html.
  writes?: { path: string; text: string }[]
  // docs/status.html writes: a view of the records, filed apart so the
  // record-counting tests above stay exact.
  pages?: { path: string; text: string }[]
  // What `git config user.name` answers.
  userName?: string
  // Every $.process.run the module made, in order.
  runs?: { argv: readonly string[]; cwd?: string }[]
  // git is not installed: every git call exits 127.
  gitMissing?: boolean
  // What the engine's person check ($.ui.view) answers: absent is a person's
  // own input; 'not person-initiated' is the engine's answer to anything else.
  personDeny?: string
  // Every $.tool.register the module made, in order.
  tools?: { name: string; isDeferred?: unknown }[]
  // Every $.prompt.submit and $.turn.abort the module made, in order.
  prompts?: string[]
  aborts?: string[]
}

// The repo root the double serves, answered to $.session.root(). Every repo
// file the module touches must be addressed under it, absolute. A bare relative
// path is resolved the way the engine did live on 21 October 2026: against the
// process's working directory, which is NOT the repo (the plugin folder, which
// holds BOB's own bob/ledger.json), so /bob adopt refused "already exists" and
// Gate A read the wrong folder. The double reproduces that: a bare path lands
// under ELSEWHERE, where only the plugin's own files exist.
// Never a path a checkout could sit at: in CI the plugin folder is
// /home/runner/work/bob/bob, and a ROOT equal to it swallowed the plugin's own
// schema read (seen red on pull request 10, run 39536059003).
const ROOT = '/adopted/repo'
const ELSEWHERE = '/elsewhere/plugins/cache/bob'
const resolve = (path: string) => (path.startsWith('/') ? path : `${ELSEWHERE}/${path.replace(/^\.\//, '')}`)
// A repo file by its path under ROOT; undefined for anything outside the repo.
const rel = (path: string): string | undefined => {
  const abs = resolve(path)
  return abs.startsWith(`${ROOT}/`) ? abs.slice(ROOT.length + 1) : undefined
}

// Wires the engine's file system and process events to one synthetic world.
// Paths are matched by their tail so $.plugin.root can be anything, EXCEPT
// bob/schema.json, which is served only under a plugin-root prefix: a bare
// repo-relative read of it is a defect (the adopted repo never gets a copy).
function world(on: any, w: World) {
  w.files = w.files ?? {}
  w.writes = w.writes ?? []
  w.pages = w.pages ?? []
  w.runs = w.runs ?? []
  const governed = () => w.governed || 'bob/brief.json' in w.files!
  const text = (path: string): string | undefined => {
    const r = rel(path)
    if (r === undefined) {
      // Outside the repo: only the plugin's own files exist. bob/schema.json is
      // served under any plugin-root prefix (a bare repo-relative read of it
      // is a defect: the adopted repo never gets a copy); the plugin folder
      // also carries BOB's own bob/ledger.json, which is NOT the repo's.
      if (path.endsWith('bob/schema.json') && path !== 'bob/schema.json') return JSON.stringify(SCHEMA)
      if (resolve(path).endsWith('/bob/ledger.json')) return JSON.stringify({ increments: [], runs: [], events: [], evidence: [], $comment: 'the plugin folder\'s own ledger, never the repo\'s' })
      if (path.endsWith('/templates/workspace/CLAUDE.md')) return '# BOB workspace (template)\n'
      return undefined
    }
    if (r in w.files!) return w.files![r]
    const dir = governed() ? 'bob' : 'fixtures'
    if (r === `${dir}/brief.json`) return JSON.stringify(w.brief)
    if (r === `${dir}/approvals.json`) return JSON.stringify({ approvals: w.approvals })
    if (r === `${dir}/ledger.json`) return JSON.stringify(w.ledger)
    if (w.ownLedger && r === 'bob/ledger.json') return JSON.stringify(w.ledger)
    return undefined
  }
  on('fs.exists', (_: unknown, e: { path: string }) => {
    const r = rel(e.path)
    if (r === 'bob/brief.json') return { value: governed() }
    // A folder exists when any file sits under it.
    if (r !== undefined && Object.keys(w.files!).some(f => f.startsWith(`${r}/`))) return { value: true }
    return { value: text(e.path) !== undefined }
  })
  on('session.root', () => ({ value: ROOT }))
  on('fs.read', (_: unknown, e: { path: string; as: string }) => {
    const t = text(e.path)
    if (t === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: e.as === 'bytes' ? { base64: btoa(unescape(encodeURIComponent(t))) } : t }
  })
  on('fs.write', (_: unknown, e: { path: string; text: string }) => {
    // A write outside the repo is recorded under its resolved path so the
    // test can name it; it never lands in the repo's files.
    const r = rel(e.path) ?? resolve(e.path)
    if (r === 'docs/status.html') {
      w.pages!.push({ path: r, text: e.text })
      return { value: undefined }
    }
    w.writes!.push({ path: r, text: e.text })
    if (rel(e.path) !== undefined) w.files![r] = e.text
    return { value: undefined }
  })
  on('fs.stat', (_: unknown, e: { path: string }) => {
    if (text(e.path) === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: { kind: 'file', size: 1, mtimeMs: w.ledgerMtimeMs, isLink: false } }
  })
  // The engine hands the options over as e.init (seen 23 October 2026 on 2.1.304).
  on('process.run', (_: unknown, e: { argv: readonly string[]; init?: { cwd?: string } }) => {
    w.runs!.push({ argv: e.argv, cwd: e.init?.cwd })
    const done = (exitCode: number, stdout = '') => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (e.argv[0] === 'git' && w.gitMissing) return done(127)
    if (e.argv[0] === 'git' && e.argv[1] === '--version') return done(0, 'git version 2.50.0\n')
    if (e.argv[0] === 'git' && e.argv[1] === 'init') {
      // git init <dir> makes the folder: record its .git so the folder exists.
      const r = rel(String(e.argv[e.argv.length - 1]))
      if (r !== undefined) w.files![`${r}/.git/HEAD`] = 'ref: refs/heads/main\n'
      return done(0)
    }
    if (e.argv[0] === 'git' && e.argv.includes('user.name')) {
      return { value: { exitCode: 0, stdout: `${w.userName ?? 'Test Approver'}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    }
    return {
      value: {
        exitCode: w.preflight?.exitCode ?? 0,
        stdout: w.preflight?.stdout ?? 'preflight · clear\n',
        stderr: w.preflight?.stderr ?? '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  on('command.register', () => ({ value: { command: 'bob' } }))
  w.tools = w.tools ?? []
  on('tool.register', (_: unknown, e: { name: string; isDeferred?: unknown }) => {
    w.tools!.push({ name: e.name, isDeferred: e.isDeferred })
    return { value: { tool: `mcp__bob__${e.name}` } }
  })
  // The kit has no person check of its own: this answer is the test's, so a
  // press test proves the wiring only. The live session is the proof (R-bob-09).
  on('ui.view', () => ({ value: w.personDeny ? { deny: w.personDeny } : {} }))
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  w.prompts = w.prompts ?? []
  w.aborts = w.aborts ?? []
  on('prompt.submit', (_: unknown, e: { text: string }) => {
    w.prompts!.push(e.text)
    return { text: e.text }
  })
  on('turn.abort', (_: unknown, e: { turnId: string }) => {
    w.aborts!.push(e.turnId)
    return { value: {} }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('classic.Stop', () => ({}))
}

// A pane Button's address for an increment's Approve. A helper, not a literal:
// gitleaks reads `key: '<high-entropy string>'` as a generic API key (pull request 31).
const approveKey = (id: string) => `approve-${id}`
const paneKey = (kind: string, id: string) => `${kind}-${id}`


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
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/new.ts`, content: 'x' })

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

test('Gate B ignores files outside the repo: a scratch write neither blocks the round nor is blocked by an unproven one', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: '/elsewhere/scratch.md', content: 'x' })
  expect((await $.classic.Stop(stopInput())).block).toBe(undefined)

  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/new.ts`, content: 'x' })
  expect((await $.classic.Stop(stopInput())).block ?? '').toContain('Gate B')
  await $.prompt.submit({ text: 'next round', asUser: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/elsewhere/scratch.md', content: 'y' }))).toBe('')
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

// ---------------------------------------------------------------------------
// Build 2: /bob adopt and /bob approve. The proposal below is test data for an
// adopted repo, so its records carry is_synthetic FALSE on purpose: adopt must
// refuse synthetic records, and these tests prove the real shape passes.
// ---------------------------------------------------------------------------

const real = (source: string) => ({ created_at: T, source, is_synthetic: false })
const PROPOSAL_PATH = 'docs/evidence/adopt/adopt-proposal.json'

const areq = (id: string, text: string, state: string, evidence_ids: string[] = []) => ({
  id, priority: 'MUST', text, check: `check ${id}`, state, evidence_ids, source_ids: ['S-P-01'], ...real('ai'),
})
const aev = (id: string, requirement_id: string) => ({
  id, requirement_id, kind: 'test', ref: `docs/evidence/adopt/${id}.txt`, captured_at: T, origin: 'tool', ...real('tool'),
})

function proposal() {
  return {
    brief: {
      project: { id: 'P-01', name: 'adopted repo', ...real('ai') },
      requirements: [
        areq('R-P-00', 'repo is governed', 'not_assessed'),
        areq('R-P-01', 'has evidence', 'verified', ['E-P-01']),
        areq('R-P-02', 'only prose', 'reported'),
      ],
    },
    ledger: {
      increments: [
        { id: 'INC-00', title: 'adopt', requirement_ids: ['R-P-00'], state: 'proposed', approval_id: null, ...real('ai') },
        { id: 'INC-01', title: 'first real increment', requirement_ids: ['R-P-02'], state: 'proposed', approval_id: null, ...real('ai') },
      ],
      runs: [],
      events: [],
      evidence: [aev('E-P-01', 'R-P-01')],
    },
    sources: [
      { id: 'S-P-01', name: 'the plan', type: 'markdown', version: '1', fingerprint: 'f', scope: 'project', access: 'available', processing: 'extracted', knowledge_use: 'mapped', ...real('ai') },
    ],
  }
}

// An ungoverned repo holding only the proposal file.
async function adoptWorld(on: any, p: unknown = proposal(), extraFiles: Record<string, string> = {}): Promise<World> {
  const w: World = {
    governed: false,
    brief: BRIEF,
    approvals: [],
    ledger: LEDGER,
    ledgerMtimeMs: LAST_EVENT_MS + 60_000,
    files: { [PROPOSAL_PATH]: JSON.stringify(p), ...extraFiles },
  }
  world(on, w)
  return w
}

const adopt = async ($: any) => String((await $.command.run({ command: 'bob', args: 'adopt' })).text ?? '')
const approve = async ($: any, id: string) => String((await $.command.run({ command: 'bob', args: `approve ${id}` })).text ?? '')
const bobWrites = (w: World) => w.writes!.filter(x => x.path.startsWith('bob/')).map(x => x.path)

test('adopt refuses a requirement verified with no evidence record, naming the id, and writes nothing', async ($, on) => {
  const p = proposal()
  p.ledger.evidence = []
  const w = await adoptWorld(on, p)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await adopt($)
  expect(out).toContain('refused')
  expect(out).toContain('R-P-01')
  expect(out).toContain('evidence')
  expect(w.writes!.length).toBe(0)
})

test('adopt refuses any record missing id, created_at, source or is_synthetic, naming where', async ($, on) => {
  const p = proposal() as any
  delete p.sources[0].created_at
  const w = await adoptWorld(on, p)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await adopt($)
  expect(out).toContain('refused')
  expect(out).toContain('created_at')
  expect(out).toContain('S-P-01')
  expect(w.writes!.length).toBe(0)
})

test('adopt refuses is_synthetic true: fixtures/ is the only home for synthetic records', async ($, on) => {
  const p = proposal() as any
  p.ledger.evidence[0].is_synthetic = true
  const w = await adoptWorld(on, p)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await adopt($)
  expect(out).toContain('refused')
  expect(out).toContain('is_synthetic')
  expect(out).toContain('E-P-01')
  expect(w.writes!.length).toBe(0)
})

test('adopt refuses a source without access and processing from bob/schema.json', async ($, on) => {
  const p = proposal() as any
  delete p.sources[0].processing
  const w = await adoptWorld(on, p)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await adopt($)
  expect(out).toContain('refused')
  expect(out).toContain('processing')
  expect(out).toContain('S-P-01')
  expect(w.writes!.length).toBe(0)
})

test('adopt refuses when a bob/ file already exists', async ($, on) => {
  const w = await adoptWorld(on, proposal(), { 'bob/ledger.json': JSON.stringify(LEDGER) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await adopt($)
  expect(out).toContain('refused')
  expect(out).toContain('bob/ledger.json')
  expect(w.writes!.length).toBe(0)
})

test('adopt writes ledger, sources, empty approvals, then brief.json LAST, then one status line; Gate A engages only after', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // Ungoverned before adopt: a write passes.
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'x' }))).toBe('')

  const out = await adopt($)
  expect(out).toContain('wrote')
  expect(bobWrites(w)).toEqual(['bob/ledger.json', 'bob/sources.json', 'bob/approvals.json', 'bob/brief.json'])
  expect(JSON.parse(w.files!['bob/approvals.json'])).toEqual({ approvals: [] })
  expect(JSON.parse(w.files!['bob/brief.json']).requirements.map((r: any) => r.state)).toEqual(['not_assessed', 'verified', 'reported'])
  expect(JSON.parse(w.files!['bob/ledger.json']).increments.map((i: any) => i.state)).toEqual(['proposed', 'proposed'])

  // The status line is the last write and the file was created.
  const last = w.writes![w.writes!.length - 1]
  expect(last.path).toBe('docs/project-status.md')
  expect(last.text).toContain('adopt')
  expect(last.text).toContain('INC-00')

  // Governed now: no increment is active, so Gate A refuses and points at the pane's Approve button (R-bob-14).
  const denied = said(await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'x' }))
  expect(denied).toContain('Gate A')
  expect(denied).toContain('Approve INC-00')
  expect(denied).not.toContain('/bob')
})

test('adopt appends to an existing docs/project-status.md rather than replacing it', async ($, on) => {
  const w = await adoptWorld(on, proposal(), { 'docs/project-status.md': '# existing status\n\n- older line\n' })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  const status = w.files!['docs/project-status.md']
  expect(status).toContain('# existing status')
  expect(status).toContain('older line')
  expect(status).toContain('INC-00')
})

test('approve appends one immutable human record with the brief hash and the git approver, sets the increment active, and Gate A then allows a write', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  const writesBefore = w.writes!.length

  const out = await approve($, 'INC-00')
  expect(out).toContain('INC-00')
  expect(out).toContain('active')

  const approvals = JSON.parse(w.files!['bob/approvals.json']).approvals
  expect(approvals.length).toBe(1)
  const a = approvals[0]
  expect(String(a.id).startsWith('AP-')).toBe(true)
  expect(a.brief_hash).toBe(await sha256(w.files!['bob/brief.json']))
  expect(a.scope_increment_ids).toEqual(['INC-00'])
  expect(a.approver).toBe('Test Approver')
  expect(a.source).toBe('human')
  expect(a.is_synthetic).toBe(false)
  expect(typeof a.approved_at).toBe('string')
  expect(typeof a.created_at).toBe('string')

  const inc = JSON.parse(w.files!['bob/ledger.json']).increments.find((i: any) => i.id === 'INC-00')
  expect(inc.state).toBe('active')
  expect(inc.approval_id).toBe(a.id)

  // approve wrote only approvals and ledger, and ran no git write.
  expect(w.writes!.slice(writesBefore).map(x => x.path)).toEqual(['bob/approvals.json', 'bob/ledger.json'])

  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')
})

test('approve refuses a duplicate for the same increment at the same hash, refuses while another increment is active, and refuses an unknown id', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  await approve($, 'INC-00')
  const n = w.writes!.length

  const dup = await approve($, 'INC-00')
  expect(dup).toContain('refused')
  expect(dup).toContain('INC-00')
  expect(JSON.parse(w.files!['bob/approvals.json']).approvals.length).toBe(1)

  const second = await approve($, 'INC-01')
  expect(second).toContain('refused')
  expect(second).toContain('INC-00')
  expect(second).toContain('active')

  const unknown = await approve($, 'INC-99')
  expect(unknown).toContain('refused')
  expect(unknown).toContain('INC-99')

  expect(w.writes!.length).toBe(n)
})

test('approve refuses when the brief changed after adopt only by re-hashing: a second approval at a new hash is a new record, never an edit', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  await approve($, 'INC-00')
  const first = JSON.parse(w.files!['bob/approvals.json']).approvals[0]

  // The brief changes (a late requirement); Gate A refuses; a re-approval appends.
  const brief = JSON.parse(w.files!['bob/brief.json'])
  brief.requirements.push(areq('R-P-03', 'late add', 'not_assessed'))
  w.files!['bob/brief.json'] = JSON.stringify(brief)
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toContain('changed')

  const out = await approve($, 'INC-00')
  expect(out).toContain('INC-00')
  const approvals = JSON.parse(w.files!['bob/approvals.json']).approvals
  expect(approvals.length).toBe(2)
  expect(approvals[0]).toEqual(first)
  expect(approvals[1].brief_hash).toBe(await sha256(w.files!['bob/brief.json']))
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')
})

test('every repo file is addressed under $.session.root(): adopt writes the five files when the plugin folder, not the repo, holds a bob/ledger.json (the live refusal of 21 October 2026)', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  const out = await adopt($)
  expect(out).toContain('wrote 5 files, refused 0')
  // Every write landed in the repo (a bare path would have landed under ELSEWHERE).
  expect(w.writes!.map(x => x.path)).toEqual(['bob/ledger.json', 'bob/sources.json', 'bob/approvals.json', 'bob/brief.json', 'docs/project-status.md'])
  for (const x of w.writes!) expect(x.path.startsWith('/')).toBe(false)
})

// ---------------------------------------------------------------------------
// Build 3 Part A: the Gate A landmines of docs/handoff.md.
// ---------------------------------------------------------------------------

// A governed repo with no active increment: Gate A refuses every file-writing
// command and passes every read-only one.
async function lockedWorld(on: any) {
  const w = await approvedWorld(on, { approvals: [] })
  ;(w.ledger as any) = { ...LEDGER, increments: LEDGER.increments.map(i => ({ ...i, state: i.state === 'active' ? 'proposed' : i.state })) }
  return w
}

test('Gate A passes read-only Bash that merely mentions a redirect or a git verb (fd redirects, /dev/null, quoted text) and still refuses a real write', async ($, on) => {
  await lockedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const bash = async (command: string) => said(await $.tool.call({ tool: 'Bash', command }))

  for (const readOnly of [
    'grep -n foo docs/handoff.md 2>&1',
    'ls docs 2>/dev/null',
    'cat docs/handoff.md > /dev/null',
    'grep -n "a > b" docs/handoff.md',
    `grep -rn 'git add' docs`,
    'echo "git commit and rm are words here"',
    'git log --oneline | head -5',
  ]) expect(await bash(readOnly)).toBe('')

  for (const write of [
    'echo hi > out.txt',
    'echo hi >> out.txt',
    'git add -A',
    'cd /repo && git commit -m x',
    'ls 2>/dev/null; git push',
    'cat a | tee out.txt',
    'sed -i s/a/b/ f',
    'mv a b',
  ]) expect(await bash(write)).toContain('Gate A')
})

test('a Bash write that names bob/brief.json is refused even under a matching approval, because the state guard only sees Edit and Write', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const bash = async (command: string) => said(await $.tool.call({ tool: 'Bash', command }))

  for (const bypass of [
    `python3 -c "import json;p='bob/brief.json';d=json.load(open(p));open(p,'w').write(json.dumps(d))"`,
    `sed -i 's/designed/verified/' bob/brief.json`,
    `echo '{}' > bob/brief.json`,
    `node -e "require('fs').writeFileSync('bob/brief.json','{}')"`,
  ]) {
    const why = await bash(bypass)
    expect(why).toContain('state guard')
    expect(why).toContain('Edit or Write')
  }
  // Reading it is fine.
  expect(await bash('cat bob/brief.json')).toBe('')
  expect(await bash('grep -c requirements bob/brief.json')).toBe('')
  expect(await bash('git diff -- bob/brief.json')).toBe('')
})

test('an approval survives a lawful state move on the brief: approve records a scope hash that ignores requirement state and evidence ids; any other change still needs a re-approval', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  await approve($, 'INC-00')
  const a = JSON.parse(w.files!['bob/approvals.json']).approvals[0]
  expect(typeof a.scope_hash).toBe('string')
  expect(a.scope_hash).not.toBe(a.brief_hash)

  const write = async () => said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))
  expect(await write()).toBe('')

  // A requirement walks one step and gains an evidence id: the file's bytes change.
  const brief = JSON.parse(w.files!['bob/brief.json'])
  const r = brief.requirements.find((x: any) => x.id === 'R-P-02')
  r.state = 'implemented'
  r.evidence_ids = ['E-P-09']
  w.files!['bob/brief.json'] = JSON.stringify(brief, null, 2) + '\n'
  expect(w.files!['bob/brief.json']).not.toBe(JSON.stringify(brief))
  expect(await write()).toBe('')

  // Key order and whitespace do not matter to the scope hash.
  const shuffled = { ...brief, requirements: brief.requirements.map((x: any) => Object.fromEntries(Object.entries(x).reverse())) }
  w.files!['bob/brief.json'] = JSON.stringify(shuffled)
  expect(await write()).toBe('')

  // A change to what a requirement SAYS needs a new approval.
  r.text = 'a different promise'
  w.files!['bob/brief.json'] = JSON.stringify(brief, null, 2) + '\n'
  expect(await write()).toContain('changed')

  // So does a new requirement.
  r.text = 'only prose'
  brief.requirements.push(areq('R-P-03', 'late add', 'not_assessed'))
  w.files!['bob/brief.json'] = JSON.stringify(brief, null, 2) + '\n'
  expect(await write()).toContain('changed')
})

test('an approval written before 0.3.0 (brief_hash only) still works byte for byte and is never rewritten', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')
})

test('a brief that no longer parses names the open file pane as a likely cause', async ($, on) => {
  await approvedWorld(on, { files: { 'bob/brief.json': '{ /bob approve INC-01 "requirements": [] }' } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const why = said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))
  expect(why).toContain('does not parse')
  expect(why).toContain('file pane')
})

// ---------------------------------------------------------------------------
// Build 3 Part A: R12 reconcile after an interrupted run (not only a stale flag).
// ---------------------------------------------------------------------------

const reconcile = async ($: any) => String((await $.command.run({ command: 'bob', args: 'reconcile' })).text ?? '')
const runOf = (state: string, lastEventAt: string) => ({ ...LEDGER.runs[0], id: 'RUN-T-7', state, last_event_at: lastEventAt, exit_reason: null })
const withRuns = (runs: unknown[], events: unknown[] = []) => ({ ...LEDGER, runs, events: [...LEDGER.events, ...events] })

test('reconcile closes a run left running with no event past the stale window: failed (interrupted) with one reconciled event, increments untouched, only the ledger written', async ($, on) => {
  const w = await approvedWorld(on, { ledger: withRuns([runOf('running', '2026-10-21T09:00:00+11:00')]) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await reconcile($)
  expect(out).toContain('RUN-T-7')
  expect(out).toContain('failed')

  expect(w.writes!.map(x => x.path)).toEqual(['bob/ledger.json'])
  const l = JSON.parse(w.files!['bob/ledger.json'])
  const run = l.runs.find((r: any) => r.id === 'RUN-T-7')
  expect(run.state).toBe('failed')
  expect(run.exit_reason).toBe('interrupted')
  const ev = l.events.filter((e: any) => e.run_id === 'RUN-T-7' && e.type === 'reconciled')
  expect(ev.length).toBe(1)
  expect(ev[0].origin).toBe('bob')
  expect(ev[0].is_synthetic).toBe(false)
  expect(l.increments).toEqual(LEDGER.increments)

  // A second reconcile finds nothing to do and writes nothing.
  const n = w.writes!.length
  expect(await reconcile($)).toContain('nothing to reconcile')
  expect(w.writes!.length).toBe(n)
})

test('reconcile completes a stale run that already has a finished event, and leaves a fresh run and a completed run alone', async ($, on) => {
  const fresh = { ...runOf('running', new Date().toISOString()), id: 'RUN-T-8' }
  const finished = { id: 'EV-T-F', run_id: 'RUN-T-7', at: '2026-10-21T09:05:00+11:00', origin: 'runtime', type: 'finished', detail: 'exit success', ...base('tool') }
  const w = await approvedWorld(on, { ledger: withRuns([LEDGER.runs[0], runOf('verifying', '2026-10-21T09:00:00+11:00'), fresh], [finished]) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Before it runs, the board names the command.
  expect(String(((await $.command.run({ command: 'bob', args: '' })) as any).text ?? '')).toContain('Close stale run')
  await reconcile($)
  const l = JSON.parse(w.files!['bob/ledger.json'])
  expect(l.runs.find((r: any) => r.id === 'RUN-T-7').state).toBe('completed')
  expect(l.runs.find((r: any) => r.id === 'RUN-T-8').state).toBe('running')
  expect(l.runs.find((r: any) => r.id === 'RUN-T-9').state).toBe('completed')
})

test('reconcile refuses on fixtures: synthetic records are never reconciled', async ($, on) => {
  const w = await approvedWorld(on, { governed: false, ledger: withRuns([runOf('running', '2026-10-21T09:00:00+11:00')]) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await reconcile($)).toContain('refused')
  expect(w.writes!.length).toBe(0)
})

// ---------------------------------------------------------------------------
// Build 3 item 3: the BOB workspace and /bob new (Cowork ADR-03). The session
// is opened on ONE workspace folder per machine (ROOT here); every project is
// a subfolder that /bob new creates and registers in bob-workspace.json. The
// gates, the preflight, adopt and the pane all work on the CURRENT project.
// ---------------------------------------------------------------------------

const bob = async ($: any, args: string) => String((await $.command.run({ command: 'bob', args })).text ?? '')

// A workspace folder holding only the given files (no ledger, no fixtures).
async function workspaceWorld(on: any, files: Record<string, string> = {}, over: Partial<World> = {}): Promise<World> {
  const w: World = { governed: false, brief: undefined, approvals: [], ledger: undefined, ledgerMtimeMs: LAST_EVENT_MS, files, ...over }
  world(on, w)
  return w
}

const wsFile = (names: string[], current: string) => JSON.stringify({
  id: 'WS-01', current,
  projects: names.map((name, i) => ({ id: `P-0${i + 1}`, name, path: name, ...real('human') })),
  ...real('tool'),
})
const wsOf = (w: World) => JSON.parse(w.files!['bob-workspace.json'])
const inits = (w: World) => w.runs!.filter(r => r.argv[0] === 'git' && r.argv[1] === 'init')

test('/bob new in an empty workspace: git init on main in a new subfolder, a status file, the workspace CLAUDE.md from the template, then bob-workspace.json LAST; the pane shows the project and the design step', async ($, on) => {
  const w = await workspaceWorld(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  const out = await bob($, 'new demo')
  expect(out).toContain('demo')
  expect(inits(w).map(r => [...r.argv])).toEqual([['git', 'init', '-b', 'main', `${ROOT}/demo`]])
  expect(w.writes!.map(x => x.path)).toEqual(['demo/docs/project-status.md', 'CLAUDE.md', 'bob-workspace.json'])
  expect(w.files!['demo/docs/project-status.md']).toContain('/bob new')
  expect(w.files!['CLAUDE.md']).toContain('BOB workspace')

  const ws = wsOf(w)
  for (const f of ['id', 'created_at', 'source', 'is_synthetic']) expect(f in ws).toBe(true)
  expect(ws.is_synthetic).toBe(false)
  expect(ws.current).toBe('demo')
  expect(ws.projects.length).toBe(1)
  const p = ws.projects[0]
  expect([p.id, p.name, p.path, p.source, p.is_synthetic]).toEqual(['P-01', 'demo', 'demo', 'human', false])
  expect(typeof p.created_at).toBe('string')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Project:/ }))?.text).toContain('demo')
  expect((await ui.find({ type: 'Text', text: /Next action/ }))?.text).toContain('design-with-bob')
  expect(await ui.find({ type: 'Text', text: /SYNTHETIC/ })).toBe(undefined)
  await ui.unmount()

  // A second project: registered beside the first, current moves, CLAUDE.md is never rewritten.
  await bob($, 'new second-one')
  expect(w.writes!.filter(x => x.path === 'CLAUDE.md').length).toBe(1)
  expect(wsOf(w).projects.map((x: any) => [x.id, x.name])).toEqual([['P-01', 'demo'], ['P-02', 'second-one']])
  expect(wsOf(w).current).toBe('second-one')
})

test('/bob new never overwrites a CLAUDE.md the workspace already has', async ($, on) => {
  const w = await workspaceWorld(on, { 'CLAUDE.md': '# mine\n' })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  await bob($, 'new demo')
  expect(w.files!['CLAUDE.md']).toBe('# mine\n')
  expect(w.writes!.map(x => x.path)).toEqual(['demo/docs/project-status.md', 'bob-workspace.json'])
})

test('/bob new refuses a bad name, a reserved name and a folder that exists, and writes nothing', async ($, on) => {
  const w = await workspaceWorld(on, { 'taken/docs/project-status.md': 'x' })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  for (const bad of ['', 'Demo', 'my project', '../escape', '-x', 'bob', 'a'.repeat(41)]) {
    expect(await bob($, `new ${bad}`)).toContain('refused')
  }
  const taken = await bob($, 'new taken')
  expect(taken).toContain('refused')
  expect(taken).toContain('Projects')
  expect(taken).not.toContain('/bob')
  expect(w.writes!.length).toBe(0)
  expect(inits(w).length).toBe(0)
})

test('/bob new refuses inside a git repo (a project, not the workspace) and when git is missing, writing nothing', async ($, on) => {
  const inRepo = await workspaceWorld(on, { '.git/HEAD': 'ref: refs/heads/main\n' })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const out = await bob($, 'new demo')
  expect(out).toContain('refused')
  expect(out).toContain('git repo')
  expect(inRepo.writes!.length).toBe(0)
  expect(inits(inRepo).length).toBe(0)
})

test('/bob new names the stack gap when git is not installed, and writes nothing', async ($, on) => {
  const w = await workspaceWorld(on, {}, { gitMissing: true })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const out = await bob($, 'new demo')
  expect(out).toContain('refused')
  expect(out).toContain('git')
  expect(w.writes!.length).toBe(0)
})

test('in a workspace, Gate A, the preflight and the pane work on the CURRENT project, and /bob switch moves them', async ($, on) => {
  const locked = { increments: LEDGER.increments.map(i => ({ ...i, state: i.state === 'active' ? 'proposed' : i.state, is_synthetic: false })), runs: [], events: [], evidence: [] }
  const w = await workspaceWorld(on, {
    'bob-workspace.json': wsFile(['demo', 'other'], 'demo'),
    'demo/bob/brief.json': JSON.stringify(BRIEF),
    'demo/bob/ledger.json': JSON.stringify(locked),
    'demo/bob/approvals.json': JSON.stringify({ approvals: [] }),
    'demo/docs/project-status.md': '# demo\n',
    'other/docs/project-status.md': '# other\n',
  })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  // demo is governed with no active increment: Gate A refuses.
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/demo/notes.md`, content: 'x' }))).toContain('Gate A')
  expect(w.runs!.filter(r => r.argv[0] === 'bash').slice(-1)[0]?.cwd).toBe(`${ROOT}/demo`)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Project:/ }))?.text).toContain('demo')
  await ui.unmount()

  // other is not governed: the gates idle there, and the preflight reruns in it.
  const out = await bob($, 'switch other')
  expect(out).toContain('other')
  expect(wsOf(w).current).toBe('other')
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/other/notes.md`, content: 'x' }))).toBe('')
  expect(w.runs!.filter(r => r.argv[0] === 'bash').slice(-1)[0]?.cwd).toBe(`${ROOT}/other`)

  await bob($, 'switch demo')
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/demo/notes.md`, content: 'x' }))).toContain('Gate A')
})

test('/bob switch registers a subfolder the design room made, refuses one that does not exist, and writes only bob-workspace.json', async ($, on) => {
  const w = await workspaceWorld(on, { 'idea/bob/brief.md': '# idea\n' })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  const missing = await bob($, 'switch nothere')
  expect(missing).toContain('refused')
  expect(missing).toContain('Start a project')
  expect(missing).not.toContain('/bob')
  expect(w.writes!.length).toBe(0)

  await bob($, 'switch idea')
  expect(w.writes!.map(x => x.path)).toEqual(['bob-workspace.json'])
  expect(wsOf(w).current).toBe('idea')
  expect(wsOf(w).projects.map((x: any) => x.name)).toEqual(['idea'])
  expect(inits(w).length).toBe(0)
})

test('a workspace with no project yet: the pane names the Start a project box as the next action (R-bob-14)', async ($, on) => {
  await workspaceWorld(on, { 'bob-workspace.json': JSON.stringify({ id: 'WS-01', current: null, projects: [], ...real('tool') }) })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Next action/ }))?.text).toContain('Start a project')
  expect(await ui.find({ type: 'Text', text: /SYNTHETIC/ })).toBe(undefined)
  await ui.unmount()
})

test('a bob-workspace.json that does not parse fails closed: Gate A refuses and /bob new writes nothing', async ($, on) => {
  const w = await workspaceWorld(on, { 'bob-workspace.json': '{ not json' })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/x.md`, content: 'x' }))).toContain('bob-workspace.json')
  expect(await bob($, 'new demo')).toContain('refused')
  expect(w.writes!.length).toBe(0)
})

// ---------------------------------------------------------------------------
// Build 3: docs/status.html, the board as a branded page in the governed repo.
// ---------------------------------------------------------------------------

const statusPage = (w: World) => w.pages!

test('docs/status.html is written from the ledger at session start and after every /bob command: the increment, every requirement with its state, the next action with its doer, the evidence, no percentage', async ($, on) => {
  const w = await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(statusPage(w).length).toBe(1)
  const html = statusPage(w)[0].text
  expect(html).toContain('<!doctype html>')
  expect(html).toContain('<title>BOB ·')
  for (const id of ['INC-T-2', 'R-T-01', 'R-T-02', 'R-T-03', 'R-T-04', 'R-T-05', 'E-T-03']) expect(html).toContain(id)
  expect(html).toContain('blocked')
  expect(html).toContain('CLAUDE')
  expect(html).toContain('capture evidence for R-T-04')
  expect(html).toContain('No percentage')
  expect(html).not.toContain('undefined')
  expect(html).not.toContain('%')
  expect(html).toContain('data:image/png;base64,')

  await $.command.run({ command: 'bob', args: '' })
  expect(statusPage(w).length).toBe(2)
})

test('docs/status.html is never written from fixtures: an ungoverned repo with no ledger of its own gets no page', async ($, on) => {
  const w = await approvedWorld(on, { governed: false })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'bob', args: '' })
  expect(statusPage(w).length).toBe(0)
})

test('docs/status.html escapes requirement text, so a requirement cannot inject markup into the page', async ($, on) => {
  const brief = { requirements: [req('R-T-01', '<script>alert(1)</script> & "quotes"', 'designed')] }
  const w = await approvedWorld(on, { brief })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const html = statusPage(w)[0]?.text ?? ''
  expect(html).not.toContain('<script>alert')
  expect(html).toContain('&lt;script&gt;')
})

// ---------------------------------------------------------------------------
// Build 4, INC-02: nobody types a command. R-bob-08 a project starts from plain
// words (Claude calls start_project), R-bob-09 an approval only on a person's
// own input (a pane press passes the engine's person check), R-bob-10 Gate B
// holds even when another plugin's Stop hook sends the event past BOB.
// ---------------------------------------------------------------------------

test('R-bob-08: session start registers start_project for the model, not deferred', async ($, on) => {
  const w = await workspaceWorld(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const t = w.tools!.find(x => x.name === 'start_project')
  expect(t?.name).toBe('start_project')
  expect(t?.isDeferred).toBe(false)
})

test('R-bob-08: Claude starts a project from plain words with a name it chose; a bad name is refused and nothing is written', async ($, on) => {
  const w = await workspaceWorld(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  const ok = await $.tool.call({ tool: 'mcp__bob__start_project', name: 'proposal-price-check', idea: 'check proposals against the rate card' } as any)
  expect(said(ok)).toBe('')
  expect(inits(w).map(r => [...r.argv])).toEqual([['git', 'init', '-b', 'main', `${ROOT}/proposal-price-check`]])
  const ws = wsOf(w)
  expect(ws.current).toBe('proposal-price-check')
  expect(ws.projects[0].source).toBe('tool')
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Project:/ }))?.text).toContain('proposal-price-check')
  await ui.unmount()

  const n = w.writes!.length
  const bad = said(await $.tool.call({ tool: 'mcp__bob__start_project', name: 'Proposal Price!', idea: 'x' } as any))
  expect(bad).toContain('not a project name')
  expect(w.writes!.length).toBe(n)
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`R-bob-09: a press on Approve in the pane writes the approval when the engine says a person pressed it (${surface})`, async ($, on) => {
    const w = await adoptWorld(on)
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    await adopt($)
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: approveKey('INC-00') })
    const approvals = JSON.parse(w.files!['bob/approvals.json']).approvals
    expect(approvals.length).toBe(1)
    expect(approvals[0].source).toBe('human')
    expect(approvals[0].scope_increment_ids).toEqual(['INC-00'])
    expect(JSON.parse(w.files!['bob/ledger.json']).increments.find((i: any) => i.id === 'INC-00').state).toBe('active')
    await ui.unmount()
  })

  // Rewritten 26 October 2026: the first build judged a press by $.ui.view, and
  // the desktop app answered "no main view here" to Ash's real click. A press is
  // now judged by the surface that raised it; the pane says who approved.
  test(`R-bob-09: a press says in the pane who approved, and the view check no longer decides (${surface})`, async ($, on) => {
    const w = await adoptWorld(on)
    w.personDeny = 'not person-initiated'
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    await adopt($)
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: approveKey('INC-00') })
    expect(JSON.parse(w.files!['bob/approvals.json']).approvals.length).toBe(1)
    expect((await ui.find({ type: 'Text', text: /written to bob\/approvals\.json by/ }))?.text).toContain('Test Approver')
    await ui.unmount()
  })
}

test('R-bob-09: no Approve button while an increment is active', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ key: approveKey('INC-T-2') })).toBe(undefined)
  await ui.unmount()
})

test('R-bob-10: a round left unproven (its Stop never reached BOB) holds the next round to evidence writes until evidence lands', async ($, on) => {
  const w = await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'round 1', turnId: 't1' })
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/new.ts`, content: 'x' }))).toBe('')
  // No classic.Stop here: another plugin answered it before BOB (seen live 25 and 26 October 2026).
  await $.turn.start({ text: 'round 2', turnId: 't2' })

  const held = said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/other.ts`, content: 'y' }))
  expect(held).toContain('Gate B')
  expect(held).toContain('R-T-03')
  const bash = said(await $.tool.call({ tool: 'Bash', command: 'echo hi > /repo/out.txt' }))
  expect(bash).toContain('Gate B')

  // The evidence itself may be written.
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/docs/evidence/b4/E-T-04.txt`, content: 'ran' }))).toBe('')
  expect(said(await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/bob/ledger.json`, old_string: 'a', new_string: 'b' }))).toBe('')

  const ledger = LEDGER as { evidence: unknown[] }
  w.ledger = { ...LEDGER, evidence: [...ledger.evidence, evidence('E-T-04', 'R-T-04', '2026-10-21T11:00:00+11:00')] }
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/other.ts`, content: 'y' }))).toBe('')
})

test('R-bob-10: the one Stop block per round still carries over: a round let end unproven holds the next round', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'round 1', turnId: 't1' })
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/new.ts`, content: 'x' })
  expect((await $.classic.Stop(stopInput())).block ?? '').toContain('Gate B')
  expect((await $.classic.Stop(stopInput(true))).block).toBe(undefined)
  await $.turn.start({ text: 'round 2', turnId: 't2' })
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/other.ts`, content: 'y' }))).toContain('Gate B')
})

test('R-bob-10: a round that wrote nothing leaves the next round free', async ($, on) => {
  await approvedWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'round 1', turnId: 't1' })
  await $.turn.start({ text: 'round 2', turnId: 't2' })
  expect(said(await $.tool.call({ tool: 'Write', file_path: `${ROOT}/src/new.ts`, content: 'x' }))).toBe('')
})

// ---------------------------------------------------------------------------
// Build 4, INC-03: the workspace pane. R-bob-11 Project home, R-bob-12 approve
// or send back by button with Pause and See evidence, R-bob-15 one approval
// when the active increment is fully verified. Live finding of 26 October
// 2026: on the desktop app the engine answered $.ui.view with "no main view
// here" to Ash's real click, so a press is judged by the surface it came from.
// ---------------------------------------------------------------------------

for (const surface of ['terminal', 'desktop'] as const) {
  test(`R-bob-12: one Approve button per waiting increment; a press approves that one, even where the view check answers "no main view here" (${surface})`, async ($, on) => {
    const w = await adoptWorld(on)
    w.personDeny = 'no main view here'
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    await adopt($)
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Waiting on you/ }))?.text).toContain('Waiting on you')
    expect(await ui.find({ key: approveKey('INC-00') })).toBeDefined()
    expect(await ui.find({ key: approveKey('INC-01') })).toBeDefined()
    await ui.press({ key: approveKey('INC-01') })
    const approvals = JSON.parse(w.files!['bob/approvals.json']).approvals
    expect(approvals.map((a: any) => a.scope_increment_ids)).toEqual([['INC-01']])
    expect(approvals[0].source).toBe('human')
    await ui.unmount()
  })
}

test('R-bob-12: Send back writes the note to the ledger as a human event and leaves the increment unapproved', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.input({ key: 'sendback-INC-01', text: 'add a cost cap first' })
  const ledger = JSON.parse(w.files!['bob/ledger.json'])
  const ev = ledger.events.find((x: any) => x.type === 'sent_back')
  expect(ev?.origin).toBe('human')
  expect(String(ev?.detail)).toContain('INC-01')
  expect(String(ev?.detail)).toContain('add a cost cap first')
  expect(ledger.increments.find((i: any) => i.id === 'INC-01').state).toBe('proposed')
  expect(JSON.parse(w.files!['bob/approvals.json']).approvals.length).toBe(0)
  await ui.unmount()
})

test('R-bob-12: while a round runs the pane offers Pause (it stops the running turn) and See evidence (the board page)', async ($, on) => {
  const w = await approvedWorld(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'build', turnId: 't9' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'pause' })
  expect(w.aborts).toEqual(['t9'])
  // A file:// link is drawn as plain text on the desktop app, so See evidence asks Claude to show it.
  await ui.press({ key: 'see-evidence' })
  expect(w.prompts!.length).toBe(1)
  expect(w.prompts![0]).toContain('INC-T-2')
  expect(w.prompts![0]).toContain('evidence')
  await ui.unmount()
})

test('R-bob-11: Project home lists the other projects as buttons that switch in one click, and an idea box hands the idea to Claude', async ($, on) => {
  const w = await workspaceWorld(on, {
    'bob-workspace.json': wsFile(['demo', 'second'], 'demo'),
    'demo/docs/project-status.md': '# demo\n',
    'second/docs/project-status.md': '# second\n',
  })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ key: 'project-demo' })).toBe(undefined)
  await ui.press({ key: 'project-second' })
  expect(wsOf(w).current).toBe('second')
  await ui.input({ key: 'start-idea', text: 'a tool that checks proposals against the rate card' })
  expect(w.prompts!.length).toBe(1)
  expect(w.prompts![0]).toContain('a tool that checks proposals against the rate card')
  expect(w.prompts![0]).toContain('start_project')
  await ui.unmount()
})

const verifiedLedger = {
  ...LEDGER,
  increments: [
    { id: 'INC-T-1', title: 'register', requirement_ids: ['R-T-01', 'R-T-02'], state: 'active', approval_id: 'AP-T-1', ...base('ai') },
    { id: 'INC-T-3', title: 'next', requirement_ids: ['R-T-04'], state: 'proposed', approval_id: null, ...base('ai') },
  ],
}

test('R-bob-15: approving the next increment closes an active one whose requirements are all verified or accepted, in one approval', async ($, on) => {
  const w = await approvedWorld(on, {
    ledger: verifiedLedger,
    approvals: [{ id: 'AP-T-1', brief_hash: await sha256(JSON.stringify(BRIEF)), scope_increment_ids: ['INC-T-1'], approver: 'Mags (fixture)', approved_at: T, ...base('human') }],
    files: { 'bob/ledger.json': JSON.stringify(verifiedLedger) },
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await approve($, 'INC-T-3')
  expect(out).toContain('INC-T-1')
  const ledger = JSON.parse(w.files!['bob/ledger.json'])
  expect(ledger.increments.find((i: any) => i.id === 'INC-T-1').state).toBe('done')
  expect(ledger.increments.find((i: any) => i.id === 'INC-T-3').state).toBe('active')
})

test('R-bob-15: an active increment with an unverified requirement still blocks the next approval', async ($, on) => {
  const w = await approvedWorld(on, { files: { 'bob/ledger.json': JSON.stringify({ ...LEDGER, increments: [...LEDGER.increments, { id: 'INC-T-3', title: 'next', requirement_ids: ['R-T-05'], state: 'proposed', approval_id: null, ...base('ai') }] }) } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await approve($, 'INC-T-3')
  expect(out).toContain('refused')
  expect(out).toContain('INC-T-2')
  expect(JSON.parse(w.files!['bob/ledger.json']).increments.find((i: any) => i.id === 'INC-T-2').state).toBe('active')
})

test('INC-03: the Waiting on you box and Project home draw on every surface', async ($, on) => {
  await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await adopt($)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Waiting on you/ }))?.text).toBe('Waiting on you')
    expect(await ui.find({ key: approveKey('INC-00') })).toBeDefined()
    await ui.unmount()
  }
})

// ---------------------------------------------------------------------------
// Build 4, INC-04: R-bob-13 the design stage view, R-bob-14 no next action asks
// a person to type a /bob command (every route is a pane button or plain words).
// ---------------------------------------------------------------------------

const designedTo = (stages: number): Record<string, string> => {
  const f: Record<string, string> = {
    'bob-workspace.json': wsFile(['idea'], 'idea'),
    'idea/docs/project-status.md': '# idea\n',
  }
  if (stages >= 1) f['idea/bob/sources.json'] = JSON.stringify({ sources: [] })
  if (stages >= 2) f['idea/bob/brief.md'] = '# idea\n\n## Who\nAccount leads who send proposals.\n\n## Job\nCatch underpriced lines before a proposal goes out.\n\n## Conflicts\nnone\n\n## Unknowns\nwhere the rate card lives\n'
  if (stages >= 3) f['idea/bob/brief.md'] += '\n## Requirements\n- R-idea-01 MUST read the rate card\n'
  if (stages >= 5) {
    f['idea/docs/evidence/design/data-trace.md'] = '# data\n'
    f['idea/docs/evidence/design/journey.md'] = '# journey\n'
    f['idea/docs/evidence/design/screen-map.md'] = '# screens\n'
  }
  return f
}

test('R-bob-13: a project being designed shows the six stages, the done ones marked, the current one named, and the brief so far', async ($, on) => {
  await workspaceWorld(on, designedTo(3))
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Capture/ }))?.text).toBe('✓ Capture')
  expect((await ui.find({ type: 'Text', text: /Understand/ }))?.text).toBe('✓ Understand')
  expect((await ui.find({ type: 'Text', text: /Design the product/ }))?.text).toBe('✓ Design the product')
  expect((await ui.find({ type: 'Text', text: /Data and knowledge/ }))?.text).toBe('▶ Data and knowledge')
  expect((await ui.find({ type: 'Text', text: /Challenge and approve/ }))?.text).toBe('· Challenge and approve')
  expect((await ui.find({ type: 'Text', text: /Account leads/ }))?.text).toContain('Account leads who send proposals')
  expect(await ui.find({ key: paneKey('review', 'journey') })).toBe(undefined)
  await ui.unmount()
})

test('R-bob-13: review pages open from buttons once they exist, by asking Claude, never by a file path', async ($, on) => {
  const w = await workspaceWorld(on, designedTo(5))
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Make it visible/ }))?.text).toBe('✓ Make it visible')
  await ui.press({ key: paneKey('review', 'journey') })
  expect(w.prompts!.length).toBe(1)
  expect(w.prompts![0]).toContain('journey')
  expect(await ui.find({ key: paneKey('review', 'screen-map') })).toBeDefined()
  await ui.unmount()
})

test('R-bob-14: an approved design is adopted from a pane button, not a typed command', async ($, on) => {
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'adopt' })
  expect('bob/brief.json' in w.files!).toBe(true)
  await ui.unmount()
})

test('R-bob-14: a stale run closes from a pane button; a changed brief is re-approved from one', async ($, on) => {
  const w = await approvedWorld(on, { ledger: withRuns([runOf('running', '2026-10-21T09:00:00+11:00')]), files: { 'bob/ledger.json': JSON.stringify(withRuns([runOf('running', '2026-10-21T09:00:00+11:00')])) } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /stale/ }))?.text).not.toContain('/bob')
  await ui.press({ key: 'reconcile' })
  expect(JSON.parse(w.files!['bob/ledger.json']).events.some((e: any) => e.type === 'reconciled')).toBe(true)
  await ui.unmount()
})

test('R-bob-14: a brief changed after approval offers Re-approve in the pane', async ($, on) => {
  const changed = { ...BRIEF, requirements: [...BRIEF.requirements, req('R-T-06', 'late add', 'designed')] }
  await approvedWorld(on, { brief: changed })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ key: paneKey('reapprove', 'INC-T-2') })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /Next action/ }))?.text).not.toContain('/bob')
  await ui.unmount()
})

test('R-bob-14: no next action BOB shows asks a person to type a /bob command', async ($, on) => {
  const texts: string[] = []
  const nextOf = async () => {
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    texts.push(String((await ui.find({ type: 'Text', text: /Next action/ }))?.text ?? ''))
    await ui.unmount()
  }
  const w = await adoptWorld(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await nextOf()
  const adopted = await adopt($)
  texts.push(adopted.split('\n').filter(l => /Next action|Gate A/.test(l)).join(' '))
  await nextOf()
  texts.push(said(await $.tool.call({ tool: 'Write', file_path: '/repo/x.ts', content: 'x' })))
  texts.push((await approve($, 'INC-99')).split('\n').filter(l => /Next action/.test(l)).join(' '))
  void w
  for (const t of texts) expect(t).not.toContain('/bob')
  expect(texts.length).toBe(5)
})

// ---------------------------------------------------------------------------
// R-bob-16, the idle-repo rule (27 October 2026). A governed repo with no
// increment proposed, approved or active is idle: no round is open, so Gate A
// allows writes and Gate B has no round to hold. AquaAgent froze this way with
// INC-00 and INC-01 both done. A proposed or approved increment, a state the
// schema does not name, a brief changed after approval and a file that does not
// parse all still refuse (fail closed, unchanged).
// ---------------------------------------------------------------------------

const idleLedger = (states: string[] = ['done', 'returned']) => ({
  ...LEDGER,
  increments: LEDGER.increments.map((i, n) => ({ ...i, state: states[n] ?? 'done' })),
})

test('R-bob-16: an idle governed repo (every increment done or returned, or none at all) allows an Edit, a Write and a file-writing Bash with no approval, and the round ends free', async ($, on) => {
  const w = await approvedWorld(on, { approvals: [], ledger: idleLedger() })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const ledger of [idleLedger(), { ...LEDGER, increments: [] }]) {
    w.ledger = ledger
    expect(said(await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.ts', old_string: 'a', new_string: 'b' }))).toBe('')
    expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')
    expect(said(await $.tool.call({ tool: 'Bash', command: 'echo hi > /repo/out.txt' }))).toBe('')
  }
  expect((await $.classic.Stop(stopInput())).block).toBe(undefined)
})

test('R-bob-16: a proposed or approved increment still refuses every write, and so does an increment state the schema does not name', async ($, on) => {
  const w = await approvedWorld(on, { approvals: [], ledger: idleLedger(['done', 'proposed']) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const state of ['proposed', 'approved', 'paused']) {
    w.ledger = idleLedger(['done', state])
    expect(said(await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.ts', old_string: 'a', new_string: 'b' }))).toContain('Gate A')
    expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toContain('Gate A')
    expect(said(await $.tool.call({ tool: 'Bash', command: 'echo hi > /repo/out.txt' }))).toContain('Gate A')
  }
  w.ledger = idleLedger(['done', 'proposed'])
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toContain('Approve INC-T-2')
})

test('R-bob-16: idle never opens a ledger that does not parse, and an active increment whose brief changed after approval still refuses', async ($, on) => {
  const w = await approvedWorld(on, { approvals: [], ledger: idleLedger(), files: { 'bob/ledger.json': '{ "increments": [ ' } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toContain('Gate A')

  delete w.files!['bob/ledger.json']
  expect(said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))).toBe('')

  w.ledger = LEDGER
  w.approvals = [{ id: 'AP-T-2', brief_hash: await sha256('an older brief'), scope_increment_ids: ['INC-T-2'], approver: 'Mags (fixture)', approved_at: T, ...base('human') }]
  const out = said(await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x' }))
  expect(out).toContain('Gate A')
  expect(out).toContain('changed')
})

test('R-bob-16: the pane, /bob status and the board page say "idle: no round started" instead of a blocker, and the next action asks no one to type', async ($, on) => {
  const w = await approvedWorld(on, { approvals: [], ledger: idleLedger() })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^Increment:/ }))?.text).toBe('Increment: idle: no round started')
    // The brief's own blocked requirement (R-T-05) is still a blocker; the missing round is not.
    expect((await ui.find({ type: 'Text', text: /^Blocker:/ }))?.text).toBe('Blocker: R-T-05 blocked')
    const next = String((await ui.find({ type: 'Text', text: /Next action/ }))?.text ?? '')
    expect(next).toMatch(/^Next action: Claude: /)
    expect(next).not.toContain('/bob')
    expect(await ui.find({ key: approveKey('INC-T-1') })).toBe(undefined)
    expect(await ui.find({ key: approveKey('INC-T-2') })).toBe(undefined)
    await ui.unmount()
  }
  const status = await $.command.run({ command: 'bob', args: 'status' })
  expect(status.text).toContain('idle: no round started')
  expect(status.text).not.toContain('has state active')
  const html = statusPage(w).slice(-1)[0].text
  expect(html).toContain('idle: no round started')
  expect(html).not.toContain('has state active')
})
