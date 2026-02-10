import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

export const getGeminiResponse = async (
  userMessage: string, 
  systemInstruction: string,
  currentMenu: MenuItem[]
): Promise<string> => {
  try {
    // 1. Acesso seguro à variável de ambiente (previne crash se process não existir)
    let apiKey = '';
    try {
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      console.warn("Ambiente sem process.env:", e);
    }

    if (!apiKey) {
      console.error("API Key is missing");
      return "Desculpe, o sistema está sem a chave de segurança (API Key). Avise o gerente! 😅";
    }

    // 2. Inicialização do cliente
    const ai = new GoogleGenAI({ apiKey });

    // 3. Preparação do contexto
    const menuList = currentMenu.map(item => 
      `- ${item.name} (${item.category}): R$ ${item.price.toFixed(2)} | ${item.description}`
    ).join('\n');

    const fullSystemInstruction = `${systemInstruction}
    
    [CONTEXTO DO CARDÁPIO ATUAL]:
    ${menuList}
    `;

    // 4. Timeout de segurança (30 segundos)
    // Aumentado para 30s para evitar erros em conexões lentas ou cold starts do modelo
    const timeoutMs = 30000;
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    );

    // 5. Chamada à API com Race Condition
    const apiCall = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: fullSystemInstruction,
      },
    });

    const response = await Promise.race([apiCall, timeoutPromise]);

    // 6. Retorno do texto
    return response.text || "Hmm, não consegui pensar em uma resposta. Pode tentar de novo? 🤔";

  } catch (error: any) {
    console.error("Erro no serviço Gemini:", error);
    
    if (error.message === 'TIMEOUT') {
      return "Estou demorando um pouco mais que o normal para pensar. Por favor, pergunte novamente! 🐢";
    }
    
    return "Tive um pequeno problema técnico ao consultar o cardápio. Tente novamente! 🍢";
  }
};