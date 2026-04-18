import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
    try {
        const { userMessage, systemInstruction, currentMenuString } = await req.json();

        // Inicializar Supabase server-side usando o utilitário da casa
        const supabase = createClient();

        const { data: config } = await supabase
            .from('configuracoes')
            .select('gemini_api_key')
            .single();

        let apiKey = config?.gemini_api_key;
        
        // Fallback: se tiver no .env usar pra facilitar
        if (!apiKey) {
           apiKey = process.env.GEMINI_API_KEY;
        }

        if (!apiKey) {
            return NextResponse.json({
                text: "Este assistente virtual está atualmente em manutenção para trazer ainda mais novidades da Kal do Espetinho! Falta configuração da Chave API no painel."
            });
        }

        const fullSystemInstruction = `${systemInstruction}
        
    [CONTEXTO DO CARDÁPIO ATUAL]:
    ${currentMenuString}
    `;

        let responseText = "";

        if (apiKey.startsWith("sk-or-")) {
            // Requisição para OpenRouter
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001", // modelo de ótimo custo benefício no openrouter
                    messages: [
                        { role: "system", content: fullSystemInstruction },
                        { role: "user", content: userMessage }
                    ]
                })
            });

            if (!orRes.ok) {
                const errorText = await orRes.text();
                console.error("Erro OpenRouter:", errorText);
                return NextResponse.json({ text: `Ops! A API do OpenRouter retornou um erro estrutural. Veja: ${errorText}` });
            }

            const data = await orRes.json();
            responseText = data.choices?.[0]?.message?.content;
        } else {
            // Original Google Gen AI
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: userMessage,
                config: {
                    systemInstruction: fullSystemInstruction,
                },
            });
            responseText = response.text || "";
        }

        return NextResponse.json({
            text: responseText || "Hmm, não consegui pensar em uma resposta. Pode tentar de novo? 🤔"
        });

    } catch (error: any) {
        console.error("Erro na rota do bot Gemini:", error);
        return NextResponse.json(
            { text: `Tive um pequeno problema técnico ao consultar o cardápio. (Erro: ${error.message})` },
            { status: 500 }
        );
    }
}
