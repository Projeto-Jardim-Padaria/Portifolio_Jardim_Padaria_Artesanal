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
        const { orderId, correctPaymentMethod } = JSON.parse(event.body || '{}');
        
        if (!orderId || !correctPaymentMethod) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do pedido e método de pagamento são obrigatórios' 
                })
            };
        }

        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
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

        // Busca o pedido atual
        const { data: order, error: findError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .maybeSingle();
            
        if (findError) {
            console.error('❌ Erro ao buscar pedido:', findError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Erro ao buscar pedido',
                    error: findError.message 
                })
            };
        }

        if (!order) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Pedido não encontrado' 
                })
            };
        }

        console.log(`🔍 Pedido encontrado: ${order.order_id}`);
        console.log(`📊 Método de pagamento atual: ${order.payment_method}`);
        console.log(`🔄 Novo método de pagamento: ${correctPaymentMethod}`);

        // Atualiza o método de pagamento
        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({ 
                payment_method: correctPaymentMethod,
                updated_at: new Date().toISOString()
            })
            .eq('order_id', orderId)
            .select()
            .single();
            
        if (updateError) {
            console.error('❌ Erro ao atualizar pedido:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Erro ao atualizar pedido',
                    error: updateError.message 
                })
            };
        }

        console.log(`✅ Pedido atualizado com sucesso!`);
        console.log(`💰 Novo método de pagamento: ${updatedOrder.payment_method}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                order: updatedOrder,
                message: `Método de pagamento atualizado para: ${correctPaymentMethod}`
            })
        };

    } catch (error) {
        console.error('❌ Erro ao corrigir método de pagamento:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno',
                error: error.message 
            })
        };
    }
};