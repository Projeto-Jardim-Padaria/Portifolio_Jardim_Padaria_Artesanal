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
        const { id, titulo, data, horario, local, imagem } = JSON.parse(event.body);

        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do aviso é obrigatório'
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
                    message: 'Supabase não configurado'
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const avisoAtualizado = {};
        if (titulo !== undefined) avisoAtualizado.titulo = titulo;
        if (data !== undefined) avisoAtualizado.data = data;
        if (horario !== undefined) avisoAtualizado.horario = horario;
        if (local !== undefined) avisoAtualizado.local = local;
        if (imagem !== undefined) avisoAtualizado.imagem = imagem;
        avisoAtualizado.updated_at = new Date().toISOString();

        const { data: aviso, error } = await supabase
            .from('avisos')
            .update(avisoAtualizado)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao atualizar aviso:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: error.message })
            };
        }

        console.log('✅ Aviso atualizado com sucesso:', id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                aviso: aviso,
                message: 'Aviso atualizado com sucesso'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao atualizar aviso:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
}