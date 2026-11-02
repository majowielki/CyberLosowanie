<#
.SYNOPSIS
    Builds the app (API + UI) and deploys it to the Azure App Service.

.DESCRIPTION
    1. dotnet publish (Release) - this also builds the React UI into wwwroot
       (PublishSpa target in CyberLosowanie.csproj), so Node must be installed.
    2. Zips the output with forward-slash entry names. The App Service runs on
       Linux, and zips made by Windows PowerShell 5.1 tools (Compress-Archive,
       ZipFile.CreateFromDirectory) store "wwwroot\index.html"-style names that
       Linux treats as plain file names - the deployment then fails in rsync.
    3. az webapp deploy with --clean, so files from earlier deployments go away.

    Requires the Azure CLI, signed in (az login). App settings, the database
    migration and the portraits are one-off steps and are not touched here.

.EXAMPLE
    ./API/scripts/Deploy-Azure.ps1

.EXAMPLE
    # Build and zip only, without deploying:
    ./API/scripts/Deploy-Azure.ps1 -SkipDeploy
#>
param(
    [string]$ResourceGroup = 'rg-cyberlosowanie',
    [string]$AppName = 'cyberlosowanie-mm',
    [string]$WorkDir = (Join-Path ([System.IO.Path]::GetTempPath()) 'cyberlosowanie-deploy'),
    [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot '..\src\CyberLosowanie'
$publishDir = Join-Path $WorkDir 'app'
$zipPath = Join-Path $WorkDir 'app.zip'

if (-not $SkipDeploy) {
    # Fail before the build, not after it, when the CLI is not signed in.
    $account = az account show --query name -o tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "The Azure CLI is not signed in. Run 'az login' first."
    }
    Write-Host "Azure subscription: $account"
}

# A fresh output folder: leftovers of an older build would be deployed too.
if (Test-Path $WorkDir) {
    Remove-Item $WorkDir -Recurse -Force -Confirm:$false
}
New-Item -ItemType Directory -Path $WorkDir | Out-Null

Write-Host 'Publishing (API + UI)...'
dotnet publish $project -c Release -o $publishDir
if ($LASTEXITCODE -ne 0) {
    throw 'dotnet publish failed.'
}
if (-not (Test-Path (Join-Path $publishDir 'wwwroot\index.html'))) {
    throw 'The publish output has no wwwroot\index.html - the UI was not built.'
}

Write-Host 'Zipping...'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    Get-ChildItem $publishDir -Recurse -File | ForEach-Object {
        $entryName = $_.FullName.Substring($publishDir.Length + 1).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, 'Optimal')
    }
}
finally {
    $zip.Dispose()
}
Write-Host ("Package: {0} ({1:N1} MB)" -f $zipPath, ((Get-Item $zipPath).Length / 1MB))

if ($SkipDeploy) {
    Write-Host 'Skipping the deployment (-SkipDeploy).'
    return
}

Write-Host "Deploying to $AppName ($ResourceGroup)..."
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $zipPath --type zip --clean true
if ($LASTEXITCODE -ne 0) {
    throw "The deployment failed. Details: az webapp log deployment show -g $ResourceGroup -n $AppName"
}

$hostName = az webapp show --resource-group $ResourceGroup --name $AppName --query defaultHostName -o tsv
Write-Host "Done: https://$hostName"
