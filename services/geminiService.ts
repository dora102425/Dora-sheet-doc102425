import { GoogleGenAI } from "https://esm.run/@google/genai";
import type { Agent } from '../types';

let ai: GoogleGenAI;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

function renderTemplate(template: string, context: { [key: string]: string }): string {
    return template.replace(/\{\{input\}\}/g, context.input);
}


export const runAgent = async (agent: Agent, input: string): Promise<string> => {
    try {
        const genAI = getAi();
        const fullPrompt = renderTemplate(agent.user_prompt, { input });

        const response = await genAI.models.generateContent({
            model: agent.model,
            contents: fullPrompt,
            config: {
                systemInstruction: agent.system_prompt,
                temperature: agent.temperature,
                maxOutputTokens: agent.max_tokens,
                topP: agent.top_p,
            }
        });

        return response.text ?? '';
    } catch (error) {
        console.error("Error running agent:", error);
        if (error instanceof Error) {
            return `Error: ${error.message}`;
        }
        return "An unknown error occurred.";
    }
};

export const generateFollowUpQuestions = async (context: string): Promise<string> => {
    try {
        const genAI = getAi();
        const prompt = `Based on the following context, generate 3 insightful follow-up questions someone might ask. Format them as a numbered list.\n\nContext:\n${context}`;
        
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });

        return response.text ?? '';
    } catch (error) {
        console.error("Error generating follow-up questions:", error);
        if (error instanceof Error) {
            return `Error: ${error.message}`;
        }
        return "Could not generate follow-up questions.";
    }
};