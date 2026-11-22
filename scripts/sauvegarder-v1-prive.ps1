# Tourneo V1 - sauvegarde locale MANUELLE, lecture seule de la production.
# Fonctionne dans Windows PowerShell 5.1+ avec Supabase CLI et Docker installes.
# Ce script n'exporte jamais des donnees vers GitHub ni un service tiers.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$projet='gjtxlzhfqcecyfciyllc'
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$racine=Join-Path $env:USERPROFILE 'Tourneo-sauvegardes-PRIVEES'
$dossier=Join-Path $racine "V1-$stamp"

function Executer-Supabase([string[]] $parametres) {
    & supabase @parametres
    if ($LASTEXITCODE -ne 0) { throw "Echec de l'export Supabase. Le dossier incomplet doit etre verifie." }
}
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw 'Supabase CLI absent. Installer le CLI et Docker avant de lancer cet export.'
}
Write-Host 'TOURNEO V1 : sauvegarde privee SANS modification de la base.'
Write-Host "Projet autorise : $projet"
Write-Host "Destination locale : $dossier"
Write-Warning 'Les fichiers contiendront des donnees personnelles et des informations Auth tres sensibles.'
Write-Warning 'Utiliser un volume chiffre. Ne rien envoyer sur GitHub, ChatGPT, Drive public ou par e-mail.'
Write-Warning "L'export n'est PAS une preuve de restauration : une repetition isolee restera obligatoire."
$accord=Read-Host 'Saisir SAUVEGARDER pour continuer'
if ($accord -cne 'SAUVEGARDER') { Write-Host 'Operation annulee.'; exit 0 }
New-Item -ItemType Directory -Path $dossier -Force | Out-Null
# Isoler la liaison CLI pour eviter de relier le depot V2 a la V1 par erreur.
$ancienWorkdir=$env:SUPABASE_WORKDIR
Push-Location -LiteralPath $dossier
$env:SUPABASE_WORKDIR=$dossier
try {
    Executer-Supabase ([string[]]@('init','--yes'))
    Executer-Supabase ([string[]]@('link','--project-ref',$projet))
    $lienLocal=Join-Path $dossier 'supabase\.temp\project-ref'
    if(-not (Test-Path -LiteralPath $lienLocal)) {
        throw 'Projet lie non verifiable : archive refusee.'
    }
    $refLiee=(Get-Content -LiteralPath $lienLocal -Raw).Trim()
    if($refLiee -cne $projet) {
        throw 'ERREUR : le projet Supabase lie ne correspond pas a la V1 autorisee.'
    }
    $operations=@(
        @{ nom='01-roles.sql'; args=@('db','dump','--linked','--role-only') },
        @{ nom='02-schema-public.sql'; args=@('db','dump','--linked','--schema','public') },
        @{ nom='03-schema-auth-storage.sql'; args=@('db','dump','--linked','--schema','auth,storage') },
        @{ nom='04-data-public.sql'; args=@('db','dump','--linked','--schema','public','--data-only','--use-copy') },
        @{ nom='05-data-auth.sql'; args=@('db','dump','--linked','--schema','auth','--data-only','--use-copy') },
        @{ nom='06-data-storage.sql'; args=@('db','dump','--linked','--schema','storage','--data-only','--use-copy') }
    )
    foreach($operation in $operations) {
        $sortie=Join-Path $dossier $operation.nom
        Executer-Supabase ([string[]]($operation.args + @('-f',$sortie)))
        $fichier=Get-Item -LiteralPath $sortie -ErrorAction Stop
        if($fichier.Length -lt 20) { throw "Export vide : $($operation.nom)" }
        Write-Host "OK : $($operation.nom), $($fichier.Length) octets"
    }
    # Presence des commandes COPY, pas encore preuve d'une restauration.
    $copiesAttendues=@(
        @{nom='04-data-public.sql';schema='public';table='profiles'},
        @{nom='04-data-public.sql';schema='public';table='tournois'},
        @{nom='05-data-auth.sql';schema='auth';table='users'},
        @{nom='05-data-auth.sql';schema='auth';table='identities'}
    )
    foreach($copie in $copiesAttendues) {
        $schema=[regex]::Escape($copie.schema)
        $table=[regex]::Escape($copie.table)
        $motif='(?i)^\s*COPY\s+"?'+$schema+'"?\."?'+$table+'"?\s*\('
        $chemin=Join-Path $dossier $copie.nom
        if(-not (Select-String -LiteralPath $chemin -Pattern $motif -Quiet)) {
            throw "Export incomplet : table $($copie.schema).$($copie.table) absente de $($copie.nom)."
        }
    }
} finally {
    Pop-Location
    $env:SUPABASE_WORKDIR=$ancienWorkdir
}
$empreintes=@()
foreach($operation in $operations) {
    $chemin=Join-Path $dossier $operation.nom
    $empreintes+=@{
        fichier=$operation.nom
        octets=(Get-Item -LiteralPath $chemin).Length
        sha256=(Get-FileHash -LiteralPath $chemin -Algorithm SHA256).Hash
    }
}
@{
    sourceProjet=$projet
    dateControle=(Get-Date).ToString('o')
    fichierRestaurationValide=$false
    commentaire='Archive brute : pas de restauration repetee, pas de preuve de migration'
    fichiers=$empreintes
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $dossier 'controle-hash.json') -Encoding UTF8
# Avant d'annoncer l'archive, controler les empreintes ET la presence effective des lignes.
& (Join-Path $PSScriptRoot 'verifier-archive-v1.ps1') -Dossier $dossier
Write-Host "Archive SQL creee : $dossier (media Storage a sauvegarder separement)."
Write-Warning 'ATTENTION : les fichiers binaires Supabase Storage ne sont PAS inclus dans un db dump. Le 22/11/2026, un fichier etait present dans tourneo-media. Verifier et sauvegarder TOUS les medias actuels, hors depot, sur un disque chiffre, avant de declarer cette sauvegarde complete.'
Write-Warning 'Proteger et conserver cette archive dans un emplacement chiffre, puis realiser une restauration isolee.'
Write-Warning "Ne JAMAIS executer 'supabase db reset --linked' ou une migration V2 sur la V1."
