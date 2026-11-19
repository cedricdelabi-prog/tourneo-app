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
# La liaison ne modifie pas les tables de production. Supabase peut demander
# une authentification locale, sans copier le mot de passe dans les scripts.
Executer-Supabase @('link','--project-ref',$projet)

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
Write-Host "Archive creee : $dossier"
Write-Warning 'Proteger et conserver cette archive dans un emplacement chiffre, puis realiser une restauration isolee.'
Write-Warning "Ne JAMAIS executer 'supabase db reset --linked' ou une migration V2 sur la V1."
