# Test du script avec une CLI fictive : aucun acces reseau ni vraie donnee.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$temp=if($env:RUNNER_TEMP){$env:RUNNER_TEMP}else{[IO.Path]::GetTempPath()}
$base=Join-Path $temp ('tourneo-backup-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $base -Force | Out-Null
$ancienProfile=$env:USERPROFILE
$ancienWorkdir=$env:SUPABASE_WORKDIR
$racine=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$global:MockTourneoRef='gjtxlzhfqcecyfciyllc'
$global:MockAuthMissing=$false
$global:MockHistory=New-Object System.Collections.Generic.List[string]
function global:Read-Host { param([string]$Prompt); return 'SAUVEGARDER' }
function global:supabase {
    $l=@($args)
    $global:MockHistory.Add(($l -join ' '))
    if($l[0] -eq 'init') {
        $cfg=Join-Path (Get-Location) 'supabase'
        New-Item -ItemType Directory -Path $cfg -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $cfg 'config.toml') -Value 'project_id = "test"'
    } elseif($l[0] -eq 'link') {
        if((Get-Location).Path -eq $racine){throw 'Le depot reel ne doit jamais etre relie.'}
        $f=Join-Path (Get-Location) 'supabase\.temp'
        New-Item -ItemType Directory -Path $f -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $f 'project-ref') -Value $global:MockTourneoRef
    } elseif($l[0] -eq 'db' -and $l[1] -eq 'dump') {
        $idx=[array]::IndexOf($l,'-f')
        if($idx -lt 0 -or $idx -eq $l.Length-1){throw 'Fichier de sortie manquant.'}
        $sortie=$l[$idx+1]
        $content="-- Fictive, aucune donnee reelle." + [Environment]::NewLine
        if($sortie -like '*04-data-public.sql') {
            $content+='COPY public.profiles (id, display_name) FROM stdin;' + [Environment]::NewLine
            $content+='COPY public.tournois (id, nom) FROM stdin;' + [Environment]::NewLine
        }
        if($sortie -like '*05-data-auth.sql') {
            $content+='COPY auth.users (id, email) FROM stdin;' + [Environment]::NewLine
            if(-not $global:MockAuthMissing) {
                $content+='COPY auth.identities (id, user_id) FROM stdin;' + [Environment]::NewLine
            }
        }
        Set-Content -LiteralPath $sortie -Value $content
    } else {
        throw "Commande Supabase non prevue : $($l -join ' ')"
    }
    $global:LASTEXITCODE=0
}
try {
    $env:USERPROFILE=Join-Path $base 'profil-normal'
    $env:SUPABASE_WORKDIR='dossier-v2-original'
    New-Item -ItemType Directory -Path $env:USERPROFILE -Force | Out-Null
    $origine=Get-Location
    & (Join-Path $racine 'scripts/sauvegarder-v1-prive.ps1')
    if((Get-Location).Path -ne $origine.Path){throw 'Le dossier de travail a change.'}
    if($env:SUPABASE_WORKDIR -ne 'dossier-v2-original'){throw 'Le workdir V2 a change.'}
    $exports=@(Get-ChildItem -Path (Join-Path $env:USERPROFILE 'Tourneo-sauvegardes-PRIVEES') -Recurse -File)
    if(@($exports | Where-Object {$_.Name -match '^\d{2}-.*\.sql$'}).Count -ne 6){throw 'Six exports attendus.'}
    if(@($exports | Where-Object {$_.Name -eq 'controle-hash.json'}).Count -ne 1){throw 'Sommes de controle absentes.'}
    if(@($global:MockHistory | Where-Object {$_ -match '^db dump --linked'}).Count -ne 6){throw 'Six commandes dump uniquement.'}
    if(@($global:MockHistory | Where-Object {$_ -match 'db (reset|push)'}).Count -gt 0){throw 'Commande dangereuse.'}

    $global:MockTourneoRef='kmjfmjhdnokkaiolxiin'
    $env:USERPROFILE=Join-Path $base 'profil-mauvais-lien'
    New-Item -ItemType Directory -Path $env:USERPROFILE -Force | Out-Null
    $avant=$global:MockHistory.Count
    $refuse=$false
    try { & (Join-Path $racine 'scripts/sauvegarder-v1-prive.ps1') } catch {$refuse=$true}
    if(-not $refuse){throw 'Cible inattendue acceptee.'}
    $commandesApres=@($global:MockHistory | Select-Object -Skip $avant)
    if(@($commandesApres | Where-Object {$_ -match '^db dump'}).Count -ne 0){throw 'Export lance vers mauvaise cible.'}
    if($env:SUPABASE_WORKDIR -ne 'dossier-v2-original'){throw 'Workdir non restaure apres echec.'}

    $global:MockTourneoRef='gjtxlzhfqcecyfciyllc'
    $global:MockAuthMissing=$true
    $env:USERPROFILE=Join-Path $base 'profil-auth-incomplet'
    New-Item -ItemType Directory -Path $env:USERPROFILE -Force | Out-Null
    $refuse=$false
    try { & (Join-Path $racine 'scripts/sauvegarder-v1-prive.ps1') } catch {$refuse=$true}
    if(-not $refuse){throw 'Authentification incomplete acceptee.'}
    $hashes=@(Get-ChildItem -Path $env:USERPROFILE -Recurse -Filter 'controle-hash.json')
    if($hashes.Count -ne 0){throw 'Une archive incomplete a ete declaree valide.'}
    Write-Host 'Sauvegarde V1 fictive : fichiers locaux, lien V2 intact, mauvaise cible et Auth incomplete refusees : OK'
} finally {
    $env:USERPROFILE=$ancienProfile
    $env:SUPABASE_WORKDIR=$ancienWorkdir
    Remove-Item Function:\supabase -ErrorAction SilentlyContinue
    Remove-Item Function:\Read-Host -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue
}
