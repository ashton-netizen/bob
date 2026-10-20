// BOB's state contract: the values the hooks module keeps in $.state.
// States and transitions are NOT declared here; bob/schema.json is their one home.

export type Preflight = {
  exitCode: number
  lines: string[]
  stops: string[]
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    bob: {
      preflight: Preflight | null
      baseline: string[]
      touched: string[]
    }
  }
}
