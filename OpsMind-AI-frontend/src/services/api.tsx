const BASE_URL = "http://localhost:5000";

export async function askQuestion(
  query: string,
  chatHistory: { role: string; content: string }[] = [],
  file?: string
) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, chatHistory, file })
  });
  return res.json();
}

export async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append("pdf", file);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData
  });
  return res.json();
}