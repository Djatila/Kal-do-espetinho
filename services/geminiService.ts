
import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

export const getGeminiResponse = async (
  userMessage: string, 
  systemInstruction: string,
  currentMenu: MenuItem[]
): Promise<string> => {
  // Always initialize GoogleGenAI using a named parameter with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Context preparation for the model
    const menuList = currentMenu.map(item => 
      `- ${item.name} (${item.category}): R$ ${item.price.toFixed(2)} | ${item.description}`
    ).join('\n');

    const fullSystemInstruction = `${systemInstruction}
    
    [CONTEXTO DO CARDÁPIO ATUAL]:
    ${menuList}
    `;

    // Always use ai.models.generateContent with model and prompt content
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: fullSystemInstruction,
      },
    });

    // Access the text property directly from the response object
    return response.text || "Hmm, não consegui pensar em uma resposta. Pode tentar de novo? 🤔";

  } catch (error: any) {
    console.error("Erro no serviço Gemini:", error);
    
    // Generic error handling for the UI
    return "Tive um pequeno problema técnico ao consultar o cardápio. Tente novamente! 🍢";
  }
};
