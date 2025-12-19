import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL } from "../constants";
import { ProcessingResult, MemoryRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert Data Archivist for Memora Enterprise. 
Analyze the input text and any visual context. 
1. Extract key entities (People, Organizations, Locations, Dates).
2. Summarize into a concise professional title and 1-2 sentence description.
3. Categorize accurately into: Business, Personal, Finance, Health, Technical, or Other.
4. Detect subtle context-based privacy leaks or high-risk info not caught by standard redaction.
5. Rate importance on a scale of 1-10.
Return strictly valid JSON.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    importance: { type: Type.NUMBER },
    category: { type: Type.STRING },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING }
        }
      }
    },
    privacyRisks: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ['title', 'summary', 'importance', 'category', 'entities', 'privacyRisks']
};

export const processMemory = async (text: string, base64Image?: string): Promise<ProcessingResult> => {
  try {
    const parts: any[] = [{ text: `Process this memory entry: "${text || 'No text provided'}"` }];
    if (base64Image) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
    }
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });
    return JSON.parse(response.text || '{}') as ProcessingResult;
  } catch (error) {
    console.error("Gemini Ingestion Error:", error);
    throw error;
  }
};

/**
 * expandQuery
 * Bridges the intent gap (e.g., "cake" -> "birthday").
 * Specifically tuned to recognize festive/event-based triggers.
 */
export const expandQuery = async (query: string): Promise<{ expandedQuery: string, concepts: string[] }> => {
  const systemInstruction = `You are the Intelligence Controller for a high-security vault.
Your task is to expand the user's conversational intent into structural concepts.

MAPPING LOGIC:
- Activity ("cut cake", "celebrate") -> Event ("birthday", "anniversary", "party")
- Document ("the deed", "the lease") -> Legal/Property ("house", "contract", "mortgage")
- Travel ("boarding", "gate") -> Logistics ("flight", "travel", "airport")

Return JSON: { "expandedQuery": string, "concepts": string[] }`;

  const prompt = `Deconstruct Query: "${query || ''}"`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        systemInstruction: systemInstruction,
        responseMimeType: "application/json" 
      }
    });
    
    const parsed = JSON.parse(response.text || '{}');
    return {
      expandedQuery: parsed.expandedQuery || query || "",
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : []
    };
  } catch (e) {
    return { expandedQuery: query || "", concepts: [] };
  }
};

/**
 * getEmbedding
 * Generates vector representations. 
 * SOLVES: "Value must be a list given an array path requests[]"
 * By using batchEmbedContents, we satisfy the API's requirement for a list structure.
 */
export const getEmbedding = async (text: string, isQuery: boolean = true): Promise<number[]> => {
  const modelId = "models/text-embedding-004";
  const safeText = (text || " ").trim().substring(0, 1000) || " ";
  
  try {
    // Explicitly use batchEmbedContents to avoid the 'requests[]' schema error
    // which occurs when the API expects a list of requests.
    const response = await (ai.models as any).batchEmbedContents({
      model: modelId,
      requests: [{
        model: modelId,
        content: { parts: [{ text: safeText }] },
        taskType: isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT"
      }]
    });

    if (response?.embeddings?.[0]?.values) {
      return response.embeddings[0].values;
    }
  } catch (error: any) {
    console.warn("Batch embedding failed, trying standard fallback...", error?.message);
    try {
      // Standard fallback for non-batch environments
      const fallback = await ai.models.embedContent({
        model: modelId,
        content: { parts: [{ text: safeText }] },
        taskType: isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT"
      });
      return fallback?.embedding?.values || [];
    } catch (e) {
      console.error("Critical: All embedding paths failed.");
      return [];
    }
  }
  return [];
};

export const synthesizeAnswer = async (query: string, context: MemoryRecord[]): Promise<string> => {
  if (!context || context.length === 0) return "";
  
  const contextStr = (context || []).map(m => 
    `[Record: ${m.title || 'Untitled'} | Date: ${new Date(m.timestamp).toDateString()}]\nSummary: ${m.summary || ''}\nText: ${m.originalText || ''}`
  ).join('\n\n---\n\n');

  const prompt = `Assistant Identity: Agentic Memory Vault
Today's Date: ${new Date().toDateString()}
User Query: "${query || ''}"

Retrieved Context:
${contextStr}

Instructions:
1. Link conversational intent to facts (e.g. "cut cake" is "Birthday").
2. Calculate time differences based on Today's Date.
3. Be direct and warm. Use ONLY the provided context.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "I found relevant records but couldn't synthesize a precise answer.";
  } catch (error) {
    console.error("Synthesis error:", error);
    return "Synthesis engine offline.";
  }
};