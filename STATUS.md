# Saturivo — estado verificable (2026-11-10)

**Versión fuente propuesta:** 0.3.1 **estable, sin Preview**, nuevo PR independiente hacia `main`. **Estado:** NO PUBLICADO hasta completar CI, merge y verificación de los registries y de GitHub Release.

## Antecedente confirmado

- [PR #9](https://github.com/Drako01/saturivo/pull/9) integró upgrade 0.3.0 a `main` mediante squash `9e5d8a8`, con [CI #42865906405](https://github.com/Drako01/saturivo/actions/runs/42865906405) **7/7 PASS**; no generó `v0.3.0`.
- [publish #42866596867](https://github.com/Drako01/saturivo/actions/runs/42866596867) **FAIL** después de autorizar SHA, merge y CI: GitHub API devolvió **HTTP 404** en `environments/marketplace/deployment-branch-policies`.
- Última GitHub Release confirmada antes del patch: `v0.2.2`. `0.3.0` es una revisión de fuente fusionada, no una versión publicada.

## Gate 0.3.1 para único propietario

- **Sin segundo aprobador humano:** se exige `Drako01/saturivo`, `refs/heads/main`, SHA idéntico a la rama protegida, árbol del merge idéntico al PR original y los **siete checks de CI** verdes en el SHA exacto.
- OIDC Trusted Publishers separados en los environments `marketplace` y `open-vsx`; no se requieren consultas a políticas de despliegue opcionales ni required reviewers como precondición del script.
- Se conservan `v0.3.1` inmutable, VSIX auditable, SHA-256/manifiesto, SBOM/licencias y verificación de GitHub Release.
- Ruleset versionado: PR obligatorio, `strict:true`, siete checks, squash y **cero aprobaciones**. El ajuste del ruleset vivo requiere privilegios del propietario.
- UI y capturas de 0.3.0 se conservan; el parche 0.3.1 no modifica comportamiento visual ni la carga. [Evidencia Chromium de las cuatro PNG](https://github.com/Drako01/saturivo/actions/runs/42865237314).

## Validación pendiente

- CI del SHA final del PR 0.3.1 y publicación posterior únicamente tras su merge a `main`.
- Confirmar Marketplace, Open VSX y GitHub Release `v0.3.1`; no anunciar publicación antes de verificarlos.
- WSL/SSH/Containers, diálogos nativos, accesibilidad/zoom y DNS remoto continúan **NOT RUN**; no se declara certificación Enterprise AAAA.

Ver [automatización](docs/RELEASE_AUTOMATION.md), [rulesets](docs/RULESETS.md), [modelo de amenazas](docs/THREAT_MODEL.md) y [checklist 0.3.1](docs/RELEASE_0_3_1_CHECKLIST.md).
