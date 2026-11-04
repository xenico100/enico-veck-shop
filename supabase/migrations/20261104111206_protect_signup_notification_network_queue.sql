-- Protect the signup notification HTTP queue after all extension/function DDL.
-- The queue can contain shared-secret headers; client roles must not read it.
-- No key values, member data, or unrelated schema/policy changes are present.
revoke all privileges on table net.http_request_queue, net._http_response
  from public, anon, authenticated;
revoke all privileges on all sequences in schema net
  from public, anon, authenticated;
