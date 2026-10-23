// Renders docs/status.html for a governed repo outside a session, from the same
// board logic the plugin uses (hooks/board.ts, one home). The plugin writes the
// page itself at session start and after every /bob command; this script is for
// a look without a session (a demo, a handover, CI).
//
// Usage: node scripts/render-status.ts <repo folder> [output file]
// Node 22.6 or newer (type stripping). Reads bob/schema.json from this plugin
// folder; never writes anything but the output file.
import { readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, renderStatusHtml, scopeHashOf } from '../hooks/board.ts'

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(process.argv[2] ?? '.')
const out = resolve(process.argv[3] ?? join(root, 'docs', 'status.html'))

const read = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)
const dir = existsSync(join(root, 'bob', 'ledger.json')) ? 'bob' : 'fixtures'
if (dir === 'fixtures') {
  console.error(`${root} has no bob/ledger.json of its own; a page is never written from fixtures.`)
  process.exit(1)
}
const brief = read(join(root, 'bob', 'brief.json'))
const briefBytes = existsSync(join(root, 'bob', 'brief.json')) ? readFileSync(join(root, 'bob', 'brief.json')) : null
const ledgerPath = join('bob', 'ledger.json')
const m = {
  root,
  place: { session: root, root, workspace: null, workspaceError: null, project: String(brief?.project?.name ?? root.split('/').pop()) },
  governed: Boolean(brief),
  ownLedger: true,
  fixtures: false,
  schema: read(join(plugin, 'bob', 'schema.json')),
  brief,
  approvals: read(join(root, 'bob', 'approvals.json'))?.approvals ?? [],
  ledger: read(join(root, ledgerPath)),
  ledgerPath,
  ledgerMtimeMs: statSync(join(root, ledgerPath)).mtimeMs,
  hash: briefBytes ? createHash('sha256').update(briefBytes).digest('hex') : null,
  scopeHash: brief ? await scopeHashOf(brief) : null,
  parseErrors: [] as string[],
}
const board = describe(m as any, null, Date.now())
writeFileSync(out, renderStatusHtml(board, { project: m.place.project, generatedAt: new Date().toISOString(), repo: root }))
console.log(`wrote ${out}: ${board.rows.length} requirements, increment ${board.increment}, next: ${board.next}`)
