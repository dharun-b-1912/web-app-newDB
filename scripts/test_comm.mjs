import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');
await sb.auth.signInWithPassword({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' });
const { data, error } = await sb.from('communication_messages').select('id').limit(1);
console.log('communication_messages exists?', !error, error ? error.message : 'count: ' + data.length);
const { data: d2, error: e2 } = await sb.from('communication_templates').select('id').limit(1);
console.log('communication_templates exists?', !e2, e2 ? e2.message : 'count: ' + d2.length);
