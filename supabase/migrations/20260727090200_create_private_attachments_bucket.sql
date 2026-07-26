-- Private bucket for email attachments — never public; no storage.objects
-- policies are added yet since all writes go through the service role
-- (bypasses RLS by design) and nothing serves attachments to the frontend
-- until a later phase.
insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', false)
on conflict (id) do nothing;
