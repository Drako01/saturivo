# Saturivo — estado verificable (2026-11-10)

**Versión fuente candidata:** 0.3.0, sin Preview. **PR de implementación:** [#9](https://github.com/Drako01/saturivo/pull/9). **Estado:** NO PUBLICADO, sujeto a pruebas y controles administrativos.

**Base publicada:** v0.2.0 y v0.2.2, disponibles históricamente. La entrada v0.2.1 del changelog fue un cambio de código sin tag ni GitHub Release independientes.

## Evidencia y criterio de aceptación

- Auditoría de partida: `main` @ `f7320fe1e76cbe012852fe40bc5b1f6d59dc3620`, 0.2.2, 73/100. Los 123 tests PASS + 1 SKIP y 91,56 % del núcleo pertenecen **exclusivamente** a esa revisión.
- Upgrade 0.3.0: [CI 42857123274](https://github.com/Drako01/saturivo/actions/runs/42857123274) aprobó los 7 jobs sobre `62cbbd6` (136 unit PASS, 0 FAIL, 1 SKIP; core 91,05 %, lifecycle 100 %; VSIX audit PASS; 0 dependencias npm runtime). Las modificaciones documentales y capturas posteriores exigen CI final en el nuevo SHA.
- Gobernanza: los entornos `marketplace`, `open-vsx`, `github-release` deben exigir revisión humana y restringir deployments a `main`. El workflow de publicación falla cerrado si estas reglas faltan; **su configuración real requiere permisos administrativos**.
- Rulesets y seguridad del repositorio: el ruleset activo `Protect main` tiene `strict=true` verificado mediante API el 10/11/2026, pero todavía muestra **3 de los 7 checks** deseados. Secret scanning, push protection y Dependabot requieren verificación administrativa independiente.
- Capturas 0.3.0: **4 PNG reales del renderer de producción**, 1480 × 960, con fixture sintético identificado; [captura Chromium PASS](https://github.com/Drako01/saturivo/actions/runs/42865237314) y commit `184dcf1`. README actualizado para apuntar a las imágenes versionadas y conservar las 0.2.x históricas.
- Pruebas nativas de diálogos, entornos WSL/SSH/Containers, lectores de pantalla, zoom 200 % y pentest DNS remoto: **NO VERIFICADAS**.

**Estado de merge:** no declarar READY TO MERGE mientras falten checks del SHA final, requisitos de gobernanza o capturas reales solicitadas.

Ver [checklist vivo de 0.3.0](docs/RELEASE_0_3_0_CHECKLIST.md), [reglas](docs/RULESETS.md) y [modelo de amenazas](docs/THREAT_MODEL.md).
