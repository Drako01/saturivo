# Saturivo 0.3.1 — checklist de publicación estable para propietario único

**Repositorio:** Drako01/saturivo. **Base:** `main@9e5d8a8`, 0.3.0 fusionada pero no publicada. **Destino:** PR separado hacia `main`, versionado `0.3.1` sin Preview.

## Antecedente

- [PR #9](https://github.com/Drako01/saturivo/pull/9) y [CI #42865906405](https://github.com/Drako01/saturivo/actions/runs/42865906405): **7/7 PASS** sobre el HEAD exacto.
- [publish #42866596867](https://github.com/Drako01/saturivo/actions/runs/42866596867): **FAIL** después de validar merge y CI, por GitHub API HTTP 404 en `environments/marketplace/deployment-branch-policies`. No se generó release `v0.3.0`.

## Requisitos del patch

- [x] Bump coherente de package/lockfile/changelog a `0.3.1`, sin Preview.
- [x] Sin exigencia de aprobador humano adicional.
- [x] Validación de repositorio correcto, rama `main` protegida y SHA exacto; sin dependencia del endpoint opcional de políticas de Environments.
- [x] Mantener `verify-merge-ci.cjs`: match de squash tree y **siete checks** PASS en el HEAD original del PR.
- [x] Mantener Trusted Publishers OIDC (environments `marketplace` y `open-vsx`), tag inmutable, VSIX SHA-256, SBOM, licencia y verificación GitHub Release.
- [x] Definición de main con **cero** aprobaciones, PR, squash, siete checks estrictos y threads resueltos.
- [x] Tests adversariales que bloquean repo/ref/SHA no autorizado, main sin protección y desvíos de workflow.
- [ ] CI 7/7 PASS del SHA final del nuevo PR.
- [ ] Squash merge a `main` y publicar vía `push` verificado, no desde la rama.
- [ ] Publish SUCCESS y confirmación de Marketplace, Open VSX y GitHub Release `v0.3.1`.
- [ ] Verificar/aplicar ruleset efectivo con permisos de administrador; si GitHub Environments tienen required reviewers, removerlos desde Settings por el propietario.

## Límites de evidencia

No hay cambios de UX ni de carga respecto de 0.3.0; las cuatro capturas Chromium 0.3.0 del mismo renderer se conservan, con datos sintéticos declarados. E2E manual WSL/SSH/Containers, diálogos, lectores de pantalla/zoom y DNS remoto siguen **NOT RUN**, no se declaran PASS ni certificación externa.

**No publicar hasta que todos los checks del PR exacto estén verdes.**
