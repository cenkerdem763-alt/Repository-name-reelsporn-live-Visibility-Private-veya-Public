create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('content-maintenance-daily');
exception
  when others then
    null;
end
$$;

select cron.schedule(
  'content-maintenance-daily',
  '23 3 * * *',
  $$
    select net.http_post(
      url := 'https://xaoimbvdfctwvxviqppo.supabase.co/functions/v1/run-content-maintenance',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'content_maintenance_service_role_key'
          limit 1
        )
      ),
      body := jsonb_build_object(
        'limit', 50,
        'source', 'cron'
      )
    ) as request_id;
  $$
);
