# Tourneo V1 - sauvegarde SQL privee via le pooler IPv4 Supabase.
# Lecture seule : aucun DROP, RESET, PUSH ni migration. NE PROUVE PAS la restauration.
# Usage volontaire et local sur Windows avec Docker Desktop. NE PAS executer en CI avec une vraie base.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projet = 'gjtxlzhfqcecyfciyllc'
$pooler = 'aws-0-eu-west-1.pooler.supabase.com'
$utilisateur = 'postgres.' + $projet
$image = 'public.ecr.aws/supabase/postgres:17.6.1.147'
$racine = Join-Path $env:USERPROFILE 'Tourneo-sauvegardes-PRIVEES'
$dossier = Join-Path $racine ('V1-IPv4-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop requis.' }
Write-Host "Projet de production lu uniquement : $projet"
Write-Host "Dossier local prive : $dossier"
Write-Warning 'Le dossier contiendra des donnees Auth sensibles et des mots de passe haches. Disque chiffre obligatoire. Ne pas partager les fichiers.'
Write-Warning 'Cet export ne sauvegarde PAS les images binaires Storage et ne valide PAS la restauration.'
$accord = Read-Host 'Saisir SAUVEGARDER pour commencer'
if ($accord -cne 'SAUVEGARDER') { Write-Host 'Annule sans operation.'; exit 0 }
if (Test-Path -LiteralPath $dossier) { throw 'Destination deja existante : refus ecrasement.' }
New-Item -ItemType Directory -Path $dossier -Force | Out-Null
$motDePasse = Read-Host 'Mot de passe PostgreSQL Tourneo (masque)' -AsSecureString
try {
    # Le mot de passe ne figure ni dans la ligne de commande, ni dans GitHub.
    $env:PGPASSWORD = (New-Object System.Net.NetworkCredential('', $motDePasse)).Password
    $commun = @('--rm', '--mount', "type=bind,source=$dossier,target=/backup", '-e', 'PGPASSWORD')
    function Executer-Export([string] $outil, [string[]] $options, [string] $nom) {
        $cible = Join-Path $dossier $nom
        $argsDocker = @($commun) + @('--entrypoint', $outil, $image) + @($options) + @('-f', "/backup/$nom")
        & docker @argsDocker
        if ($LASTEXITCODE -ne 0) { throw "Export echoue : $nom. Archive INCOMPLETE." }
        $fichier = Get-Item -LiteralPath $cible -ErrorAction Stop
        if ($fichier.Length -lt 20) { throw "Export trop petit : $nom. Archive INCOMPLETE." }
        Write-Host "Export termine : $nom ($($fichier.Length) octets)"
    }
    $connexion = @('-h', $pooler, '-p', '5432', '-U', $utilisateur)
    Executer-Export 'pg_dumpall' ($connexion + @('-l', 'postgres', '--roles-only')) '01-roles.sql'
    $base = $connexion + @('-d', 'postgres', '--no-owner', '--no-privileges')
    Executer-Export 'pg_dump' ($base + @('--schema=public', '--schema-only')) '02-schema-public.sql'
    Executer-Export 'pg_dump' ($base + @('--schema=auth', '--schema-only')) '03-schema-auth.sql'
    Executer-Export 'pg_dump' ($base + @('--schema=storage', '--schema-only')) '03-schema-storage.sql'
    Executer-Export 'pg_dump' ($base + @('--schema=public', '--data-only')) '04-data-public.sql'
    Executer-Export 'pg_dump' ($base + @('--schema=auth', '--data-only')) '05-data-auth.sql'
    Executer-Export 'pg_dump' ($base + @('--schema=storage', '--data-only')) '06-data-storage.sql'
    foreach ($requis in @(
        @{f='04-data-public.sql';s='public';t='profiles'},
        @{f='04-data-public.sql';s='public';t='tournois'},
        @{f='05-data-auth.sql';s='auth';t='users'},
        @{f='05-data-auth.sql';s='auth';t='identities'}
    )) {
        $chemin = Join-Path $dossier $requis.f
        $motif = '(?i)^\s*COPY\s+"?' + $requis.s + '"?\."' + $requis.t + '"?\s*\('
        if (-not (Select-String -LiteralPath $chemin -Pattern $motif -Quiet)) {
            throw "Table absente des donnees : $($requis.s).$($requis.t). Archive INCOMPLETE."
        }
    }
    $manifest = @()
    foreach ($fichier in @(Get-ChildItem -LiteralPath $dossier -Filter '*.sql' -File)) {
        $manifest += @{
            nom = $fichier.Name
            octets = $fichier.Length
            sha256 = (Get-FileHash -LiteralPath $fichier.FullName -Algorithm SHA256).Hash
        }
    }
    if ($manifest.Count -ne 7) { throw 'Sept fichiers SQL attendus. Archive INCOMPLETE.' }
    @{
        projet = $projet
        date = (Get-Date).ToString('o')
        methode = 'pg_dump et pg_dumpall via session pooler IPv4'
        nombreFichiersSql = 7
        restaurationValidee = $false
        mediasBinairesInclus = $false
        fichiers = $manifest
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $dossier 'controle-hash-ipv4.json') -Encoding UTF8
    Write-Host "Sauvegarde SQL creee : $dossier"
    Write-Warning 'AUCUNE preuve de restauration. Sauvegarder les fichiers Storage et tester une restauration Supabase isolee avant V2.'
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $motDePasse.Dispose()
}
