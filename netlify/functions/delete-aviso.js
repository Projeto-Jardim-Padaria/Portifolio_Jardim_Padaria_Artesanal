export async function handler(event) {
  try {
    const { id } = JSON.parse(event.body);

    if (!global.avisos) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    // filtra removendo o aviso com o ID
    global.avisos = global.avisos.filter(a => a.id !== id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao deletar aviso" }),
    };
  }
}