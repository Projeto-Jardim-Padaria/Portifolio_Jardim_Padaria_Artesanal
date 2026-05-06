export async function handler(event) {
  try {
    const { titulo, data, horario, local, imagem } = JSON.parse(event.body);

    if (!global.avisos) global.avisos = [];

    const novoAviso = {
      id: Date.now().toString(),
      titulo,
      data,
      horario,
      local,
      imagem
    };

    global.avisos.push(novoAviso); // adiciona sem apagar os outros

    return {
      statusCode: 200,
      body: JSON.stringify(novoAviso),
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao criar aviso" }),
    };
  }
}