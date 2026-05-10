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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Método não permitido' })
        };
    }

    try {
        const { titulo, data, horario, local, imagem } = JSON.parse(event.body);

        if (!titulo || !data || !horario || !local) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Campos obrigatórios faltando: titulo, data, horario, local'
                })
            };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
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

        const novoAviso = {
            titulo,
            data,
            horario,
            local,
            imagem: imagem || null,
            created_at: new Date().toISOString()
        };

        const { data: aviso, error } = await supabase
            .from('avisos')
            .insert([novoAviso])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao criar aviso:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: error.message })
            };
        }

        console.log('✅ Aviso criado com sucesso:', aviso.id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                aviso: aviso,
                message: 'Aviso criado com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao criar aviso:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
