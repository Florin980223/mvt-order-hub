import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: mockEmails, error } = await supabaseAdmin
  .from('emails')
  .select('id, subject, sender, status, graph_message_id, received_at')
  .like('graph_message_id', 'mock-%')
  .order('received_at', { ascending: true })
if (error) { console.error(error); process.exit(1) }
console.log('Mock emails count:', mockEmails?.length)
for (const e of mockEmails ?? []) console.log(' -', e.graph_message_id, '|', e.subject, '|', e.status)

const { data: orders, error: oerr } = await supabaseAdmin
  .from('orders')
  .select('id, email_id, status, confidence_overall')
  .eq('status', 'needs_validation')
if (oerr) { console.error(oerr); process.exit(1) }
console.log('needs_validation orders count:', orders?.length)

const { data: allEmails, error: aerr } = await supabaseAdmin
  .from('emails')
  .select('id, subject, sender, status, graph_message_id')
if (aerr) { console.error(aerr); process.exit(1) }
console.log('Total emails:', allEmails?.length)
const nonMock = (allEmails ?? []).filter(e => !e.graph_message_id?.startsWith('mock-'))
console.log('Non-mock emails:', nonMock.length)
for (const e of nonMock) console.log(' -', e.sender, '|', e.subject, '|', e.status, '| gid:', e.graph_message_id)
