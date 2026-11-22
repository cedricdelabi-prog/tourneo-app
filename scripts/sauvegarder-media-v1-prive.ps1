# Tourneo V1 : sauvegarde des vrais fichiers Storage, en local uniquement.
# A executer apres sauvegarder-v1-prive.ps1, depuis le PC du proprietaire.
# Ne modifie ni la base, ni les objets Supabase, ni les URLs publiques.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projet = 'gjtxlzhfqcecyfciyllc'
$racine = Join-Path $env:USERPROFILE 'Tourneo-sauvegardes-PRIVEES'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dossier = Join-Path $racine "Storage-V1-$stamp"
$ancienWorkdir = $env:SUPABASE_WORKDIR
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw 'Supabase CLI manquant. Installer et connecter Supabase CLI avant cet export.'
}
Write-Warning 'Sauvegarde privee : conserver les medias sur un disque chiffre, hors GitHub, Drive public et e-mail.'
Write-Warning 'Ce script telecharge seulement les fichiers du bucket tourneo-media. Il ne sauvegarde pas Auth, la base ni les autres buckets.'
Write-Host "Projet Supabase attendu : $projet"
$accord = Read-Host 'Saisir SAUVEGARDER pour copier les medias vers votre PC'
if ($accord -cne 'SAUVEGARDER') { Write-Host 'Annule.'; exit 0 }
New-Item -ItemType Directory -Path $dossier -Force | Out-Null
Push-Location -LiteralPath $dossier
$env:SUPABASE_WORKDIR = $dossier
try {
    & supabase init --yes
    if ($LASTEXITCODE -ne 0) { throw 'Initialisation Supabase echouee.' }
    & supabase link --project-ref $projet
    if ($LASTEXITCODE -ne 0) { throw 'Connexion au projet Supabase echouee.' }
    $fichierRef = Join-Path $dossier 'supabase\.temp\project-ref'
    if (-not (Test-Path -LiteralPath $fichierRef)) {
        throw 'Reference de projet introuvable : refuse de telecharger.'
    }
    $refLiee = (Get-Content -LiteralPath $fichierRef -Raw).Trim()
    if ($refLiee -cne $projet) {
        throw 'Projet cible incorrect : refuse de telecharger.'
    }
    $sortie = Join-Path $dossier 'tourneo-media'
    New-Item -ItemType Directory -Path $sortie -Force | Out-Null
    & supabase storage cp 'ss:///tourneo-media' $sortie --recursive --experimental --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'Echec de copie Storage. Archive incomplete, ne pas utiliser.'
    }
    $medias = @(Get-ChildItem -LiteralPath $sortie -File -Recurse)
    if ($medias.Count -lt 1) {
        throw 'Aucun fichier media sauvegarde. Le controle precedent attendait au moins un objet : arret.'
    }
    $empreintes = @()
    foreach ($media in $medias) {
        $cheminRelatif = $media.FullName.Substring($sortie.Length).TrimStart('\','/')
        $empreintes += @{
            fichier = $cheminRelatif
            octets = $media.Length
            sha256 = (Get-FileHash -LiteralPath $media.FullName -Algorithm SHA256).Hash
        }
    }
    @{
        projet = $projet
        dateControle = (Get-Date).ToString('o')
        restaurationValidee = $false
        contenuBinaireStorage = $true
        bucket = 'tourneo-media'
        fichiers = $empreintes
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $dossier 'controle-storage-hash.json') -Encoding UTF8

    # Test de lecture des fichiers apres export ; ce n'est PAS une restauration.
    foreach ($media in $empreintes) {
        $chemin = Join-Path $sortie $media.fichier
        $hash = (Get-FileHash -LiteralPath $chemin -Algorithm SHA256).Hash
        if ($hash -cne $media.sha256) { throw 'Empreinte media incorrecte. Archive non fiable.' }
    }
    Write-Host "Media locaux copies et controles : $($medias.Count) fichier(s)."
    Write-Host "Archive privee : $dossier"
    Write-Warning 'Completer par la sauvegarde SQL puis une restauration isolee validee. Ne pas communiquer les medias.'
} finally {
    Pop-Location
    $env:SUPABASE_WORKDIR = $ancienWorkdir
}
