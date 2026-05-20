const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkeyqnbpvsqmwvpevfwh.supabase.co';
const supabaseKey = 'sb_publishable_EtPM_Tlr7GqLr3V_sIpF4w_PnnZWwPd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('productos')
    .select('*, variantes(*)')
    .eq('activo', true);

  if (error) {
    console.error('Error fetching productos:', error);
    return;
  }

  console.log('Productos count:', data.length);
  for (const prod of data) {
    console.log(`Product: ${prod.nombre} (${prod.id})`);
    console.log('Variantes:', prod.variantes);
  }
}

run();
