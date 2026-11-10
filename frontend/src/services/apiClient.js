const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      "Não foi possível conectar à API. Verifique se os serviços estão ativos.",
      { cause: error },
    );
  }

  if (!response.ok) {
    let message = `A API respondeu com erro (${response.status}).`;
    const responseBody = await response.text();

    if (responseBody) {
      try {
        const payload = JSON.parse(responseBody);
        if (typeof payload.detail === "string") message = payload.detail;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}
