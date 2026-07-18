const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
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
        console.log('📋 Recebendo requisição get-client-orders');
        
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('❌ Erro ao parsear body:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Formato JSON inválido' 
                })
            };
        }
        
        const { clientId } = body;
        
        console.log(`👤 ID do cliente recebido: ${clientId}`);
        
        if (!clientId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do cliente não fornecido' 
                })
            };
        }

        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Credenciais do Supabase faltando');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Banco de dados não configurado' 
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Busca pedidos do cliente
        console.log(`🔍 Buscando pedidos para cliente ID: ${clientId}`);
        
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_name,
                    quantity,
                    price,
                    total
                )
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });
            
        if (ordersError) {
            console.error('❌ Erro do Supabase ao buscar pedidos:', ordersError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Erro ao buscar pedidos no banco de dados',
                    error: ordersError.message 
                })
            };
        }

        console.log(`📊 ${orders?.length || 0} pedidos encontrados no banco`);

        // Formata os pedidos
        const formattedOrders = (orders || []).map(order => {
            return {
                id: order.id,
                order_id: order.order_id,
                total: order.total || order.total_amount || 0,
                subtotal: order.subtotal,
                delivery_fee: order.delivery_fee,
                payment_method: order.payment_method,
                delivery_option: order.delivery_option,
                address: order.address,
                observation: order.observation,
                status: order.status || 'pendente',
                created_at: order.created_at,
                items: order.order_items || []
            };
        });

        console.log(`✅ ${formattedOrders.length} pedidos formatados para retorno`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                orders: formattedOrders,
                count: formattedOrders.length,
                message: 'Pedidos encontrados com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro inesperado no get-client-orders:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno do servidor',
                error: error.message 
            })
        };
    }
};