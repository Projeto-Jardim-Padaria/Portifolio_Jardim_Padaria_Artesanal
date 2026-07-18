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
        console.log('🔍 Recebendo requisição get-client-by-phone');
        
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
        
        const { phone } = body;
        
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

        // Validação básica do telefone
        const phoneRegex = /^[0-9]+$/;
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Telefone inválido' 
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

        // Busca cliente pelo telefone
        console.log(`🔍 Buscando cliente no banco para telefone: ${phone}`);
        
        const { data: client, error } = await supabase
            .from('clients')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();
            
        if (error) {
            console.error('❌ Erro do Supabase ao buscar cliente:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Erro ao buscar cliente no banco de dados',
                    error: error.message 
                })
            };
        }

        if (!client) {
            console.log('ℹ️ Cliente não encontrado para este telefone');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Cliente não encontrado',
                    client: null 
                })
            };
        }

        console.log(`✅ Cliente encontrado: ${client.name} (ID: ${client.id})`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                client: client,
                message: 'Cliente encontrado com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro inesperado no get-client-by-phone:', error);
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