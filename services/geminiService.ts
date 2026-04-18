import { MenuItem } from "../types";

export const getGeminiResponse = async (
  userMessage: string, 
  systemInstruction: string,
  currentMenu: MenuItem[]
): Promise<string> => {
  try {
    const menuList = currentMenu.map(item => {
      const price = item.price ?? (item as any).preco ?? 0;
      return `- ${item.name ?? (item as any).nome} (${item.category}): R$ ${Number(price).toFixed(2)} | ${item.description ?? (item as any).descricao}`;
    }).join('\n');

    const response = await fetch('/api/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        systemInstruction,
        currentMenuString: menuList
      })
    });

    if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
    }

    const data = await response.json();
    return data.text || "Hmm, não consegui pensar em uma resposta. Pode tentar de novo? 🤔";

  } catch (error: any) {
    console.error("Erro no serviço Gemini (Client):", error);
    return "Tive um pequeno problema técnico ao consultar o cardápio. Tente novamente! 🍢";
  }
};
