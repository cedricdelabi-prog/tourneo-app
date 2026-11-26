# Repetition transactionnelle locale - aucun acces a la production.
# Conserve postgres (V1 restauree) et tourneo_v2_essai (V2 deja migree).
$ErrorActionPreference = 'Stop'
$c = 'supabase_db_Tourneo-restauration-locale'
$ref = '816d7c89ba662cb5f881aafdb942cbaf295ab0f8'
$base = "https://raw.githubusercontent.com/cedricdelabi-prog/tourneo-app/$ref/docs/sql"
$db = 'tourneo_v2_repetition_' + [guid]::NewGuid().ToString('N').Substring(0,12)
function Invoke-LocalSql([string]$database,[string]$query) {
    $result = & docker exec $c psql -X -At -U supabase_admin -d $database -v ON_ERROR_STOP=1 -c $query
    if ($LASTEXITCODE -ne 0) { throw "SQL local en echec ($database)" }
    return $result
}
function Invoke-LocalFile([string]$database,[string]$name) {
    & docker exec $c psql -X -q -U supabase_admin -d $database -v ON_ERROR_STOP=1 -f "/tmp/$db/$name"
    if ($LASTEXITCODE -ne 0) { throw "Script SQL en echec : $name" }
}
$health = & docker inspect --format '{{.State.Health.Status}}' $c
if ($LASTEXITCODE -ne 0 -or $health -ne 'healthy') { throw 'Conteneur local indisponible' }
$source = (Invoke-WebRequest -UseBasicParsing -Uri "$base/migration_differentielle_locale_20261126.sql").Content
$hashSql = (Invoke-WebRequest -UseBasicParsing -Uri "$base/empreintes_restauration_v1_readonly.sql").Content
if (-not $source.Contains("current_database() <> 'tourneo_v2_essai'") -or $source -notmatch '(?m)^COMMIT;\s*\z') { throw 'Version du script inattendue' }
$source = $source.Replace("current_database() <> 'tourneo_v2_essai'", "current_database() <> '$db'")
$rollback = $source -replace '(?m)^COMMIT;\s*\z', 'ROLLBACK;'
$tmp = Join-Path $env:TEMP $db
New-Item -ItemType Directory -Path $tmp | Out-Null
$created = $false
try {
    $before = @(Invoke-LocalSql 'postgres' $hashSql) -join "`n"
    if (-not $before) { throw 'Empreintes V1 absentes' }
    $v2 = @(Invoke-LocalSql 'tourneo_v2_essai' $hashSql) -join "`n"
    if ($v2 -ne $before) { throw 'Les empreintes V1 et V2 existantes divergent' }
    $allow = Invoke-LocalSql 'template1' "SELECT datallowconn FROM pg_database WHERE datname='postgres';"
    if ($allow -ne 't') { throw 'La V1 locale ne permet pas les connexions' }
    try {
        Invoke-LocalSql 'template1' 'ALTER DATABASE postgres WITH ALLOW_CONNECTIONS false;' | Out-Null
        Invoke-LocalSql 'template1' "SELECT pg_terminate_backend(pid,5000) FROM pg_stat_activity WHERE datname='postgres';" | Out-Null
        Invoke-LocalSql 'template1' "CREATE DATABASE $db TEMPLATE postgres OWNER postgres;" | Out-Null
        $created = $true
    } finally {
        Invoke-LocalSql 'template1' 'ALTER DATABASE postgres WITH ALLOW_CONNECTIONS true;' | Out-Null
    }
    & docker exec $c mkdir -m 700 "/tmp/$db"
    if ($LASTEXITCODE -ne 0) { throw 'Dossier local Docker non cree' }
    foreach ($name in @('essai.sql','annulation.sql')) {
        $body = if ($name -eq 'essai.sql') { $source } else { $rollback }
        [IO.File]::WriteAllText((Join-Path $tmp $name),$body,[Text.UTF8Encoding]::new($false))
        & docker cp (Join-Path $tmp $name) "${c}:/tmp/$db/$name"
        if ($LASTEXITCODE -ne 0) { throw 'Copie SQL impossible' }
    }
    Invoke-LocalFile $db 'annulation.sql'
    $undo = Invoke-LocalSql $db "SELECT to_regclass('public.tourneo_push_abonnements') IS NULL AND to_regclass('tourneo_private.pronostics_invites') IS NULL AND to_regclass('public.tourneo_jobs_photos') IS NULL;"
    if ($undo -ne 't' -or (@(Invoke-LocalSql $db $hashSql) -join "`n") -ne $before) { throw 'Annulation incomplete' }
    Write-Host 'ANNULATION TRANSACTIONNELLE : OK' -ForegroundColor Green
    Invoke-LocalFile $db 'essai.sql'
    $after = @(Invoke-LocalSql $db $hashSql) -join "`n"
    if ($after -ne $before) { throw 'Empreintes differentes apres migration' }
    $check = Invoke-LocalSql $db "SELECT count(*)=25 AND count(*) FILTER(WHERE public.tourneo_public_compat_v2(id) IS NOT NULL AND public.tourneo_public_compat_v2(partage_id) IS NOT NULL)=count(*) FROM public.tournois WHERE est_public;"
    # Le compteur 25 correspond a la sauvegarde locale du 26/11, pas a un seuil de production.
    if ($check -ne 't') { throw 'Liens de partage non conformes sur la copie' }
    $priv = Invoke-LocalSql $db "SELECT NOT has_function_privilege('anon','public.get_tourneo_public(uuid)','EXECUTE') AND NOT has_function_privilege('anon','public.tourneo_photos_a_supprimer()','EXECUTE') AND NOT has_function_privilege('authenticated','public.tourneo_worker_prendre(boolean,boolean)','EXECUTE');"
    if ($priv -ne 't') { throw 'Permissions non conformes' }
    if ((@(Invoke-LocalSql 'postgres' $hashSql) -join "`n") -ne $before -or (@(Invoke-LocalSql 'tourneo_v2_essai' $hashSql) -join "`n") -ne $v2) { throw 'Copies initiales modifiees' }
    Write-Host 'EMPREINTES, PARTAGES ET PERMISSIONS : OK' -ForegroundColor Green
    Write-Host 'REPETITION SQL GROUPEE REUSSIE' -ForegroundColor Green
    Write-Host "Copie de repetition conservee : $db"
} finally {
    & docker exec $c rm -rf "/tmp/$db" 2>$null | Out-Null
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    if ($created) { Write-Host "Base de repetition isolee : $db" }
}
