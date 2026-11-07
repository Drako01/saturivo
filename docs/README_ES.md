# Saturivo — Guía en español

<p align="center">
  <img src="../media/saturivo-icon.png" alt="Saturivo — Load & Concurrency Inspector" width="120">
</p>

<p align="center"><strong>Encontrá los límites. Identificá los cuellos de botella.</strong></p>
<p align="center">Diagnóstico de carga, concurrencia y rendimiento basado en evidencia, integrado en Visual Studio Code.</p>

[English README](../README.md) · [Arquitectura](../ARCHITECTURE.md) · [Estado real](../STATUS.md) · [Plan Enterprise AAAA](ENTERPRISE_AAAA_MASTER_PLAN.md)

> **Código fuente público · Versión 0.1.1 en desarrollo (PR #5).** No equivale a una versión publicada ni a una certificación Enterprise AAAA.

## Centro de Control — vista previa 0.1.1

Saturivo ahora abre el Centro de Control en una **pestaña del editor**, con espacio para métricas, escenarios, historial y diagnóstico. Las capturas provienen del **renderizador real de la interfaz** con datos sintéticos y deterministas: **no representan mediciones reales**.

![Saturivo — resumen del Centro de Control](../media/screenshots/control-center-overview.png)

<details>
<summary>Ver escenarios, historial y diagnóstico Go</summary>

![Escenarios de carga](../media/screenshots/control-center-load.png)

![Historial de ejecuciones](../media/screenshots/control-center-history.png)

![Diagnóstico de concurrencia Go](../media/screenshots/control-center-diagnostics.png)

</details>

## ¿Para qué sirve?

Saturivo permite medir cómo responde una API bajo una carga controlada, guardar las condiciones de la prueba, comparar ejecuciones compatibles y observar señales de concurrencia en aplicaciones Go. Usa herramientas consolidadas, como **Grafana k6**, **go test -race** y **go tool pprof**, en lugar de inventar otro motor de carga.

| Necesidad | Función |
|---|---|
| Medir una API local | Presets de carga y editor de escenarios HTTP v2 (GET/HEAD) con límites y consentimiento |
| Entender la degradación | P50/P95/P99, solicitudes por segundo, fallos e iteraciones descartadas |
| Comparar cambios | Huella SHA-256, selección de baseline e incertidumbre con pruebas repetidas |
| Analizar Go | Race detector, benchmarks, perfiles CPU, heap, goroutines, mutex/block, traza local y snapshots antes/durante/después |
| Guardar evidencia | Exportación Markdown, JSON y SARIF para carreras observadas |

**Experimental:** se incorporó un piloto manual de capacidad local con 3 etapas de carga acotada, SLO P95 obligatorio y parada ante fallos o resultados inconclusos. No certifica capacidad de producción. **Todavía pendiente:** capacidad con intervalos robustos, exclusión temporal de warm-up, correlación profunda de perfiles Go, adaptadores gRPC/WebSockets, profiling especializado de Node/Java/Python, entornos remotos e IA opt-in. Se incorporó al CI una matriz HTTP real de Go/Node/Python, que no equivale a profiling de esos lenguajes. Consultá el [roadmap](../ROADMAP.md).

## Instalación y uso

**Requisitos:** VS Code 1.99+, Grafana k6 en `PATH`; Go instalado para análisis de concurrencia. Node.js 22+ y npm para compilar desde el repositorio público.

~~~bash
git clone https://github.com/Drako01/saturivo.git
cd saturivo
git switch feat/enterprise-aaaa-v0.1.1
npm ci --ignore-scripts
npm run verify
npm run package:vsix
~~~

En VS Code ejecutá **Extensions: Install from VSIX…** y seleccioná `saturivo.vsix`.

1. Iniciá una API descartable en `127.0.0.1`, usando datos sintéticos y dependencias aisladas.
2. Abrí el **Centro de Control** desde el ícono Saturivo. Esto **no genera tráfico automáticamente**.
3. Elegí **Configurar destino** y completá la URL local.
4. Ejecutá una prueba rápida, una carga por usuarios virtuales o una tasa de llegadas (*open loop*). Podés cancelar.
5. Revisá P95/P99, RPS, errores e historial; repetí el mismo escenario para comparar y exportar resultados.

**Piloto de capacidad local:** configurá primero un SLO P95, elegí una URL HTTP con IP literal de loopback (por ejemplo `http://127.0.0.1:8080/health`) y ejecutá **Piloto de capacidad local**. Hace hasta 3 etapas acotadas de 10 segundos (10, 20 y 40 llegadas/s), con presupuesto finito, cancelación y corte por SLO o evidencia insuficiente. No representa el límite real de producción.

## Configuración recomendada

~~~json
{
  "saturivo.target": "http://127.0.0.1:8080/health",
  "saturivo.k6Path": "k6",
  "saturivo.durationSeconds": 10,
  "saturivo.maxVirtualUsers": 100,
  "saturivo.maxRequests": 10000,
  "saturivo.sloMaxP95Ms": 250,
  "saturivo.allowRemoteTargets": false,
  "saturivo.goProfilerOrigin": "http://127.0.0.1:6060/"
}
~~~

La duración admite 5–120 segundos; el límite global, 1–100 usuarios virtuales; y el presupuesto, 100–100000 solicitudes. Los presets incorporados usan cargas menores. El objetivo P95 es opcional; `0` lo desactiva.

**Interpretación importante:** P95/P99 son percentiles de latencia; RPS representa throughput logrado; las iteraciones descartadas indican que el generador no pudo sostener la tasa solicitada. Un estado **INCONCLUSO** evita afirmar éxito cuando falta evidencia o se alcanzó el presupuesto de solicitudes.

Cuando existen al menos tres ejecuciones compatibles por grupo, Saturivo permite una comparación estadística inicial de la mediana P95 con bootstrap. Una sola ejecución no prueba una mejora ni una regresión causal.

## Concurrencia en Go

**Detector de carreras:** con confirmación explícita ejecuta `go test -race ./...`. Los accesos concurrentes observados se asocian a archivos y líneas del panel **Problems** y pueden exportarse como SARIF. Que no aparezcan hallazgos no significa que el programa esté libre de carreras.

**Benchmarks:** ejecuta `go test -run ^$ -bench . -benchmem ./...` después de confirmar. Los tests pueden ejecutar código del proyecto; usá entornos controlados.

**Profiling:** habilitá `net/http/pprof` solamente en un listener HTTP local de desarrollo (por ejemplo, `127.0.0.1:6060`), configurá el origen en Saturivo y capturá CPU, heap, goroutines, mutex, block o una traza Go de duración acotada. Los artefactos quedan locales. El estado de las goroutines es una fotografía del momento, no una prueba definitiva de fugas.

## Seguridad y privacidad

- Sin carga ni profiling automáticos; cada ejecución requiere una acción del usuario.
- Solo loopback de forma predeterminada. Un destino remoto necesita configuración explícita y confirmación por ejecución.
- Tráfico HTTP de lectura (GET/HEAD), sin redirecciones y con límites de duración, concurrencia y solicitudes.
- Comandos externos sin expansión por shell, con timeout, cancelación y salida acotada.
- Profiling Go restringido a una IP literal de loopback, con límite de tamaño y duración.
- Workspace Trust obligatorio; Webview protegida con CSP.
- Sin telemetría propia, subidas automáticas ni envío de código a modelos de IA.
- El historial local admite eliminación explícita. Perfiles y reportes pueden contener información sensible: revisalos antes de compartirlos.

**No ejecutes pruebas de estrés contra producción o servicios de terceros sin autorización expresa.** Incluso una prueba local puede afectar una base de datos o un servicio downstream.

## Calidad y estado

El commit anterior `cbd3724` del PR #5 pasó las siete verificaciones del [CI #42404881890](https://github.com/Drako01/saturivo/actions/runs/42404881890): checks en Linux/Windows/macOS, integración real con k6, instalación VSIX en Extension Host, fixture Go race/pprof y artefactos de SBOM. Esto acredita solo ese commit, **no** los cambios posteriores ni el cumplimiento completo de Enterprise AAAA.

Para conocer los pendientes reales, revisá el [checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md), los [criterios de aceptación](ACCEPTANCE_CRITERIA.md) y el [plan maestro](ENTERPRISE_AAAA_MASTER_PLAN.md).

---

**Saturivo** es desarrollado por **Alejandro Daniel Di Stefano — [ArmoTuSitio](https://armotusitio.com.ar)**. Licencia MIT. Repositorio público bajo licencia MIT; extensión todavía sin publicar.

## Comunidad y contribuciones

El repositorio de Saturivo es **público**. Aceptamos issues reproducibles, pruebas, documentación, accesibilidad y PRs siguiendo [CONTRIBUTING.md](../CONTRIBUTING.md) y el [Código de conducta](../CODE_OF_CONDUCT.md). Las vulnerabilidades se reportan en privado por [SECURITY.md](../SECURITY.md).

Las protecciones **ya están activas** en GitHub: [Protect main](https://github.com/Drako01/saturivo/rules/26766004) y [Protect release tags](https://github.com/Drako01/saturivo/rules/26766025). Se verificaron contra las configuraciones de Orquestivo. Consultá [RULESETS.md](RULESETS.md), el [modelo de gobernanza](GOVERNANCE.md) y [SUPPORT.md](../SUPPORT.md).
