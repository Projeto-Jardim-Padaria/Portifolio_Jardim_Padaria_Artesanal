const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
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
            body: JSON.stringify({ 
                success: false, 
                message: 'Método não permitido' 
            })
        };
    }

    try {
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

        const body = JSON.parse(event.body || '{}');
        const { orderId, status } = body;
        
        if (!orderId || !status) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do pedido e status são obrigatórios' 
                })
            };
        }

        console.log(`🔄 Atualizando pedido ${orderId} para status: ${status}`);
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verifica se o orderId é um UUID válido
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        
        let query = supabase.from('orders').update({ 
            status: status,
            updated_at: new Date().toISOString()
        });

        if (isUUID) {
            // Se for UUID, tenta casar com a coluna 'id' ou 'order_id'
            query = query.or(`id.eq.${orderId},order_id.eq.${orderId}`);
        } else {
            // Se não for UUID, tenta casar apenas com 'order_id' para evitar erro de cast no Postgres
            query = query.eq('order_id', orderId);
        }

        const { data, error } = await query
            .select('id, order_id, status, client_id')
            .maybeSingle();

        if (error) {
            console.error('❌ Erro ao atualizar pedido:', error);
            throw error;
        }

        if (!data) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Pedido não encontrado' 
                })
            };
        }

        console.log('✅ Status atualizado com sucesso:', {
            id: data.id,
            order_id: data.order_id,
            status: data.status
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Status atualizado com sucesso',
                order: {
                    id: data.id,
                    order_id: data.order_id,
                    status: data.status,
                    client_id: data.client_id
                }
            })
        };

    } catch (error) {
        console.error('❌ Erro no update-order-status:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno ao atualizar status',
                error: error.message 
            })
        };
    }
};
