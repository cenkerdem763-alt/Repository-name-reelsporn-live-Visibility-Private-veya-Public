-- Optional; back up Supabase before manual execution.
-- Deletes only legacy AdultEmbed IDs, not other videos.
BEGIN;
DELETE FROM public.titles WHERE id LIKE 'adultembed-%';
COMMIT;
