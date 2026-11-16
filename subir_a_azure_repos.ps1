<#
  Sube el repositorio local y sus 4 ramas a Azure Repos.
  Uso (en PowerShell, dentro de la carpeta del proyecto):
    .\subir_a_azure_repos.ps1 -RepoUrl "https://dev.azure.com/<ORG>/GigSync-Live-DevOps/_git/GigSync-Live-DevOps"
  La URL se copia en Azure Repos -> Files -> botón "Clone".
#>
param([Parameter(Mandatory = $true)][string]$RepoUrl)

$ErrorActionPreference = "Stop"

if (git remote | Select-String -Quiet "^origin$") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

# main primero (rama por defecto del repo), luego el resto
foreach ($b in @("main", "integration", "develop", "feature/HU-01-booking-service")) {
    Write-Host "==> Subiendo rama $b" -ForegroundColor Cyan
    git push -u origin $b
}

Write-Host ""
Write-Host "Listo. Siguiente paso: Pipelines -> New pipeline -> Azure Repos Git -> Existing Azure Pipelines YAML file" -ForegroundColor Green
Write-Host "Elegir rama 'feature/HU-01-booking-service' y ruta '/azure-pipelines.yml' (en main todavía no existe el YAML)." -ForegroundColor Green
