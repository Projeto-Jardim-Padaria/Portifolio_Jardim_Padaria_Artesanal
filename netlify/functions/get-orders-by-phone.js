const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('📋 Recebendo requisição get-orders-by-phone');
        
        const phone = event.queryStringParameters ? event.queryStringParameters.phone : null;
        
        console.log(`📱 Telefone recebido: ${phone}`);
        
        if (!phone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Telefone não fornecido' 
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

        // 1. Primeiro busca o cliente pelo telefone para obter o ID
        console.log(`🔍 Buscando cliente para telefone: ${phone}`);
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

        if (clientError) {
            console.error('❌ Erro ao buscar cliente:', clientError);
            throw clientError;
        }

        if (!client) {
            console.log('ℹ️ Cliente não encontrado');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    orders: [],
                    message: 'Cliente não encontrado' 
                })
            };
        }

        // 2. Busca os últimos pedidos deste cliente
        console.log(`🔍 Buscando pedidos para cliente ID: ${client.id}`);
        
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_id,
                    product_name,
                    quantity,
                    price,
                    total,
                    products (
                        image_url
                    )
                )
            `)
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (ordersError) {
            console.error('❌ Erro ao buscar pedidos:', ordersError);
            throw ordersError;
        }

        // Formata os pedidos para o formato esperado pelo frontend
        const formattedOrders = (orders || []).map(order => ({
            id: order.id,
            order_id: order.order_id,
            total: order.total || 0,
            subtotal: order.subtotal,
            delivery_fee: order.delivery_fee,
            payment_method: order.payment_method,
            delivery_option: order.delivery_option,
            address: order.address,
            observation: order.observation,
            status: order.status || 'pendente',
            created_at: order.created_at,
            items: (order.order_items || []).map(item => ({
                id: item.id,
                product_id: item.product_id,
                name: item.product_name,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                image: item.products?.image_url || null,
                image_url: item.products?.image_url || null
            }))
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                orders: formattedOrders,
                message: 'Pedidos recuperados com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro inesperado:', error);
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
