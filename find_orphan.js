/**
 * [DIAGNOSTIC SCRIPT - UNUSED IN PRODUCTION BUILD]
 * Utility script for inspecting orphan candidates without applications in Supabase.
 */
const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: c } = await supabase.from('candidates').select('*');
  const { data: a } = await supabase.from('applications').select('*');
  c.forEach(cand => {
    if (!a.some(app => app.candidate_id === cand.id)) {
      console.log('Orphan:', cand.name, cand.email, cand.created_at);
    }
  });
}
run();
