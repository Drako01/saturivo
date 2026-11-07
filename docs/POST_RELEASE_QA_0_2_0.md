# Saturivo 0.2.0 — QA de instalación posterior a publicación

**Estado: NOT RUN.** El propietario autorizó publicar 0.2.0 y probarla después instalada en su equipo. Esta decisión no aprueba manualmente lo no ejecutado ni certifica la totalidad del plan Enterprise AAAA.

## Verificación obligatoria previa a distribución

- Versión `0.2.0`, sin Preview, changelog fechado, CI 7/7 SUCCESS del SHA final y artefactos de VSIX/SHA-256/SBOM/licencias/notices.
- Merge `squash` protegido a `main`; tag inmutable `v0.2.0` exactamente sobre el commit definitivo, pipeline publish con aprobaciones/attestation y verificación en Marketplace/Open VSX.
- Registrar URL de CI, SHA del merge, SHA del tag, hash de VSIX publicado y enlaces de los registros. Un job disparado no equivale a publicación exitosa.

## QA manual posterior a instalar la extensión

| ID | Prueba observable | Estado |
|---|---|---|
| M01 | Instalar desde Marketplace/Open VSX, versión/publisher/iconos, Control Center en editor central y cero tráfico implícito | NOT RUN |
| M02 | Actualizar VSIX 0.1.0→0.2.0 sin perder historial, importar v1/exportar v2 mediante diálogos reales con consentimiento | NOT RUN |
| M03 | Comparación de baseline, borrado de historial y persistencia tras recarga; cancelar diálogos sin efectos | NOT RUN |
| M04 | Go race real: abrir archivo/línea desde hallazgo sin salir del workspace | NOT RUN |
| M05 | Carga k6/Go y cancelación: verificar cero tráfico y procesos descendientes residuales | NOT RUN |
| M06 | Claro/oscuro/alto contraste, 200% zoom, teclado y revisión humana de capturas README | NOT RUN |
| M07 | NVDA y VoiceOver: tabs, métricas, avisos, errores y consentimiento accesibles | NOT RUN |
| M08 | WSL2: VSIX en extension host WSL, loopback correcto, multi-root y cleanup | NOT RUN |
| M09 | Remote-SSH: host separado y contexto, autorización, ejecución/cancelación | NOT RUN |
| M10 | Dev Container: VSIX instalado dentro del contenedor, uso local, cleanup y reload | NOT RUN |
| M11 | DNS/proxy/redirect/rebinding remoto controlado, IPv6 real y descendientes hostiles Windows/WSL | NOT RUN |
| M12 | Revisión humana de licencias, avisos, vulnerabilidades de shipped y threat model | NOT RUN |

Para cada resultado guardar responsable, fecha, OS/VS Code/runtime, SHA y checksum VSIX, pasos, logs sanitizados y PASS/FAIL/NOT RUN. Si aparece un defecto, informarlo antes de decidir cuál será la próxima versión; **no iniciar ahora ninguna versión posterior**.

Ver [runbook remoto](REMOTE_VALIDATION.md) y [criterios de aceptación](ACCEPTANCE_CRITERIA.md).
