import { supabaseAdmin } from '../scripts/lib/supabaseAdminClient.ts'

async function main() {
  const { data: mockEmails, error } = await supabaseAdmin
    .from('emails')
    .select('id, subject, sender, status, graph_message_id, received_at')
    .like('graph_message_id', 'mock-%')
    .order('received_at', { ascending: true })
  if (error) throw error
  console.log('Mock emails count:', mockEmails?.length)
  console.log(mockEmails?.map(e => ({ subject: e.subject, status: e.status, gid: e.graph_message_id })))

  const { data: orders, error: oerr } = await supabaseAdmin
    .from('orders')
    .select('id, email_id, status, confidence_overall')
    .eq('status', 'needs_validation')
  if (oerr) throw oerr
  console.log('needs_validation orders count:', orders?.length)

  const { data: allEmails, error: aerr } = await supabaseAdmin
    .from('emails')
    .select('id, subject, sender, status, graph_message_id')
  if (aerr) throw aerr
  console.log('Total emails:', allEmails?.length)
  const nonMock = allEmails?.filter(e => !e.graph_message_id?.startsWith('mock-'))
  console.log('Non-mock emails:', nonMock?.map(e => ({subject: e.subject, sender: e.sender, status: e.status})))
}
main().catch(e => { console.error(e); process.exit(1) })
