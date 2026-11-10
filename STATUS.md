# Saturivo — estado verificable (2026-11-10)

**Versión fuente candidata:** 0.3.0, sin Preview. **PR de implementación:** [#9](https://github.com/Drako01/saturivo/pull/9). **Estado:** NO PUBLICADO, sujeto a pruebas y controles administrativos.

**Base publicada:** v0.2.0 y v0.2.2, disponibles históricamente. La entrada v0.2.1 del changelog fue un cambio de código sin tag ni GitHub Release independientes.

## Evidencia y criterio de aceptación

- Auditoría de partida: `main` @ `f7320fe1e76cbe012852fe40bc5b1f6d59dc3620`, 0.2.2, 73/100. Los 123 tests PASS + 1 SKIP y 91,56 % del núcleo pertenecen **exclusivamente** a esa revisión.
- Upgrade 0.3.0: [CI 42856082718](https://github.com/Drako01/saturivo/actions/runs/42856082718) aprobó los 7 jobs obligatorios sobre `28d4e95`; 135 tests PASS, 1 SKIP, core 91,05 %, lifecycle 100 %, VSIX audit PASS y 0 dependencias npm runtime. Los commits posteriores requieren revalidación de su SHA.
- Gobernanza: los entornos `marketplace`, `open-vsx`, `github-release` deben exigir revisión humana y restringir deployments a `main`. El workflow de publicación falla cerrado si estas reglas faltan; **su configuración real requiere permisos administrativos**.
- Rulesets y seguridad del repositorio: la definición de main requiere siete checks y strict, pero **la aplicación efectiva de reglas, secret scanning, push protection y Dependabot no está comprobada**.
- Capturas: las cuatro PNG existentes proceden de UI real 0.2.x, con datos sintéticos; **capturas nuevas de 0.3.0 pendientes**, sin sustitución por mocks.
- Pruebas nativas de diálogos, entornos WSL/SSH/Containers, lectores de pantalla, zoom 200 % y pentest DNS remoto: **NO VERIFICADAS**.

**Estado de merge:** no declarar READY TO MERGE mientras falten checks del SHA final, requisitos de gobernanza o capturas reales solicitadas.

Ver [checklist vivo de 0.3.0](docs/RELEASE_0_3_0_CHECKLIST.md), [reglas](docs/RULESETS.md) y [modelo de amenazas](docs/THREAT_MODEL.md).
