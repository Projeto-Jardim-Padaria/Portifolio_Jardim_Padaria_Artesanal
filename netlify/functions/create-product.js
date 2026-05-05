const { createClient } = require('@supabase/supabase-js');

const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(supabaseUrl, supabaseKey);
};

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

    try {
        const supabase = getSupabase();
        const body = JSON.parse(event.body);

        // Mapear nomes do frontend para os campos do banco (em inglês)
        const name = body.nome;
        const description = body.descricao;
        const price = body.preco;
        const category = body.categoria;
        const available_days = body.dias_disponiveis || [];
        const image_url = body.imagem; // URL da imagem vinda do upload

        if (!name || !description || !price || !category) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Campos obrigatórios não preenchidos' })
            };
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                description,
                price,
                category,
                available_days,
                image_url, // Agora salvando a URL da imagem
                is_available: true
            }])
            .select();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, product: data[0], message: 'Produto criado com sucesso!' })
        };

    } catch (err) {
        console.error('Erro ao criar produto:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: err.message })
        };
    }
};
