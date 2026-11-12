-- Public rankings use the sanitized tournament projection, not account identifiers.
revoke select on public.player_results from anon;
alter policy results_read on public.player_results to authenticated;
