-- Signup notification scheduler. Target: drvmpawjwctawzfaiigu (Mongsangin).
-- Preconditions: deploy the two authenticated webhook/sweep routes, set both
-- production cutoff/secret envs, and store matching named secrets in Vault.
-- No credential values belong in this SQL file.
-- Official syntax verified from:
-- https://supabase.com/docs/guides/database/extensions/pg_net.md
-- https://supabase.com/docs/guides/cron/quickstart.md
-- https://supabase.com/docs/guides/database/vault.md

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists signup_notifications_private;
revoke all on schema signup_notifications_private from public, anon, authenticated;

-- pg_net stores secret-bearing request headers in its internal queue. It is
-- not exposed via REST, and client database roles must not read its contents.
revoke all on table net.http_request_queue, net._http_response
  from public, anon, authenticated;
revoke all on all sequences in schema net from public, anon, authenticated;

create or replace function signup_notifications_private.notify_mongsangin_signup_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  webhook_secret text;
begin
  if new.is_anonymous is distinct from false
    or nullif(pg_catalog.btrim(new.email), '') is null then
    return new;
  end if;

  select s.decrypted_secret into webhook_secret
  from vault.decrypted_secrets as s
  where s.name = 'mongsangin_signup_notification_webhook';

  if webhook_secret is null or pg_catalog.length(webhook_secret) < 32 then
    return new;
  end if;

  -- pg_net starts the request only after this signup transaction commits.
  -- Send the canonical user id only; the server re-reads Auth before mailing.
  perform net.http_post(
    url := 'https://mongsangin.life/api/auth/signup-webhook',
    body := pg_catalog.jsonb_build_object(
      'type', 'INSERT', 'schema', 'auth', 'table', 'users',
      'record', pg_catalog.jsonb_build_object('id', new.id)
    ),
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-signup-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 25000
  );
  return new;
exception when others then
  -- Notification transport must never reject a signup. The scheduled server
  -- sweeps retry eligible accounts using the same provider idempotency key.
  return new;
end;
$function$;

revoke all on function signup_notifications_private.notify_mongsangin_signup_insert()
  from public, anon, authenticated, service_role;

create or replace trigger on_auth_user_signup_notification
after insert on auth.users
for each row
execute function signup_notifications_private.notify_mongsangin_signup_insert();

create or replace function signup_notifications_private.dispatch_signup_notification_sweeps()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  webhook_secret text;
  queued integer := 0;
begin
  begin
    select s.decrypted_secret into webhook_secret
    from vault.decrypted_secrets as s
    where s.name = 'mongsangin_signup_notification_webhook';
    if webhook_secret is not null and pg_catalog.length(webhook_secret) >= 32 then
      perform net.http_post(
        url := 'https://mongsangin.life/api/auth/signup-sweep',
        body := '{}'::jsonb,
        headers := pg_catalog.jsonb_build_object(
          'Content-Type', 'application/json',
          'x-signup-webhook-secret', webhook_secret
        ),
        timeout_milliseconds := 55000
      );
      queued := queued + 1;
    end if;
  exception when others then
    -- Isolate one site's transport failure from the other site's retry.
    null;
  end;

  webhook_secret := null;
  begin
    select s.decrypted_secret into webhook_secret
    from vault.decrypted_secrets as s
    where s.name = 'enico_signup_notification_webhook';
    if webhook_secret is not null and pg_catalog.length(webhook_secret) >= 32 then
      perform net.http_post(
        url := 'https://enicoveck.com/api/auth/signup-sweep',
        body := '{}'::jsonb,
        headers := pg_catalog.jsonb_build_object(
          'Content-Type', 'application/json',
          'x-signup-webhook-secret', webhook_secret
        ),
        timeout_milliseconds := 55000
      );
      queued := queued + 1;
    end if;
  exception when others then
    null;
  end;

  return queued;
end;
$function$;

revoke all on function signup_notifications_private.dispatch_signup_notification_sweeps()
  from public, anon, authenticated, service_role;

-- The command contains no secret values. Endpoints enforce their production
-- SIGNUP_NOTIFICATION_ENABLED_AT cutoff, exclude anonymous/email-less users,
-- limit age to 24h, and skip the server-managed success marker.
select cron.schedule(
  'signup-notification-sweeps-v1',
  '*/5 * * * *',
  'select signup_notifications_private.dispatch_signup_notification_sweeps();'
);

-- Safe post-apply readback queries (do not inspect request headers/Vault data):
-- select extname from pg_extension where extname in ('pg_net','pg_cron','supabase_vault');
-- select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
-- select jobname,schedule,active from cron.job where jobname='signup-notification-sweeps-v1';
-- select name,id from vault.secrets where name in
--   ('mongsangin_signup_notification_webhook','enico_signup_notification_webhook');
