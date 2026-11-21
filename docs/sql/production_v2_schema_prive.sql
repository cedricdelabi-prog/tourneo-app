-- Espace réservé aux fonctions internes de Tourneo V2.
begin;
create schema tourneo_private;
revoke all on schema tourneo_private from public, anon, authenticated;
commit;
