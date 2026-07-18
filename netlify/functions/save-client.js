// netlify/functions/save-client.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Configura CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  // Apenas POST e PUT são permitidos
  if (!['POST', 'PUT'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verifica credenciais
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          message: 'Supabase credentials not configured'
        })
      };
    }

    // Inicializa cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse dos dados da requisição
    const requestBody = JSON.parse(event.body || '{}');
    const { phone, ...clientData } = requestBody;

    if (!phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    // Limpa o telefone (remove não números)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Prepara dados do cliente
    const clientToSave = {
      phone: cleanPhone,
      name: clientData.name || clientData.name || '',
      updated_at: new Date().toISOString()
    };

    // Busca cliente existente primeiro
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    let clientId;
    let isNewClient = false;

    if (existingClient) {
      clientId = existingClient.id;
      try {
        // Tenta atualizar com todos os campos possíveis
        const fullUpdateData = { ...clientToSave };
        if (clientData.address) fullUpdateData.address = clientData.address;
        if (clientData.cep) fullUpdateData.cep = clientData.cep.replace(/\D/g, '');
        
        const { error: updateError } = await supabase
          .from('clients')
          .update(fullUpdateData)
          .eq('id', clientId);
        if (updateError) throw updateError;
      } catch (e) {
        console.warn('⚠️ Erro ao atualizar cliente com campos extras, tentando básicos:', e.message);
        await supabase
          .from('clients')
          .update({
            name: clientToSave.name,
            updated_at: clientToSave.updated_at
          })
          .eq('id', clientId);
      }
    } else {
      isNewClient = true;
      clientToSave.created_at = new Date().toISOString();
      clientToSave.total_orders = 0;
      clientToSave.total_spent = 0;
      
      try {
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert([clientToSave])
          .select('id')
          .single();
        if (insertError) throw insertError;
        clientId = newClient.id;
      } catch (e) {
        console.warn('⚠️ Erro ao criar cliente com campos extras, tentando básicos:', e.message);
        const { data: newClient, error: retryInsertError } = await supabase
          .from('clients')
          .insert([{
            phone: clientToSave.phone,
            name: clientToSave.name,
            created_at: clientToSave.created_at,
            updated_at: clientToSave.updated_at,
            total_orders: 0,
            total_spent: 0
          }])
          .select('id')
          .single();
        if (retryInsertError) throw retryInsertError;
        clientId = newClient.id;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        isNew: isNewClient,
        clientId: clientId,
        message: isNewClient ? 'Cliente criado com sucesso' : 'Cliente atualizado com sucesso'
      })
    };

  } catch (error) {
    console.error('❌ Erro na função save-client:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
