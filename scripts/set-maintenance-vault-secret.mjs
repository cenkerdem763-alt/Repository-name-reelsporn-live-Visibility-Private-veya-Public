import { execFileSync } from "node:child_process";

const PROJECT_REF = "xaoimbvdfctwvxviqppo";
const SECRET_NAME = "content_maintenance_service_role_key";

const keys = JSON.parse(
  execFileSync("supabase", ["projects", "api-keys", "--project-ref", PROJECT_REF, "-o", "json"], {
    encoding: "utf8",
  }),
);
const serviceRoleKey = keys.find((key) => key.id === "service_role" || key.name === "service_role")?.api_key;
if (!serviceRoleKey || serviceRoleKey.includes("··")) {
  throw new Error("Service role key could not be read from Supabase CLI.");
}

const sqlValue = serviceRoleKey.replace(/'/g, "''");
const sql = `
do $$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = '${SECRET_NAME}';

  if secret_id is null then
    perform vault.create_secret(
      '${sqlValue}',
      '${SECRET_NAME}',
      'Service role key used by pg_cron to invoke run-content-maintenance.'
    );
  else
    perform vault.update_secret(
      secret_id,
      '${sqlValue}',
      '${SECRET_NAME}',
      'Service role key used by pg_cron to invoke run-content-maintenance.'
    );
  end if;
end
$$;
`;

execFileSync("supabase", ["db", "query", "--linked", sql], { stdio: "inherit" });
