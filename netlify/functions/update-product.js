const { createClient } = require('@supabase/supabase-js');

const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(supabaseUrl, supabaseKey);
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS', // Adicionado PUT
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Aceitar tanto PUT quanto POST
    if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ success: false, message: 'Método não permitido. Use PUT ou POST.' }) 
        };
    }

    try {
        const supabase = getSupabase();
        const body = JSON.parse(event.body);
        const { id, nome, descricao, preco, categoria, dias_disponiveis, imagem, is_available } = body;

        if (!id) {
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ success: false, message: 'ID do produto é obrigatório' }) 
            };
        }

        // Verificar se o produto existe
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existingProduct) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Produto não encontrado' 
                })
            };
        }

        // Preparar dados para atualização
        const updateData = {
            name: nome,
            description: descricao,
            price: parseFloat(preco),
            category: categoria,
            available_days: dias_disponiveis || [],
            is_available: is_available !== undefined ? is_available : true,
            updated_at: new Date().toISOString()
        };

        // Se uma nova imagem foi fornecida, atualizar o campo
        if (imagem) {
            updateData.image_url = imagem;
        }

        // Atualizar produto
        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Erro do Supabase ao atualizar produto:', error);
            throw error;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Produto atualizado com sucesso!', 
                product: data ? data[0] : null 
            })
        };

    } catch (err) {
        console.error('Erro ao atualizar produto:', err);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno ao atualizar produto',
                error: err.message 
            }) 
        };
    }
};