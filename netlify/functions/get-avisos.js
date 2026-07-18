const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ Supabase não configurado, retornando avisos vazios');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    avisos: [],
                    message: 'Supabase não configurado'
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Busca todos os avisos ordenados por data (mais recentes primeiro)
        const { data: avisos, error } = await supabase
            .from('avisos')
            .select('*')
            .order('data', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Erro ao buscar avisos:', error);
            // Se a tabela não existe, retorna array vazio
            if (error.message.includes('relation') || error.message.includes('does not exist')) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        avisos: [],
                        message: 'Tabela de avisos não existe ainda'
                    })
                };
            }
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: error.message })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                avisos: avisos || [],
                count: (avisos || []).length
            })
        };

    } catch (error) {
        console.error('❌ Erro ao buscar avisos:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
