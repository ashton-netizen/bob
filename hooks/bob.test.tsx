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

  // Governed now: no increment is active, so Gate A refuses and points at /bob approve.
  const denied = said(await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'x' }))
  expect(denied).toContain('Gate A')
  expect(denied).toContain('/bob approve')
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
  expect(String(((await $.command.run({ command: 'bob', args: '' })) as any).text ?? '')).toContain('/bob reconcile')
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
  expect(taken).toContain('/bob switch taken')
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
  expect(missing).toContain('/bob new nothere')
  expect(w.writes!.length).toBe(0)

  await bob($, 'switch idea')
  expect(w.writes!.map(x => x.path)).toEqual(['bob-workspace.json'])
  expect(wsOf(w).current).toBe('idea')
  expect(wsOf(w).projects.map((x: any) => x.name)).toEqual(['idea'])
  expect(inits(w).length).toBe(0)
})

test('a workspace with no project yet: the pane names /bob new as the next action', async ($, on) => {
  await workspaceWorld(on, { 'bob-workspace.json': JSON.stringify({ id: 'WS-01', current: null, projects: [], ...real('tool') }) })
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Next action/ }))?.text).toContain('/bob new')
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
