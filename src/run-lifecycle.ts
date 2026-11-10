/** Serializes runs at command entry, including consent and selection dialogs. */
import { CancelledError } from "./core/cancelled-error";
export { CancelledError } from "./core/cancelled-error";
export function isCancellation(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || error instanceof CancelledError ||
    (error instanceof Error && error.name === "AbortError");
}
export class RunLifecycle {
  private current: AbortController | undefined;
  get busy(): boolean { return this.current !== undefined; }
  cancel(): void { this.current?.abort(new CancelledError()); }
  async withBusy(
    work: (signal: AbortSignal) => Promise<void>,
    onChange: () => void = () => undefined
  ): Promise<boolean> {
    if (this.current) return false;
    const controller = new AbortController();
    this.current = controller;
    onChange();
    try {
      await work(controller.signal);
      return true;
    } finally {
      if (this.current === controller) this.current = undefined;
      onChange();
    }
  }
}
