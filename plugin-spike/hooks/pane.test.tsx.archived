import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'bob-pane-spike',
  component: 'Pane',
  requestId: 'bob-board',
  props: {
    title: 'BOB (spike)',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('the board draws the fixture on every surface, with a blocked chip', async ($, on) => {
  on('command.register', () => ({ value: { command: 'bob-status' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const next = await ui.find({ type: 'Text', text: /Next action/ })
    expect(next?.text).toBe('Next action: Mags: accept or return R-AQ-07')
    const blocked = await ui.find({ type: 'Text', text: /\[blocked\]/ })
    expect(blocked?.text).toBe('[blocked]')
    await ui.unmount()
  }
})
