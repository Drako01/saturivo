export type Locale = "es" | "en";
type Dictionary = Record<string, string>;
const english: Dictionary = {
  title: "Saturivo Control Center", subtitle: "Evidence-based concurrency diagnostics",
  target: "Target", idle: "Ready — no test runs automatically", running: "Test in progress",
  smoke: "Smoke · 1 VU", stress: "Stress · bounded VUs", arrival: "Arrival rate · open loop",
  configure: "Configure target", compare: "Compare runs", export: "Export report",
  race: "Go race detector", benchmark: "Go benchmarks", cancel: "Cancel",
  last: "Latest measurement", requests: "Requests", rps: "Req/s", p95: "P95 (ms)",
  p99: "P99 (ms)", errors: "Errors", history: "Recent runs",
  safety: "Safety: loopback-only by default; no automatic traffic; VUs and duration capped.",
  help: "Requires a local k6 installation. Go commands require the Go toolchain.",
  none: "No runs saved yet", runningGo: "Running Go command",
};
const spanish: Dictionary = {
  title: "Centro de Control Saturivo", subtitle: "Diagnóstico de concurrencia basado en evidencia",
  target: "Destino", idle: "Listo — ninguna prueba se ejecuta automáticamente", running: "Prueba en curso",
  smoke: "Prueba rápida · 1 VU", stress: "Estrés · VUs limitados", arrival: "Tasa de llegadas · lazo abierto",
  configure: "Configurar destino", compare: "Comparar ejecuciones", export: "Exportar informe",
  race: "Detector de carreras Go", benchmark: "Benchmarks Go", cancel: "Cancelar",
  last: "Última medición", requests: "Solicitudes", rps: "Solicitudes/s", p95: "P95 (ms)",
  p99: "P99 (ms)", errors: "Errores", history: "Ejecuciones recientes",
  safety: "Seguridad: solo loopback por defecto; sin tráfico automático; VUs y duración limitados.",
  help: "Requiere k6 instalado localmente. Los comandos Go requieren su toolchain.",
  none: "Todavía no hay ejecuciones guardadas", runningGo: "Ejecutando Go",
};
export function translate(locale: string, key: string): string {
  const dictionary = locale.toLowerCase().startsWith("es") ? spanish : english;
  return dictionary[key] ?? english[key] ?? key;
}
