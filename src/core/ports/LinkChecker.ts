import type { ProbeOutcome } from '../linkCheck/types.ts'

export interface LinkChecker {
  // Asks for what reading the answer of any site needs. Call it straight from
  // the click that confirms: browsers only prompt for a user gesture.
  allow(): Promise<boolean>
  // One request. It never rejects: every failure is an outcome.
  probe(url: string, signal: AbortSignal): Promise<ProbeOutcome>
}
