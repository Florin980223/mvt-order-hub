-- Lets outlook-oauth-callback upsert by mailbox_address on reconnect
-- instead of creating a duplicate row each time.
alter table public.mail_connections
  add constraint mail_connections_mailbox_address_key unique (mailbox_address);
