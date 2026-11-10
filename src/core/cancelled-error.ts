/** Typed abort used in core and execution lifecycle. */
export class CancelledError extends Error {
  constructor() { super("Cancelled"); this.name = "CancelledError"; }
}
