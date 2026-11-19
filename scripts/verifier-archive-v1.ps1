# TOURNEO V1 : audit d'une archive locale, strictement HORS LIGNE.
# Ni base Supabase, ni identifiant, ni secret ne sont consultes ou transmis.
param(
    [Parameter(Mandatory=$true)]
    [string]$Dossier
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'

$archive=(Resolve-Path -LiteralPath $Dossier -ErrorAction Stop).Path
$source=Join-Path $archive 'controle-hash.json'
$manifest=Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
if($manifest.sourceProjet -cne 'gjtxlzhfqcecyfciyllc') {
    throw 'REFUS : la sauvegarde ne provient pas du projet Tourneo V1 attendu.'
}
if($manifest.fichierRestaurationValide -ne $false) {
    throw 'REFUS : cette archive ne doit pas se declarer restauree.'
}
$attendus=@(
    '01-roles.sql','02-schema-public.sql','03-schema-auth-storage.sql',
    '04-data-public.sql','05-data-auth.sql','06-data-storage.sql'
)
$entrees=@($manifest.fichiers)
if($entrees.Count -ne $attendus.Count) {
    throw 'REFUS : l archive ne contient pas exactement six exports indexes.'
}
foreach($nom in $attendus) {
    $eligibles=@($entrees | Where-Object {$_.fichier -ceq $nom})
    if($eligibles.Count -ne 1){throw "Export manquant ou duplique dans le manifeste : $nom"}
    $entry=$eligibles[0]
    $fichier=Join-Path $archive $nom
    $item=Get-Item -LiteralPath $fichier -ErrorAction Stop
    if($item.Length -lt 20 -or $item.Length -ne [long]$entry.octets) {
        throw "REFUS : longueur de $nom incorrecte ou archive partielle."
    }
    $calcul=(Get-FileHash -LiteralPath $fichier -Algorithm SHA256).Hash
    if($calcul -cne ([string]$entry.sha256).ToUpperInvariant()) {
        throw "REFUS : empreinte SHA256 non conforme pour $nom."
    }
}

function Compter-Copy([string] $Fichier,[string] $Schema,[string] $Table) {
    # Ne collecte jamais les donnees : compte seulement les lignes de COPY en streaming.
    $motif='(?i)^\s*COPY\s+"?'+[regex]::Escape($Schema)+'"?\."?'+[regex]::Escape($Table)+'"?\s*\([^)]*\)\s*FROM\s+stdin\s*;'
    $flux=[System.IO.File]::OpenText($Fichier)
    [long]$nombre=0
    $entree=$false
    $fermee=$false
    try {
        while($null -ne ($ligne=$flux.ReadLine())) {
            if(-not $entree) {
                if($ligne -match $motif) {
                    $entree=$true
                }
                continue
            }
            if($ligne -ceq '\.') {
                $fermee=$true
                break
            }
            $nombre++
        }
    } finally {
        $flux.Dispose()
    }
    if(-not $entree -or -not $fermee) {
        throw "REFUS : bloc COPY non trouve ou incomplet pour $Schema.$Table."
    }
    return $nombre
}
$dataPublic=Join-Path $archive '04-data-public.sql'
$dataAuth=Join-Path $archive '05-data-auth.sql'
[long]$profils=Compter-Copy $dataPublic 'public' 'profiles'
[long]$tournois=Compter-Copy $dataPublic 'public' 'tournois'
[long]$utilisateurs=Compter-Copy $dataAuth 'auth' 'users'
[long]$identites=Compter-Copy $dataAuth 'auth' 'identities'
if($utilisateurs -lt 1 -or $tournois -lt 1 -or $profils -ne $utilisateurs -or $identites -lt $utilisateurs) {
    throw "REFUS : export vide ou incoherent (comptes $utilisateurs, profils $profils, identites $identites, tournois $tournois)."
}
Write-Host "Tourneo V1 : 6 empreintes valides et lignes presentes (comptes $utilisateurs, profils $profils, identites $identites, tournois $tournois)."
Write-Warning 'Verification des fichiers UNIQUEMENT : pas de preuve de restauration, connexions Auth et fonctions non testees.'
