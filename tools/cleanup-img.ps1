<#  cleanup-img.ps1  —  Sortie-Guide
    Retire les doublons raster (PNG/JPG/JPEG) du dossier img\ dont la version .webp
    existe DÉJÀ. Sécurité :
      - un fichier n'est retiré QUE si son .webp correspondant est présent ;
      - suppression vers la CORBEILLE Windows (récupérable), jamais un delete définitif.
    Lance-le d'un double-clic (clic droit > Exécuter avec PowerShell) ou :
      powershell -ExecutionPolicy Bypass -File .\cleanup-img.ps1

    À SAVOIR : aujourd'hui il ne trouve rien à retirer, et c'est normal — img\ ne
    contient plus que des .webp et les icônes de l'app, qui n'ont pas de jumeau.
    Il redevient utile le jour où tu ré-exportes les vignettes de mobs depuis le
    PSD : c'est ce que sert la table ci-dessous, qui rattache les exports bruts
    numérotés (_0000_Aminon.png) au .webp qui porte un autre nom. Ne la vide pas
    en la croyant morte.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic

# dossier img : depuis tools/ il est un cran au-dessus ; sinon à côté du
# script, ou le script est déjà dedans. Sans le cran au-dessus, le script
# balaie tools/ et annonce « rien à retirer » sans avoir vu la bonne image.
$img = @(
  (Join-Path $PSScriptRoot '..\img'),
  (Join-Path $PSScriptRoot 'img'),
  $PSScriptRoot
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$img = (Resolve-Path $img).Path

function Recycle([string]$p){
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin')
}

# exports bruts numérotés : leur .webp porte un autre nom (mob-*.webp)
$rawMap = @{
  '_0000_Aminon.png'    = 'mob-aminon.webp'
  '_0001_Gartell.png'   = 'mob-gartell.webp'
  '_0002_leshonn.png'   = 'mob-leshonn.webp'
  '_0003_Triboulex.png' = 'mob-triboulex.webp'
  '_0004_Skomora.png'   = 'mob-skomora.webp'
  '_0005_Dhartok.png'   = 'mob-dhartok.webp'
  '_0006_Ghatjot.png'   = 'mob-ghatjot.webp'
  '_0007_Aita.png'      = 'mob-aita.webp'
  '_0008_Degei.png'     = 'mob-degei.webp'
  '_0009_Umbril.png'    = 'mob-umbril.webp'
  '_0010_Ghost.png'     = 'mob-ghost.webp'
  '_0011_Fomor.png'     = 'mob-fomor.webp'
  '_0012_Acuex.png'     = 'mob-acuex.webp'
}

$removed = New-Object System.Collections.Generic.List[string]
$kept    = New-Object System.Collections.Generic.List[string]

Get-ChildItem -Path (Join-Path $img '*') -Include *.png,*.jpg,*.jpeg -File | ForEach-Object {
  $f = $_
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $webp = Join-Path $img ($base + '.webp')
  $target = $null
  if (Test-Path $webp) { $target = $webp }
  elseif ($rawMap.ContainsKey($f.Name)) {
    $mw = Join-Path $img $rawMap[$f.Name]
    if (Test-Path $mw) { $target = $mw }
  }
  if ($target) { Recycle $f.FullName; $removed.Add($f.Name) }
  else         { $kept.Add($f.Name) }
}

Write-Host ""
Write-Host ("Envoyes a la corbeille : {0}" -f $removed.Count) -ForegroundColor Green
$removed | Sort-Object | ForEach-Object { Write-Host "  - $_" }
if ($kept.Count) {
  Write-Host ""
  Write-Host ("Conserves (aucun .webp correspondant) : {0}" -f $kept.Count) -ForegroundColor Yellow
  $kept | Sort-Object | ForEach-Object { Write-Host "  . $_" }
}
Write-Host ""
Write-Host "Termine. Les fichiers sont dans la corbeille si tu veux revenir en arriere." -ForegroundColor Cyan
