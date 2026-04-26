const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY
});

async function listModels() {
  try {
    const models = await ai.models.list();
    for await (const model of models) {
      console.log(model.name);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

listModels();