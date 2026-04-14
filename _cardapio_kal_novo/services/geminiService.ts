import { MenuItem } from '../types';

export const getGeminiResponse = async (
    prompt: string,
    systemInstruction: string,
    menuItems: MenuItem[]
): Promise<string> => {
    try {
        const menuList = menuItems.map(item => {
          let str = `- ${item.name} (${item.category}): R$ ${item.price.toFixed(2)}`;
          if (item.isTopSeller) str += ` [🔥 O MAIS VENDIDO DA LOJA | NOTA: ${item.rating}]`;
          else if (item.rating) str += ` [Nota: ${item.rating}]`;
          str += ` | ${item.description}`;
          return str;
        }).join('\n');

        const res = await fetch('/api/bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userMessage: prompt,
                systemInstruction,
                currentMenuString: menuList
            })
        });

        const data = await res.json();
        return data.text || "Ops! Algo deu errado ao tentar me comunicar com a cozinha.";
    } catch (error) {
        console.error("Erro no serviço frontend Gemini:", error);
        return "Tive um pequeno problema técnico ao consultar o cardápio. Tente novamente! 🍢";
    }
};
