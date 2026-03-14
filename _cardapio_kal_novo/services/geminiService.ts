import { MenuItem } from '../types';

export const getGeminiResponse = async (
    prompt: string,
    systemInstruction: string,
    menuItems: MenuItem[]
): Promise<string> => {
    // Simulando uma requisição à API para evitar erros e manter o design funcionando
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(
                "Este assistente virtual está atualmente em manutenção para trazer ainda mais novidades da Nita Quentinhas! Em breve poderei ajudar você com nosso cardápio completo."
            );
        }, 1500);
    });
};
