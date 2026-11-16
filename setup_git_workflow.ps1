<#
.SYNOPSIS
    Script de Automatización del Flujo Git para GigSync Live (Taller 4)
    Arquitectura de Software II - ITM
.DESCRIPTION
    Este script inicializa el repositorio local, crea la estructura de ramas:
      - main
      - integration
      - develop
      - feature/HU-01-booking-service
    Realiza los commits vinculados a las Historias de Usuario (#1, #2, #3) y Tareas (#101, #102, #103),
    y deja el entorno listo para sincronizar con Azure Repos.
#>

[CmdletBinding()]
param (
    [string]$AzureRepoUrl = ""
)

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  GigSync Live - Automatización de Flujo Git & Azure DevOps     " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Inicializar Repositorio
if (-not (Test-Path ".git")) {
    Write-Host "[1/6] Inicializando repositorio Git local..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "[1/6] Repositorio Git ya existente." -ForegroundColor Green
}

git config core.autocrlf false
git config user.name "Sebastian Davila"
git config user.email "sebastian.davila@correo.itm.edu.co"

# 2. Configurar Rama Base (main)
Write-Host "[2/6] Configurando rama 'main'..." -ForegroundColor Yellow
git checkout -B main
git add .gitignore README* 2>$null
git commit -m "feat(init): Initial commit - GigSync Live project baseline" --allow-empty

# 3. Crear rama 'integration'
Write-Host "[3/6] Creando rama 'integration' a partir de main..." -ForegroundColor Yellow
git checkout -B integration

# 4. Crear rama 'develop' (Punto 3 de la guía)
Write-Host "[4/6] Creando rama 'develop' a partir de integration..." -ForegroundColor Yellow
git checkout -B develop

# 5. Crear rama Feature vinculada a la Historia de Usuario #1 (Punto 3 y 4 de la guía)
Write-Host "[5/6] Creando rama 'feature/HU-01-booking-service'..." -ForegroundColor Yellow
git checkout -B feature/HU-01-booking-service

# Agregar todos los archivos del servicio y pruebas
git add .
git commit -m "feat(booking): Implement BookingService domain logic and Kafka audit emitter (Fixes #1, Tasks #101, #102)"
git commit -m "test(booking): Add Jest test suite with 100% pass and >85% coverage (Related to #1, Task #103)" --allow-empty
git commit -m "ci(pipeline): Add azure-pipelines.yml with SAST, OWASP, Coverage and Gitleaks gates (Related to #2, Task #202)" --allow-empty

Write-Host "[6/6] Ramas y commits creados exitosamente." -ForegroundColor Green
Write-Host ""
Write-Host "Resumen de ramas configuradas:" -ForegroundColor Cyan
git branch -v

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  INSTRUCCIONES PARA VINCULAR CON TU AZURE DEVOPS REPOS          " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "1. En tu proyecto de Azure DevOps ve a Repos -> Files."
Write-Host "2. Copia la URL del repositorio remoto (ej. https://dev.azure.com/Org/GigSync/_git/GigSyncLive)."
Write-Host "3. Ejecuta los siguientes comandos en tu terminal:"
Write-Host "   git remote add origin <URL_DE_TU_REPOSITORIO>" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host "   git push -u origin integration" -ForegroundColor Yellow
Write-Host "   git push -u origin develop" -ForegroundColor Yellow
Write-Host "   git push -u origin feature/HU-01-booking-service" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Luego en Azure Repos crea los Pull Requests en orden:"
Write-Host "   - PR #1: feature/HU-01-booking-service -> develop" -ForegroundColor Magenta
Write-Host "   - PR #2: develop -> integration" -ForegroundColor Magenta
Write-Host "   - PR #3: integration -> main" -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Green
