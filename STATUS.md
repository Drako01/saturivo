# Saturivo — estado verificable (2026-11-11)

**Versión publicada verificada:** 0.3.1 estable, sin Preview — [GitHub Release v0.3.1](https://github.com/Drako01/saturivo/releases/tag/v0.3.1), publicada el 10/11/2026. [Workflow de publicación](https://github.com/Drako01/saturivo/actions/runs/42871351253): success.

**Versión fuente propuesta:** 0.4.0, rama `feat/saturivo-0.4.0-reliability-onboarding`, basada en `main` `c34b22ffabcfed24d681b5a46457a49c07a2ad10`. **Estado: NO PUBLICADO** hasta que CI de PR, merge y release verifiquen la revisión exacta.

## Alcance 0.4.0

- Evidencia HTTP estricta: reconciliación de contadores por status y rechazo de métricas inválidas.
- Historial confiable: archivos corruptos no desplazan ni podan informes válidos.
- Privacidad WebSocket: query strings ocultos en informes y output.
- Verificación voluntaria de instalación: versiones locales de k6 y Go, configuración de destino y guía ES/EN; no genera tráfico de carga.
- UI y branding: se preservan logo, Activity Bar, colores, tipografía, estructura, capturas previas y estilo de controles.

## Seguridad y CI/CD

- Se conserva el gate de siete jobs de CI en PR y publicación solo desde `main` protegido, con evidencia del mismo árbol y SHA.
- Se mantiene la publicación OIDC separada a Marketplace/Open VSX, VSIX checksum, manifiesto, SBOM y tags inmutables.
- Las vulnerabilidades solo de desarrollo se clasifican según alcanzabilidad; no se bloquean como runtime sin evidencia.
- Ningún PASS se afirma sobre el SHA nuevo antes del resultado de GitHub Actions.

## Pendientes explícitos

- Ejecutar/verificar CI exact-head para la nueva rama (siete jobs) y pruebas reales de integración incluidas.
- QA manual de accesibilidad con lector de pantalla, instalación/upgrade en entornos remotos WSL/SSH/Containers y dispositivos de asistencia.
- Verificar Marketplace, Open VSX y GitHub Release si se decide fusionar la propuesta (fuera del alcance del PR).

Documentación: [auditoría](docs/AUDITORIA_TECNICA_SATURIVO_2026-11-11.md), [roadmap](docs/UPGRADE_ROADMAP_SATURIVO_2026-11-11.md), [release checklist](docs/RELEASE_0_4_0_CHECKLIST.md).
