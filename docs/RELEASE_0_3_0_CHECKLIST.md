# Saturivo 0.3.0 — checklist vivo del upgrade

Base auditada: `main@f7320fe1e76cbe012852fe40bc5b1f6d59dc3620` (0.2.2, 73/100). Trabajo: [PR #9](https://github.com/Drako01/saturivo/pull/9) · `feat/saturivo-enterprise-aaaa-0.3.0`.

> Estados DONE / PARTIAL / BLOCKED / TODO. El trabajo de código no cuenta como check PASS hasta ejecutarlo sobre el SHA definitivo.

| Fase | Estado | Evidencia / bloqueo |
|---|---|---|
| 0 · machine settings | PARTIAL | Código + test negativo añadidos; test de host contra setting hostil pendiente de CI final |
| 0 · release environments | BLOCKED | Compuerta automática fail-closed añadida; configurar required reviewers y política exclusiva `main` en los 3 entornos desde GitHub Settings |
| 1 · lifecycle | PARTIAL | Seis flujos migrados al mutex de reserva sincrónica y cancelación tipada; compilación/tests sobre SHA final pendientes |
| 1 · límites/versión/WS | PARTIAL | `limits.ts` compartido, userAgent del manifiesto, lector de evidencia acotado; CI final pendiente |
| 2 · cobertura | PARTIAL | Umbral medido del core ≥90 % y lifecycle ≥80 % sin repetir suite; validar resultados reales finales |
| 2 · property tests | PARTIAL | 10.000 entradas maliciosas + 1.000 escenarios válidos deterministas; CI final pendiente |
| 2 · diálogos nativos | BLOCKED | Sin prueba automatizada real de rechazo de consentimiento y borrado cancelado en el Extension Host |
| 3 · rulesets | BLOCKED | Definición de siete jobs y strict actualizada; live ruleset todavía requiere `rulesets:apply` y readback |
| 3 · seguridad repo | BLOCKED | Secret scanning, push protection y Dependabot requieren cambios administrativos y verificación live |
| 3 · screenshot CI | PARTIAL | Job manual sin `contents: write`; nuevas capturas 0.3.0 todavía no generadas |
| 4 · documentación | PARTIAL | README/STATUS/CHANGELOG y versiones reconciliados; pantallas 0.3.0 pendientes |
| Distribución | PARTIAL | 0.3.0 estable sin Preview en manifiesto, VSIX y smoke tests de instalación todavía no validados |

## Evidencia histórica reutilizable

- `main@f7320fe`: unit tests 123 PASS / 1 SKIP y core 91,56 % (excluye orquestación); no son evidencia de 0.3.0.
- [CI #42851652847](https://github.com/Drako01/saturivo/actions/runs/42851652847): verde sobre `ce19af3`, un commit anterior del PR. No permite afirmar PASS para los cambios siguientes.
- No se ha hecho merge, bypass ni publicación.

## Operaciones administrativas pendientes (owner)

1. Configurar los entornos `marketplace`, `open-vsx` y `github-release`: al menos un `required reviewer`, política explícita `main`, proteger la aprobación.
2. Aplicar `npm run rulesets:check` y `node scripts/rulesets.mjs --apply --confirm=Drako01/saturivo` con `GH_TOKEN` autorizado; luego `npm run rulesets:status`. Los permisos GitHub Administración: write no están disponibles mediante la conexión actual.
3. Activar `secret scanning`, `push protection` y `Dependabot security updates` en Settings > Code security.
4. Ejecutar CI en el último SHA; recopilar build, cobertura, VSIX audit, real Extension Host, 7 jobs y artefactos.
5. Capturar UI 0.3.0 real y revisar rutas README. Sin evidencia real, continuar como BLOCKED.
6. Opcional antes de release: WSL/SSH/Containers, NVDA/VoiceOver, zoom 200 %, pentest de rebinding remoto (no sustituibles por mocks).

**Veredicto actual: NOT READY.** No fusionar ni publicar hasta cerrar los bloqueos de aceptación.
