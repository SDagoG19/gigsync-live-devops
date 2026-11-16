# 🚀 Guía de Ejecución y Entrega - Taller #4: Microsoft Azure DevOps y CI/CD Pipelines
**Institución Universitaria ITM — Arquitectura de Software II**  
**Caso de Estudio:** GigSync Live (Plataforma de Booking Musical)  
**Ponderación:** Taller Evaluativo 20%  
**Equipo:** Sebastián Dávila, Luisa María Puentes Espinosa, Franco Moncayo  
**Docente:** Jonathan Sánchez Giraldo  

---

## 📁 Archivos y Artefactos Entregados

En este directorio y en la raíz del proyecto se han generado todos los componentes necesarios para completar y sustentar la Guía #4:

1. 📄 **[`Taller_4_Arquitectura_Software_II_GigSyncLive.docx`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_Arquitectura_Software_II_GigSyncLive.docx)**:
   * Documento formal listo para entrega en Word (.docx), diseñado bajo estándares académicos con portada del ITM, integrantes, docente y fecha.
   * Contiene la justificación teórica y técnica completa de los 5 puntos de la guía.
   * Incluye el código YAML del pipeline, tablas del Backlog, comandos de consola y **16 recuadros estilizados de evidencia** con instrucciones exactas de qué captura tomar en Azure DevOps.
   * Bibliografía completa en formato APA 7ma edición.

2. ⚙️ **[`azure-pipelines.yml`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/azure-pipelines.yml)**:
   * Archivo de definición del pipeline para **Azure Pipelines** configurado en 3 stages.
   * Implementa las **4 validaciones obligatorias**:
     1. **Detección de Secretos Expuestos**: Gitleaks scanner (`.gitleaks.toml`).
     2. **SAST**: Análisis estático de código contra el OWASP Top 10.
     3. **OWASP Dependency-Check**: Escaneo de dependencias vulnerables (NVD, CVSS $\ge$ 7).
     4. **Pruebas Unitarias y Cobertura**: Jest con reporte Cobertura/JUnit y umbral obligatorio $\ge 80\%$.
   * Publicación automática de reportes en las pestañas nativas *Tests* y *Code Coverage*.

3. 🧪 **Código Fuente y Pruebas Unitarias Verificadas**:
   * [`src/bookingService.js`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/src/bookingService.js): Dominio de contratación de GigSync Live, máquina de estados finitos y productor de auditoría Kafka.
   * [`tests/bookingService.test.js`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/tests/bookingService.test.js): Suite de pruebas unitarias Jest con 12 tests aprobados (**100% éxito**) y cobertura superior al **85%** (líneas: 100%, funciones: 100%, ramas: 85.71%).

4. 📊 **[`backlog_gigsync_devops.json`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/backlog_gigsync_devops.json)**:
   * Taxonomía completa del Backlog lista para ingresar en Azure Boards:
     * **Épicas (Epics)**: Portfolio de contratación musical.
     * **Features**: Kafka auditoría, validación OWASP, portal frontend.
     * **User Stories (HU)**: HU-01, HU-02, HU-03 con criterios Gherkin y Story Points asignados a cada integrante.
     * **Tareas (Tasks)**: 7 tareas técnicas con horas estimadas y tipos de actividad.

5. 📜 **[`setup_git_workflow.ps1`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/setup_git_workflow.ps1)**:
   * Script en PowerShell para automatizar la inicialización de Git, creación de ramas (`main`, `integration`, `develop`, `feature/HU-01-booking-service`) y commits vinculados a Work Items (`Fixes #1`).

---

## 🛠️ Guía Paso a Paso para Completar la Entrega

### Paso 1: Configurar Azure DevOps (Punto 1 de la Guía)
1. Uno de los integrantes (ej. Sebastián Dávila) ingresa a [https://dev.azure.com](https://dev.azure.com).
2. Crear un nuevo proyecto:
   * **Project name:** `GigSync-Live-DevOps`
   * **Visibility:** Public o Private (según preferencia).
   * **Work item process:** `Agile` o `Scrum`.
3. Ir a **Project Settings** (engranaje inferior izquierdo) $\rightarrow$ **Teams** o **Permissions**:
   * Invitar a los otros dos integrantes (Luisa Puentes y Franco Moncayo) usando su correo institucional o personal de Microsoft.
   * Asignarles nivel de acceso **Basic** y agregarlos al grupo `Contributors`.
4. 📷 **Tomar Capturas:**
   * **Figura 1.1:** Panel principal del proyecto mostrando nombre y menú lateral.
   * **Figura 1.2:** Pantalla de configuración del equipo con los 3 miembros activos.

---

### Paso 2: Crear el Backlog en Azure Boards (Punto 2 de la Guía)
1. En el menú lateral, ir a **Boards** $\rightarrow$ **Backlogs**:
2. Asegurarse de que en el selector superior estén activadas las vistas de **Epics**, **Features** y **Stories**.
3. Crear los elementos siguiendo los datos de [`backlog_gigsync_devops.json`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_GigSync_Live_Azure_DevOps_CI_CD/backlog_gigsync_devops.json):
   * **Épica:** `EPIC-01: Gestión Integral del Ciclo de Vida de Contratación Musical (Gig Booking Core)`
   * **Features:**
     * `FEAT-01: Motor de Mensajería y Auditoría Transaccional con Apache Kafka`
     * `FEAT-02: Validación de Seguridad y Sanitización contra Inyecciones (OWASP Top 10)`
     * `FEAT-03: Portal Interactivo de Seguimiento de Contratos (Frontend)`
   * **Historias de Usuario (HUs):**
     * **HU-01 (ID #1):** *Registro y Emisión de Eventos de Auditoría ante Transición de Estado de Reserva* $\rightarrow$ Asignar a **Sebastián Dávila** (8 Story Points).
     * **HU-02 (ID #2):** *Sanitización de Datos y Protección contra Inyecciones en Contratación* $\rightarrow$ Asignar a **Franco Moncayo** (5 Story Points).
     * **HU-03 (ID #3):** *Línea de Tiempo Visual del Estado de la Reserva para Artistas y Promotores* $\rightarrow$ Asignar a **Luisa María Puentes** (5 Story Points).
   * **Tareas (Tasks):** Desglosar cada HU en sus tareas correspondientes (con horas estimadas).
4. 📷 **Tomar Capturas:**
   * **Figura 2.1:** Portfolio Backlog mostrando Epics y Features.
   * **Figura 2.2:** Product Backlog con las 3 HUs asignadas y priorizadas.
   * **Figura 2.3:** Sprint Taskboard con las tareas en columnas *To Do*, *In Progress* y *Done*.

---

### Paso 3: Inicializar Git y Subir la Rama Develop (Punto 3 de la Guía)
1. Abrir una terminal de PowerShell dentro de `Taller_4_GigSync_Live_Azure_DevOps_CI_CD`:
   ```powershell
   cd "C:\Users\Luxury\Downloads\Arquitectura Software II\Taller_4_GigSync_Live_Azure_DevOps_CI_CD"
   ```
2. Ejecutar el script automatizado:
   ```powershell
   .\setup_git_workflow.ps1
   ```
3. En Azure DevOps, ve a **Repos** $\rightarrow$ **Files** y copia la URL de clonación HTTPS de tu repositorio.
4. Vincula y sube las ramas a Azure Repos:
   ```powershell
   git remote add origin <URL_DE_TU_REPOSITORIO_AZURE>
   git push -u origin main
   git push -u origin integration
   git push -u origin develop
   git push -u origin feature/HU-01-booking-service
   ```
5. 📷 **Tomar Capturas:**
   * **Figura 3.1:** Azure Repos -> Files sobre la rama `develop` mostrando los archivos.
   * **Figura 3.2:** Azure Repos -> Commits en `develop` mostrando el commit con enlace al Work Item `#1`.

---

### Paso 4: Configurar Políticas de Rama (Branch Policies) en Azure Repos
Para cumplir con el requisito de que **ningún Pull Request pueda completarse si alguna validación falla**:
1. En Azure Repos, ve a **Branches**.
2. Al lado de la rama `develop` (y luego para `integration` y `main`), haz clic en los 3 puntos `...` $\rightarrow$ **Branch policies**.
3. Configurar:
   * ✅ **Require a minimum number of reviewers:** Activar (1 revisor mínimo).
   * ✅ **Check for linked work items:** Seleccionar **Required**.
   * ✅ **Check for comment resolution:** Seleccionar **Required**.
   * ✅ **Build Validation:** Haz clic en `+` (Add build policy):
     * **Build pipeline:** Selecciona el pipeline de tu repositorio (creado a partir de `azure-pipelines.yml`).
     * **Trigger:** Automatic.
     * **Policy requirement:** Required.

---

### Paso 5: Generar y Aprobar los Pull Requests (Puntos 4 y 5 de la Guía)
1. **Pull Request 1 (Feature a Develop):**
   * Crear PR desde `feature/HU-01-booking-service` hacia `develop`.
   * Vincular el Work Item `#1`.
   * Observar cómo se dispara el pipeline en Azure Pipelines.
   * Una vez el pipeline termine en verde y el revisor apruebe $\rightarrow$ Dar clic en **Complete**.
2. **Pull Request 2 (Develop a Integration - Punto 4):**
   * Crear PR desde `develop` hacia `integration`.
   * 📷 **Figura 4.1:** Captura de la creación del PR hacia `integration`.
   * 📷 **Figura 4.2:** Captura del PR aprobado con políticas en verde.
3. **Pull Request 3 (Integration a Main - Punto 5):**
   * Crear PR desde `integration` hacia `main`.
   * 📷 **Figura 5.1:** Captura del PR hacia `main`.
   * 📷 **Figura 5.2:** Captura del merge completado y el gráfico de red de ramas en Azure Repos.

---

### Paso 6: Capturas de las Validaciones Automáticas del Pipeline (Requisito Crítico)
En Azure DevOps, ve a **Pipelines** $\rightarrow$ **Runs** y abre la ejecución exitosa:
* 📷 **Figura 6.1:** Vista general de los 3 stages aprobados en verde (`SecurityGates`, `DependencySecurity`, `UnitTestsAndQuality`).
* 📷 **Figura 6.2:** Pestaña **Tests** dentro de la ejecución, mostrando 100% de tests aprobados (12/12).
* 📷 **Figura 6.3:** Pestaña **Code Coverage**, mostrando líneas y funciones $> 85\%$ (superando el umbral de 80%).
* 📷 **Figura 6.4:** Log del job `SecretScanning` mostrando `0 leaks found` con Gitleaks.
* 📷 **Figura 6.5:** Pestaña **Artifacts** con los reportes descargables de OWASP Dependency-Check.
* 📷 **Figura 6.6:** Sección de políticas en el PR mostrando el check de **Build Validation**.

---

### Paso 7: Consolidar y Exportar el Documento Final a PDF
1. Abre [`Taller_4_Arquitectura_Software_II_GigSyncLive.docx`](file:///c:/Users/Luxury/Downloads/Arquitectura%20Software%20II/Taller_4_Arquitectura_Software_II_GigSyncLive.docx) en Microsoft Word.
2. Reemplaza cada recuadro azul `📷 [EVIDENCIA - PEGAR CAPTURA AQUÍ]` pegando directamente la captura de pantalla correspondiente que tomaste en los pasos anteriores.
3. En Word, ve a **Archivo** $\rightarrow$ **Guardar como...** $\rightarrow$ Selecciona formato **PDF** (`Taller_4_Arquitectura_Software_II_GigSyncLive.pdf`).
4. Cargar el PDF en la plataforma académica del ITM antes de la fecha límite.
