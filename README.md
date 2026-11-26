# GigSync Live: pipeline CI/CD seguro (Azure DevOps + GitHub Actions)

**Institución Universitaria ITM, Arquitectura de Software II**
**Caso de estudio:** GigSync Live (plataforma de contratación musical)
**Guía 5:** taller evaluativo (20 %)
**Equipo:** Sebastián Dávila, Luisa María Puentes Espinosa, Franco Moncayo
**Docente:** Jonathan Sánchez Giraldo

---

## 1. Qué contiene el repositorio

| Ruta | Descripción |
|---|---|
| `src/bookingService.js` | Dominio de reservas: máquina de estados, comisión y eventos de auditoría Kafka |
| `src/server.js` | API HTTP (Node `http` nativo) que se despliega en Azure App Service |
| `tests/` | Pruebas unitarias Jest (27 pruebas, cobertura mínima exigida del 80 %) |
| `azure-pipelines.yml` | Pipeline CI/CD de **Azure DevOps** (punto 1 de la guía) |
| `.github/workflows/ci-cd.yml` | Workflow CI/CD de **GitHub Actions** (punto 2 de la guía) |
| `.gitleaks.toml` | Reglas de Gitleaks (reglas oficiales más las propias del proyecto) |
| `.semgrep/gigsync-rules.yml` | Reglas SAST propias de Semgrep (inyección SQL, de comandos y `eval`) |
| `.github/dependabot.yml` | Actualización semanal de GitHub Actions y dependencias npm (con espera de 7 días) |
| `dependency-check-suppressions.xml` | Política de supresión de falsos positivos de OWASP Dependency-Check |
| `scripts/pipeline-summary.js` | Genera las tablas de resumen que aparecen en cada ejecución |
| `backlog_gigsync_devops.json` | Backlog (Épica, Features, HU y tareas), incluida la HU-04 de esta guía |

## 2. Ejecutar localmente

```bash
npm ci              # instala dependencias exactas (package-lock.json)
npm test            # pruebas + cobertura
npm audit --audit-level=high
npm start           # API en http://localhost:3000  (GET /health)
```

Endpoints: `GET /`, `GET /health`, `GET|POST /api/bookings`, `GET /api/bookings/:id`,
`PATCH /api/bookings/:id/status`.

## 3. Flujo CI/CD y controles de seguridad

```
commit/push ──► 1. Seguridad ───────────────────► 2. CI ──────────────────────► 3. CD (solo main)
                 • Gitleaks (secretos)              • npm ci                      • Azure App Service
                 • SAST Semgrep                     • npm audit (High/Critical)   • Smoke test /health
                 • OWASP Dependency-Check           • Jest + cobertura >= 80 %
                   (CVSS >= 7)                      • Paquete .zip
```

| Control | Herramienta | Criterio de fallo | Evidencia |
|---|---|---|---|
| Secretos expuestos | Gitleaks v8.30.1 | Cualquier secreto en el historial de git (`--exit-code 1`) | Log, resumen y artefacto `gitleaks-report.json` |
| Código inseguro (SAST) | Semgrep 1.186.0: `p/owasp-top-ten`, `p/expressjs` y `.semgrep/` | Cualquier hallazgo (`--error`) | Log, resumen y artefacto `semgrep-report.json` |
| Dependencias vulnerables | OWASP Dependency-Check v13.0.0 | Cualquier CVE con CVSS >= 7.0 (`--failOnCVSS 7`) | Reporte HTML/JSON, pestaña *Tests*, resumen |
| Auditoría npm | `npm audit` | Vulnerabilidades High o Critical | Log del paso |
| Calidad | Jest | Una prueba fallida o cobertura < 80 % | Pestañas *Tests* y *Code Coverage* |

Si un control falla, los stages/jobs siguientes no se ejecutan y **no hay despliegue**.

**Por qué hay reglas SAST propias:** con el motor gratuito de Semgrep, los paquetes `p/owasp-top-ten` y
`p/expressjs` no detectan inyección SQL ni de comandos en un servidor con el módulo `http` nativo
(probado con código vulnerable de ejemplo: 0 hallazgos). Las reglas de `.semgrep/` cubren esos casos.

**Cadena de suministro:** en GitHub Actions cada acción se referencia por el SHA completo del commit
(no por tag, que su dueño puede mover). Dependabot propone las actualizaciones.

**Base de datos de vulnerabilidades (NVD):** Dependency-Check 13 ya no consulta la API de NVD sin
API key. Si existe la variable secreta `NVD_API_KEY`, se usa la API oficial; si no, el pipeline usa
el mirror público del proyecto Dependency-Check. En ambos casos la base se guarda en caché entre ejecuciones.

## 4. Configuración en Azure DevOps (punto 1)

1. Crear la organización y el proyecto en <https://dev.azure.com> (por ejemplo `GigSync-Live-DevOps`).
2. **Repos**: importar o hacer push de este repositorio (ramas `main`, `integration`, `develop`, `feature/*`).
3. **Pipelines > New pipeline > Azure Repos Git > Existing Azure Pipelines YAML file** y elegir `/azure-pipelines.yml`.
4. (Opcional, recomendado) **Variables**: crear `NVD_API_KEY` marcada como *secret*
   (clave gratuita en <https://nvd.nist.gov/developers/request-an-api-key>).
5. **CD a App Service**:
   - Crear una Web App Linux con runtime **Node 22 LTS** (plan F1 gratuito), por ejemplo `gigsync-live-ado-<sufijo>`.
   - **Project Settings > Service connections > New > Azure Resource Manager** con el nombre `sc-gigsync-azure`.
   - En `azure-pipelines.yml` poner `AZURE_WEBAPP_NAME` con el nombre real de la Web App y `DEPLOY_ENABLED: 'true'`.
6. **Branch policies** (en `main`, `integration` y `develop`): *Build validation* con este pipeline y *Policy requirement: Required*.
7. **Organization settings > Users**: agregar al docente (`jonathansanchez2948@correo.itm.edu.co`) con acceso *Basic* o *Stakeholder*, y luego agregarlo al proyecto.

> Las organizaciones nuevas de Azure DevOps no tienen agentes hospedados gratuitos activados.
> Si el pipeline queda en cola con el mensaje *"No hosted parallelism has been purchased or granted"*,
> solicitar el acceso gratuito en <https://aka.ms/azpipelines-parallelism-request>.

## 5. Configuración en GitHub (punto 2)

1. Crear el repositorio y hacer push de todas las ramas. El workflow se activa solo.
2. (Opcional, recomendado) **Settings > Secrets and variables > Actions > Secrets**: `NVD_API_KEY`.
3. **CD a App Service** (opcional): crear una segunda Web App (por ejemplo `gigsync-live-gh-<sufijo>`), activar
   *SCM Basic Auth Publishing Credentials* en *Configuration*, descargar el *Publish profile* y crear:
   - el secreto `AZURE_WEBAPP_PUBLISH_PROFILE` con el contenido del archivo descargado;
   - la variable `AZURE_WEBAPP_NAME` (en la pestaña *Variables*) con el nombre de la Web App.

   Sin estos valores, el job `deploy` aparece como *skipped* y el resto del pipeline funciona igual.
4. **Settings > Branches > Add branch ruleset** para `main` (y `develop`/`integration`): *Require status checks to pass*
   con `Gitleaks (secretos expuestos)`, `SAST (Semgrep)`, `OWASP Dependency-Check (dependencias)` y
   `Build y pruebas (Jest + cobertura)`.
5. **Settings > Collaborators**: invitar al docente.
