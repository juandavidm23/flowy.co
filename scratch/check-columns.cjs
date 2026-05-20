const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkeyqnbpvsqmwvpevfwh.supabase.co';
const supabaseKey = 'sb_publishable_EtPM_Tlr7GqLr3V_sIpF4w_PnnZWwPd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('variantes')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching variante:', error);
    return;
  }

  console.log('Variante object:', data[0]);
}

run();
