-- Stop the obsolete provider-scraping scheduled job when migrating an existing database.
DO $$ BEGIN
  PERFORM cron.unschedule('content-maintenance-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
