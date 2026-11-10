/** Declined and interrupted native dialogs never authorize destructive work. */
export async function confirmWhileActive(
  signal: AbortSignal, decide: () => Promise<boolean>
): Promise<boolean> {
  if (signal.aborted) return false;
  const decision = await decide();
  return decision === true && !signal.aborted;
}
