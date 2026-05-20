const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkeyqnbpvsqmwvpevfwh.supabase.co';
const supabaseKey = 'sb_publishable_EtPM_Tlr7GqLr3V_sIpF4w_PnnZWwPd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: allProds, error: err1 } = await supabase
    .from('productos')
    .select('*, variantes(*)');

  if (err1) {
    console.error('Error fetching all productos:', err1);
    return;
  }

  console.log('All productos count:', allProds.length);
  for (const prod of allProds) {
    console.log(`Product: ${prod.nombre} (${prod.id}), activo: ${prod.activo}`);
    console.log('Variantes:', prod.variantes);
  }
}

run();
