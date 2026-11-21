-- La révision est une colonne ajoutée pour la V2. Les clients V1 utilisent sa valeur par défaut.
begin;
set local lock_timeout = '3s';

alter table public.tournois
  add constraint tourneo_v2_compat_revision_check check (revision >= 0);

commit;
