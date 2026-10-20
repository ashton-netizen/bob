import type { Register } from 'claude-code'

// BOB pane spike. Throwaway. Proves one thing: a build board can sit beside
// the chat on this surface. Every value below is a SYNTHETIC fixture that
// mirrors bob/ledger.json from the Phase 0 design. Nothing is read from disk,
// nothing is written, no tool is blocked.

const PANE = 'bob-board'

type State = 'accepted' | 'verified' | 'implemented' | 'designed' | 'blocked' | 'not assessed'

const FIXTURE = {
  repo: 'aquaagent (fixture)',
  branch: 'bob/inc-02',
  ledger: 'current',
  increment: 'INC-02 · approved v3',
  task: 'T-05 migration + seed',
  blocker: 'none',
  next: 'Mags: accept or return R-AQ-07',
  requirements: [
    { id: 'R-AQ-05', text: 'source register', state: 'accepted' as State, evidence: 'E-03' },
    { id: 'R-AQ-06', text: 'de-dupe rule', state: 'verified' as State, evidence: 'E-04' },
    { id: 'R-AQ-07', text: 'question bank', state: 'implemented' as State, evidence: 'E-05' },
    { id: 'R-AQ-08', text: 'sequence pulls', state: 'designed' as State, evidence: '' },
    { id: 'R-AQ-09', text: 'export', state: 'blocked' as State, evidence: '' },
  ],
  evidence: [
    { id: 'E-05', kind: 'query output', at: '14:02' },
    { id: 'E-04', kind: 'test result', at: '13:41' },
  ],
}

const colour = (s: State) =>
  s === 'accepted' || s === 'verified' ? 'success'
  : s === 'implemented' ? 'suggestion'
  : s === 'designed' ? 'warning'
  : s === 'blocked' ? 'error'
  : 'inactive'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'bob-status',
      description: 'BOB spike: open the build board pane (synthetic fixture)',
    })
    void $.ui.open({ id: PANE, title: 'BOB (spike)' })

    return next(e)
  })

  on('command.run', { command: 'bob-status' }, async $ => {
    const placed = await $.ui.open({ id: PANE, title: 'BOB (spike)' })

    return {
      text: placed.isPlaced
        ? 'BOB board pane opened. Synthetic fixture; nothing here is a real build.'
        : 'BOB board pane requested, but this surface did not seat it.',
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text weight="semibold">BOB · Now</Text>
          <Text dimColor>SPIKE · synthetic fixture · {FIXTURE.repo} · {FIXTURE.branch}</Text>
          <Text>Increment: {FIXTURE.increment}</Text>
          <Text>Current task: {FIXTURE.task}</Text>
          <Text>Blocker: {FIXTURE.blocker}</Text>
          <Text weight="semibold">Next action: {FIXTURE.next}</Text>
          <Text dimColor>ledger: {FIXTURE.ledger}</Text>
        </Box>

        <Box flexDirection="column">
          <Text weight="semibold">Board</Text>
          {FIXTURE.requirements.map(r => (
            <Box key={r.id} flexDirection="row" gap={1}>
              <Text mono>{r.id}</Text>
              <Text>{r.text}</Text>
              <Text color={colour(r.state)}>[{r.state}]</Text>
              {r.evidence ? <Text dimColor>{r.evidence}</Text> : null}
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text weight="semibold">Evidence</Text>
          {FIXTURE.evidence.map(ev => (
            <Text key={ev.id} dimColor>
              {ev.id} · {ev.kind} · {ev.at}
            </Text>
          ))}
          <Text dimColor>No percentage is shown. No state is set from prose.</Text>
        </Box>
      </Box>
    )
  })
}
