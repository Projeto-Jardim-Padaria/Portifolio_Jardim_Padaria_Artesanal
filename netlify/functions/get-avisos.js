export async function handler() {
  try {
    const avisos = global.avisos || [];
    return {
      statusCode: 200,
      body: JSON.stringify({ avisos }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao buscar avisos" }),
    };
  }
}