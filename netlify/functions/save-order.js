
// netlify/functions/save-order.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Configura CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
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
    const data = JSON.parse(event.body);
    console.log('📝 Dados recebidos no save-order:', JSON.stringify(data, null, 2));

    const { client, order, items } = data;
    
    if (!client || !client.phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Bad request',
          message: 'Client data with phone is required'
        })
      };
    }

    // Mapeia nomes de campos
    const deliveryOption = client.deliveryOption || client.delivery_option || order.delivery_option || 'entrega';
    const paymentMethod = client.paymentMethod || client.payment_method || order.payment_method || 'pix';
    
    // PASSO 1: Salvar/Atualizar cliente
    const cleanPhone = client.phone.replace(/\D/g, '');
    
    // Prepara dados do cliente
    const clientData = {
      phone: cleanPhone,
      name: client.name || '',
      address: client.address || '',
      cep: client.cep ? client.cep.replace(/\D/g, '') : '',
      updated_at: new Date().toISOString()
    };

    console.log('👤 Dados do cliente para salvar:', clientData);

    // Verifica se cliente já existe
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id, total_orders, total_spent')
      .eq('phone', cleanPhone)
      .maybeSingle();

    let clientId;
    let currentOrders = 0;
    let currentSpent = 0;

    if (existingClient) {
      clientId = existingClient.id;
      currentOrders = existingClient.total_orders || 0;
      currentSpent = existingClient.total_spent || 0;
      
      await supabase
        .from('clients')
        .update(clientData)
        .eq('id', clientId);
      
      console.log(`✅ Cliente atualizado: ${clientId}`);
    } else {
      clientData.created_at = new Date().toISOString();
      clientData.total_orders = 0;
      clientData.total_spent = 0;
      
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert([clientData])
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      clientId = newClient.id;
      console.log(`✅ Novo cliente criado: ${clientId}`);
    }

    // PASSO 2: Salvar pedido
    const orderData = {
      client_id: clientId,
      order_id: 'JD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      total: order.total || data.total || 0,
      subtotal: order.subtotal || order.total || data.total || 0,
      delivery_fee: order.deliveryFee || order.delivery_fee || 0,
      payment_method: paymentMethod,
      delivery_option: deliveryOption,
      address: client.address || '',
      observation: client.observation || order.observation || '',
      status: 'pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Dados do pedido para salvar:', orderData);

    const { data: savedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select('id, order_id, total')
      .single();
    
    if (orderError) {
      console.error('❌ Erro ao salvar pedido:', orderError);
      throw orderError;
    }
    
    console.log('✅ Pedido salvo:', savedOrder.id);

    // PASSO 3: Salvar itens do pedido
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        order_id: savedOrder.id,
        product_id: item.product_id || item.id || null,
        product_name: item.product_name || item.name || 'Produto',
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: (item.price || 0) * (item.quantity || 1),
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.warn('⚠️ Erro ao salvar itens:', itemsError.message);
      }
    }

    // PASSO 4: Atualizar estatísticas do cliente
    try {
      await supabase
        .from('clients')
        .update({
          total_orders: currentOrders + 1,
          total_spent: currentSpent + (order.total || data.total || 0)
        })
        .eq('id', clientId);
    } catch (e) {
      console.warn('⚠️ Não foi possível atualizar estatísticas:', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: savedOrder.order_id,
        clientId: clientId,
        total: savedOrder.total,
        message: 'Pedido salvo com sucesso',
        orderDetailLink: `/o.html?id=${savedOrder.order_id}`
      })
    };

  } catch (error) {
    console.error('❌ Erro na função save-order:', error);
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
