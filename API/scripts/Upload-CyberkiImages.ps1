<#
.SYNOPSIS
    Resizes the generated cyberek portraits and uploads them to Blob Storage.

.DESCRIPTION
    Every cyberek has three portraits: santa (picking yourself), caricature
    (the draw reveal) and child (the wishlist — a letter to Santa). The API
    serves them from the private "cyberki-images" container as
    "{cyberekId}/{kind}.jpg" (CyberekImageConstants), so this script maps the
    file names to cyberek ids, shrinks the 2048 px originals to web size and
    uploads them, overwriting what is there.

    The originals are photos of real people and stay out of git (.gitignore);
    keep them locally in -SourceRoot.

    Requires the Azure CLI (az). Local dev: start Azurite first, e.g.
    azurite --location "$env:USERPROFILE\.azurite"

.EXAMPLE
    ./API/scripts/Upload-CyberkiImages.ps1

.EXAMPLE
    # Real Azure later (connection string from the portal / Key Vault):
    ./API/scripts/Upload-CyberkiImages.ps1 -ConnectionString $connectionString
#>
param(
    [string]$SourceRoot = (Join-Path $PSScriptRoot '..\..\UI\CyberLosowanie.UI\src\assets'),
    # Azurite well-known development account (public, documented by Microsoft).
    [string]$ConnectionString = 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;',
    [string]$Container = 'cyberki-images',
    [int]$Size = 800,
    [int]$Quality = 85
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# File-name suffix -> cyberek id; must match the seed in ApplicationDbContext.
$cyberki = [ordered]@{
    'Michal_M' = 1; 'Kornelia' = 2; 'Ola' = 3; 'Daria' = 4
    'Asia' = 5; 'Filip' = 6; 'Marek' = 7; 'Michal_K' = 8
    'Karol' = 9; 'Natalia' = 10; 'Pawel' = 11; 'Wiktoria' = 12
}

# Image kind -> source folder and file-name prefix.
$kinds = [ordered]@{
    'santa'      = @{ Folder = 'mikolaje';   Prefix = 'Mikolaj' }
    'caricature' = @{ Folder = 'karykatury'; Prefix = 'Karykatura' }
    'child'      = @{ Folder = 'dzieci';     Prefix = 'Dziecko' }
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

function Resize-Portrait([string]$source, [string]$target) {
    $original = [System.Drawing.Image]::FromFile($source)
    try {
        $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        # Centre-crop to a square first, so non-square sources are not stretched.
        $side = [Math]::Min($original.Width, $original.Height)
        $crop = New-Object System.Drawing.Rectangle ([int](($original.Width - $side) / 2)), ([int](($original.Height - $side) / 2)), $side, $side
        $graphics.DrawImage($original, (New-Object System.Drawing.Rectangle 0, 0, $Size, $Size), $crop, [System.Drawing.GraphicsUnit]::Pixel)
        $bitmap.Save($target, $jpegCodec, $encoderParams)
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        $original.Dispose()
    }
}

$workDir = Join-Path ([System.IO.Path]::GetTempPath()) "cyberki-images-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $workDir | Out-Null

try {
    # Check every source up front, so a missing file never leaves a half-updated set.
    $missing = foreach ($kind in $kinds.Keys) {
        foreach ($name in $cyberki.Keys) {
            $path = Join-Path $SourceRoot "$($kinds[$kind].Folder)\$($kinds[$kind].Prefix)_$name.jpg"
            if (-not (Test-Path $path)) { $path }
        }
    }
    if ($missing) {
        throw "Missing source images:`n$($missing -join "`n")"
    }

    foreach ($kind in $kinds.Keys) {
        foreach ($name in $cyberki.Keys) {
            $id = $cyberki[$name]
            $source = Join-Path $SourceRoot "$($kinds[$kind].Folder)\$($kinds[$kind].Prefix)_$name.jpg"
            $resized = Join-Path $workDir "$id-$kind.jpg"
            Resize-Portrait $source $resized
        }
    }

    az storage container create --name $Container --connection-string $ConnectionString --only-show-errors | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not create container '$Container' (is Azurite running?)." }

    foreach ($kind in $kinds.Keys) {
        foreach ($name in $cyberki.Keys) {
            $id = $cyberki[$name]
            $resized = Join-Path $workDir "$id-$kind.jpg"
            az storage blob upload --container-name $Container --name "$id/$kind.jpg" --file $resized `
                --content-type 'image/jpeg' --overwrite --no-progress --connection-string $ConnectionString --only-show-errors | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Upload of $id/$kind.jpg failed." }
            $kb = [Math]::Round((Get-Item $resized).Length / 1KB)
            Write-Host "$id/$kind.jpg  <- $($kinds[$kind].Prefix)_$name.jpg ($kb KB)"
        }
    }
    Write-Host "Uploaded $($kinds.Count * $cyberki.Count) images to '$Container'."
}
finally {
    Remove-Item -Recurse -Force $workDir
}
