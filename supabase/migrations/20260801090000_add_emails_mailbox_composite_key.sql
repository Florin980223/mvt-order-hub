-- Brief 6.4: dedup key should be message_id + mailbox, not message_id
-- alone. Two mail_connections rows already exist for this project (see
-- 7a-3 diagnosis) — a global unique constraint would silently no-op a
-- second connection's legitimate ingestion of the same Graph message id
-- if it were ever visible through both connections' contexts.
alter table public.emails
  add column connection_id uuid references public.mail_connections (id) on delete set null;

alter table public.emails drop constraint emails_graph_message_id_key;

create unique index emails_message_connection_idx on public.emails (graph_message_id, connection_id);
