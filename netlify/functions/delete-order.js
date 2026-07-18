const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Método não permitido' })
        };
    }

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: 'Supabase não configurado' })
            };
        }

        // Extrair ID do path ou query
        const pathParts = event.path.split('/');
        const orderId = pathParts[pathParts.length - 1];

        if (!orderId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'ID do pedido é obrigatório' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Primeiro deletar os itens do pedido (se houver chave estrangeira sem cascade)
        await supabase.from('order_items').delete().eq('order_id', orderId);
        
        // Deletar o pedido
        const { error } = await supabase
            .from('orders')
            .delete()
            .or(`id.eq.${orderId},order_id.eq.${orderId}`);

        if (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: error.message })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Pedido excluído com sucesso' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro ao excluir pedido', error: error.message })
        };
    }
};
