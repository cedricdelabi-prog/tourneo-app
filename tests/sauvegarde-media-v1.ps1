# Exerce la vraie sauvegarde Storage avec une CLI fictive, sans appel reseau.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$originalProfile=$env:USERPROFILE
$originalWorkdir=$env:SUPABASE_WORKDIR
$originalExitCode=$global:LASTEXITCODE
$temp=if($env:RUNNER_TEMP){$env:RUNNER_TEMP}else{[IO.Path]::GetTempPath()}
$base=Join-Path $temp ('tourneo-media-test-'+[guid]::NewGuid().ToString('N'))
$global:MediaProjetRef='gjtxlzhfqcecyfciyllc'
$global:MediaVides=$false
$global:MediaHistorique=New-Object System.Collections.Generic.List[string]
$racine=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function global:Read-Host { param([string]$Prompt); return 'SAUVEGARDER' }
function global:supabase {
    $cmd=@($args)
    $global:MediaHistorique.Add(($cmd -join ' '))
    $global:LASTEXITCODE=0
    if($cmd[0] -eq 'init'){
        New-Item -ItemType Directory -Path (Join-Path (Get-Location) 'supabase') -Force | Out-Null
    } elseif($cmd[0] -eq 'link'){
        if((Get-Location).Path -eq $racine){throw 'Depot reel ne doit pas etre lie a la V1.'}
        $out=Join-Path (Get-Location) 'supabase\.temp'
        New-Item -ItemType Directory -Path $out -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $out 'project-ref') -Value $global:MediaProjetRef
    } elseif($cmd[0] -eq 'storage' -and $cmd[1] -eq 'cp'){
        if($cmd[2] -cne 'ss:///tourneo-media'){throw 'Mauvais bucket.'}
        if(-not ($cmd -contains '--recursive') -or -not ($cmd -contains '--experimental') -or -not ($cmd -contains '--linked')){
            throw 'Copie Storage hors du projet lie ou options de lecture manquantes.'
        }
        if(-not $global:MediaVides){
            $out=Join-Path $cmd[3] 'dossier'
            New-Item -ItemType Directory -Path $out -Force | Out-Null
            [IO.File]::WriteAllBytes((Join-Path $out 'test.png'),[byte[]](1,2,3,4,5,6,7))
        }
    } else {
        throw 'Commande Supabase non autorisee dans le test.'
    }
}
try {
    $env:USERPROFILE=$base
    New-Item -ItemType Directory -Path $base -Force | Out-Null

    & (Join-Path $racine 'scripts/sauvegarder-media-v1-prive.ps1')
    $creees=@(Get-ChildItem -LiteralPath (Join-Path $base 'Tourneo-sauvegardes-PRIVEES') -Directory -Filter 'Storage-V1-*')
    if($creees.Count -ne 1){throw 'Un dossier media complet est attendu.'}
    $manifest=Get-Content -LiteralPath (Join-Path $creees[0].FullName 'controle-storage-hash.json') -Raw | ConvertFrom-Json
    if($manifest.projet -cne 'gjtxlzhfqcecyfciyllc'){throw 'Mauvaise cible declaree.'}
    if($manifest.restaurationValidee -ne $false){throw 'Une restauration non testee ne doit pas etre validee.'}
    if(@($manifest.fichiers).Count -ne 1){throw 'Fichier media attendu manquant.'}
    $file=Join-Path (Join-Path $creees[0].FullName 'tourneo-media') $manifest.fichiers[0].fichier
    if(-not (Test-Path -LiteralPath $file)){throw 'Media non sauvegarde.'}
    if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -cne $manifest.fichiers[0].sha256){
        throw 'Empreinte incorrecte.'
    }
    if(@($global:MediaHistorique | Where-Object {$_ -match '^storage cp '}).Count -ne 1){
        throw 'La commande Storage doit etre uniquement une copie.'
    }

    # La sauvegarde doit refuser de lire un projet different.
    $global:MediaProjetRef='test-mauvais-projet'
    $avant=@($global:MediaHistorique | Where-Object {$_ -match '^storage cp '}).Count
    $refuse=$false
    try { & (Join-Path $racine 'scripts/sauvegarder-media-v1-prive.ps1') } catch { $refuse=$true }
    if(-not $refuse){throw 'Un projet incorrect a ete accepte.'}
    if(@($global:MediaHistorique | Where-Object {$_ -match '^storage cp '}).Count -ne $avant){
        throw 'Un mauvais projet a recu une commande Storage.'
    }

    # Une copie Storage vide ne peut pas produire un manifeste valide.
    $global:MediaProjetRef='gjtxlzhfqcecyfciyllc'
    $global:MediaVides=$true
    $refuse=$false
    try { & (Join-Path $racine 'scripts/sauvegarder-media-v1-prive.ps1') } catch { $refuse=$true }
    if(-not $refuse){throw 'Une sauvegarde media vide a ete acceptee.'}

    Write-Host 'Tourneo Storage : copie privee simulee, refus mauvaise cible et archive vide : OK'
} finally {
    $env:USERPROFILE=$originalProfile
    $env:SUPABASE_WORKDIR=$originalWorkdir
    $global:LASTEXITCODE=$originalExitCode
    Remove-Item Function:\supabase -ErrorAction SilentlyContinue
    Remove-Item Function:\Read-Host -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue
}
