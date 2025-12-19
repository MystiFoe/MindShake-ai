import { useState, useEffect } from 'react';
import { MemoryRecord, QueryResponse } from '../types';
import { getEmbedding, synthesizeAnswer, expandQuery } from '../services/gemini_client';

const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return (magA && magB) ? dotProduct / (magA * magB) : 0;
};

const calculateAgenticScore = (
  query: string, 
  concepts: string[] = [], 
  record: MemoryRecord
): { keywordScore: number, conceptScore: number, titleBoost: number } => {
  const content = `${record.title || ''} ${record.summary || ''} ${record.category || ''} ${record.originalText || ''}`.toLowerCase();
  const title = (record.title || '').toLowerCase();
  
  // 1. Keyword Overlap (Exclude common stop words)
  const stopWords = new Set(['when', 'will', 'the', 'and', 'for', 'with', 'that']);
  const rawTerms = (query || "").toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  let rawMatches = 0;
  rawTerms.forEach(t => { if (content.includes(t)) rawMatches++; });
  const keywordScore = rawTerms.length > 0 ? rawMatches / rawTerms.length : 0;

  // 2. Conceptual Reasoning (Bridges the gap between "cake" and "birthday")
  let conceptMatches = 0;
  const safeConcepts = Array.isArray(concepts) ? concepts : [];
  safeConcepts.forEach(concept => {
    if (!concept) return;
    const c = concept.toLowerCase();
    const hasEntityMatch = (record.entities || []).some(e => 
      e.name && (e.name.toLowerCase().includes(c) || c.includes(e.name.toLowerCase()))
    );
    if (content.includes(c) || hasEntityMatch) conceptMatches++;
  });
  const conceptScore = safeConcepts.length > 0 ? conceptMatches / safeConcepts.length : 0;

  // 3. Heuristic Boosts
  let titleBoost = 0;
  safeConcepts.forEach(c => { if (c && title.includes(c.toLowerCase())) titleBoost += 0.2; });
  rawTerms.forEach(t => { if (title.includes(t)) titleBoost += 0.25; });

  return { keywordScore, conceptScore, titleBoost: Math.min(titleBoost, 0.5) };
};

export const useSemanticSearch = (query: string, memories: MemoryRecord[]) => {
  const [results, setResults] = useState<QueryResponse>({
    answer: '',
    sources: [],
    confidence: 0,
    isThinking: false
  });

  useEffect(() => {
    if (!query || !query.trim()) {
      setResults({ answer: '', sources: memories || [], confidence: 1, isThinking: false });
      return;
    }

    const performSearch = async () => {
      setResults(prev => ({ ...prev, isThinking: true }));
      try {
        // STEP 1: Cognitive Expansion (Bridges intent to concepts)
        const { expandedQuery, concepts } = await expandQuery(query);

        // STEP 2: Vector Search (Optional fallback)
        const queryEmbedding = await getEmbedding(expandedQuery, true);
        const hasQueryVector = Array.isArray(queryEmbedding) && queryEmbedding.length > 0;

        // STEP 3: Scored Retrieval
        const scoredMemories = await Promise.all((memories || []).map(async (m) => {
          let vectorScore = 0;
          if (hasQueryVector) {
            const mEmbedding = m.embedding || await getEmbedding(`${m.title} ${m.summary}`, false);
            if (!m.embedding && mEmbedding && mEmbedding.length > 0) m.embedding = mEmbedding;
            vectorScore = cosineSimilarity(queryEmbedding, mEmbedding || []);
          }
          
          const { keywordScore, conceptScore, titleBoost } = calculateAgenticScore(query, concepts, m);
          
          // WEIGHTS: Prioritize Conceptual matching (0.5) and Title matching (boost)
          const finalScore = (vectorScore * 0.3) + (conceptScore * 0.5) + (keywordScore * 0.2) + titleBoost;
          
          return { ...m, score: Math.min(finalScore, 1.0) };
        }));

        // STEP 4: Threshold Filtering (Lowered to 0.08 to catch conceptual reasoning)
        const topSources = scoredMemories
          .filter(m => (m as any).score > 0.08)
          .sort((a, b) => (b as any).score - (a as any).score)
          .slice(0, 6);

        // STEP 5: Synthesis
        let answer = '';
        if (topSources.length > 0) {
          answer = await synthesizeAnswer(query, topSources);
        } else {
          answer = "I've analyzed your question against all stored concepts, but I couldn't find a memory that bridges to this intent.";
        }

        setResults({
          answer,
          sources: topSources.length > 0 ? topSources : [],
          confidence: (topSources[0] as any)?.score || 0,
          isThinking: false
        });

      } catch (error) {
        console.error("Search Pipeline Crash:", error);
        setResults({
          answer: "The memory retrieval pipeline encountered an error during reasoning.",
          sources: [],
          confidence: 0,
          isThinking: false
        });
      }
    };

    const timer = setTimeout(performSearch, 500); 
    return () => clearTimeout(timer);
  }, [query, memories]);

  return results;
};