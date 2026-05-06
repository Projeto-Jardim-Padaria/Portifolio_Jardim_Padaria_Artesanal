export async function handler(event) {
  try {
    const { id, titulo, data, horario, local, imagem } = JSON.parse(event.body);

    if (!global.avisos) global.avisos = [];

    global.avisos = global.avisos.map(a => {
      if (a.id === id) {
        return {
          ...a,
          titulo,
          data,
          horario,
          local,
          imagem 
        };
      }
      return a;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao atualizar aviso" }),
    };
  }
}