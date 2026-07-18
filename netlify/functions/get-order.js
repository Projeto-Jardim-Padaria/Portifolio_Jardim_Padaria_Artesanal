const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Método não permitido' 
            })
        };
    }

    try {
        // Pega o ID do pedido do path
        const pathParts = event.path.split('/');
        const orderId = pathParts[pathParts.length - 1];
        
        if (!orderId || orderId === 'get-order') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do pedido não fornecido' 
                })
            };
        }

        console.log(`🔍 Buscando pedido: ${orderId}`);
        
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Credenciais do Supabase faltando');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Supabase não configurado' 
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Busca pedido pelo order_id ou id
        let order = null;
        let orderError = null;
        
        // Tenta primeiro pelo order_id (ID curto legível)
        const result1 = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .maybeSingle();
            
        if (!result1.error && result1.data) {
            order = result1.data;
            console.log('✅ Pedido encontrado pelo order_id');
        } else {
            // Se não encontrou pelo order_id, tenta pelo id (UUID)
            // Mas só tenta se o orderId parecer um UUID para evitar erro de sintaxe no Postgres
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
            
            if (isUUID) {
                const result2 = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .maybeSingle();
                    
                if (!result2.error && result2.data) {
                    order = result2.data;
                    console.log('✅ Pedido encontrado pelo id (UUID)');
                } else {
                    orderError = result2.error;
                }
            } else {
                orderError = result1.error || { message: 'Pedido não encontrado e ID não é um UUID válido' };
            }
        }

        if (orderError || !order) {
            console.error('❌ Pedido não encontrado:', orderError?.message || 'Nenhum resultado');
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Pedido não encontrado'
                })
            };
        }

        // Busca cliente se existir client_id
        let client = null;
        if (order.client_id) {
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', order.client_id)
                .maybeSingle();
                
            if (!clientError && clientData) {
                client = clientData;
            }
        }

        // Busca itens do pedido
        let items = [];
        const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
            
        if (!itemsError && itemsData) {
            items = itemsData;
        }

        // Formata resposta
        const orderData = {
            customer: client ? {
                id: client.id,
                name: client.name || client.full_name || '',
                phone: client.phone || '',
                address: client.address || '',
                cep: client.cep || '',
                street: client.street || '',
                number: client.address_number || '',
                neighborhood: client.neighborhood || '',
                city: client.city || client.city_state || '',
                complement: client.complement || '',
                observation: client.observation || ''
            } : {
                name: order.client_name || '',
                phone: order.client_phone || '',
                address: order.address || ''
            },
            order: {
                id: order.id,
                order_id: order.order_id,
                total: order.total_amount || order.total || 0,
                subtotal: order.subtotal || 0,
                delivery_fee: order.delivery_fee || 0,
                payment_method: order.payment_method || 'pix',
                delivery_option: order.delivery_option || 'entrega',
                address: order.address || '',
                observation: order.observation || '',
                status: order.status || 'pendente',
                created_at: order.created_at,
                updated_at: order.updated_at
            },
            items: items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product_name || 'Produto',
                quantity: item.quantity || 1,
                price: item.price || item.unit_price || 0,
                total: item.total || (item.price * item.quantity) || 0
            }))
        };

        console.log(`✅ Pedido encontrado: ${order.order_id} com ${items.length} itens`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                orderData: orderData,
                message: 'Pedido encontrado com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro no get-order:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno ao buscar pedido',
                error: error.message 
            })
        };
    }
};