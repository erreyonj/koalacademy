-- Local development seed. config.toml points at this file, so it must exist
-- for `supabase db reset` to succeed. Salad Bowl needs no seed rows: the
-- banned-term list ships inside the migration itself so hosted and local
-- databases stay identical.
select 1;
