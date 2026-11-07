# Saturivo — Guía en español

<p align="center">
  <img src="../media/saturivo-icon.png" alt="Saturivo — Load & Concurrency Inspector" width="120">
</p>

<p align="center"><strong>Encontrá los límites. Identificá los cuellos de botella.</strong></p>
<p align="center">Diagnóstico de carga, concurrencia y rendimiento basado en evidencia, integrado en Visual Studio Code.</p>

[English README](../README.md) · [Arquitectura](../ARCHITECTURE.md) · [Estado real](../STATUS.md) · [Plan Enterprise AAAA](ENTERPRISE_AAAA_MASTER_PLAN.md)

> **Vista previa privada 0.1.0.** Las capacidades documentadas en el PR #4 son un candidato de desarrollo, no una versión publicada ni una certificación Enterprise AAAA.

## ¿Para qué sirve?

Saturivo permite medir cómo responde una API bajo una carga controlada, guardar las condiciones de la prueba, comparar ejecuciones compatibles y observar señales de concurrencia en aplicaciones Go. Usa herramientas consolidadas, como **Grafana k6**, **go test -race** y **go tool pprof**, en lugar de inventar otro motor de carga.

| Necesidad | Función |
|---|---|
| Medir una API local | Prueba rápida, estrés acotado o tasa constante de llegadas |
| Entender la degradación | P50/P95/P99, solicitudes por segundo, fallos e iteraciones descartadas |
| Comparar cambios | Huella SHA-256 del escenario, historial y estimación de incertidumbre con pruebas repetidas |
| Analizar Go | Detector de carreras con vínculos al código, benchmarks y perfiles CPU, heap, goroutines, mutex y block |
| Guardar evidencia | Exportación Markdown, JSON y SARIF para carreras observadas |

**Todavía no implementado:** descubrimiento automático de capacidad, editor avanzado de rampas, correlación temporal integral de trazas, adaptadores gRPC/WebSockets, profiling especializado de Node/Java/Python e IA opcional. Consultá el [roadmap](../ROADMAP.md).

## Instalación y uso

**Requisitos:** VS Code 1.99+, Grafana k6 en `PATH`; Go instalado para análisis de concurrencia. Node.js 22+ y npm para compilar desde el repositorio privado.

~~~bash
git clone https://github.com/Drako01/saturivo.git
cd saturivo
git switch feat/enterprise-aaaa-runtime-evidence
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

**Profiling:** habilitá `net/http/pprof` solamente en un listener HTTP local de desarrollo (por ejemplo, `127.0.0.1:6060`), configurá el origen en Saturivo y capturá el perfil que necesites: CPU, heap, goroutines, mutex o block. Los artefactos quedan locales. El estado de las goroutines es una fotografía del momento, no una prueba definitiva de fugas.

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

El commit `a819a894` del PR #4 pasó las seis verificaciones del [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010): checks en Linux/Windows/macOS, integración real con k6, instalación VSIX en Extension Host, fixture Go race/pprof y artefactos de SBOM. Esto acredita ese commit, **no** el cumplimiento completo de Enterprise AAAA.

Para conocer los pendientes reales, revisá el [checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md), los [criterios de aceptación](ACCEPTANCE_CRITERIA.md) y el [plan maestro](ENTERPRISE_AAAA_MASTER_PLAN.md).

---

**Saturivo** es desarrollado por **Alejandro Daniel Di Stefano — [ArmoTuSitio](https://armotusitio.com.ar)**. Licencia MIT. Repositorio privado y extensión todavía sin publicar.
