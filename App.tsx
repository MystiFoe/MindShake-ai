import { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from './constants';
import { MemoryRecord, MemoryCategory, IngestionStep } from './types';
import { maskPII } from './services/privacy_guard';
import { processMemory, getEmbedding } from './services/gemini_client';
import { useSemanticSearch } from './hooks/useSearch';
import SmartInput from './components/SmartInput';
import MemoryCard from './components/MemoryCard';
import IntelligenceBlock from './components/IntelligenceBlock';

const App: React.FC = () => {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ingestionStep, setIngestionStep] = useState<IngestionStep>('IDLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const semanticResults = useSemanticSearch(searchQuery, memories);

  useEffect(() => {
    const saved = localStorage.getItem('memora_records');
    if (saved) {
      setMemories(JSON.parse(saved));
    }
  }, []);

  const handleProcessMemory = async (text: string, image?: string) => {
    setIsProcessing(true);
    try {
      setIngestionStep('MASKING');
      const maskedText = maskPII(text);
      
      setIngestionStep('ANALYSIS');
      const analysis = await processMemory(maskedText, image);
      
      setIngestionStep('EMBEDDING');
      // Using RETRIEVAL_DOCUMENT task type for storage
      const embedding = await getEmbedding(`${analysis.title} ${analysis.summary}`, false);

      const newRecord: MemoryRecord = {
        id: crypto.randomUUID(),
        originalText: text, 
        maskedText,
        title: analysis.title,
        summary: analysis.summary,
        importance: analysis.importance,
        category: analysis.category,
        entities: analysis.entities,
        imageUrl: image ? `data:image/jpeg;base64,${image}` : undefined,
        timestamp: Date.now(),
        privacyAlerts: analysis.privacyRisks,
        embedding
      };

      const updated = [newRecord, ...memories];
      setMemories(updated);
      localStorage.setItem('memora_records', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
      alert("Intelligence layer error. Please ensure your API key is configured.");
    } finally {
      setIsProcessing(false);
      setIngestionStep('IDLE');
    }
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    localStorage.setItem('memora_records', JSON.stringify(updated));
  };

  const vaultStats = useMemo(() => {
    return {
      total: memories.length,
      highPriority: memories.filter(m => m.importance >= 8).length,
      lastUpdated: memories.length > 0 ? new Date(Math.max(...memories.map(m => m.timestamp))).toLocaleTimeString() : 'N/A'
    };
  }, [memories]);

  const displayMemories = searchQuery.trim() 
    ? semanticResults.sources 
    : memories.filter(m => activeCategory === 'All' || m.category === activeCategory);

  const sidebarItems = ['All', ...Object.values(MemoryCategory)];

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-100 overflow-hidden">
      <aside className="w-64 border-r border-gray-800 bg-[#0d1117] flex-shrink-0 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Icons.Brain />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Memora</h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Enterprise v3</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item}
                onClick={() => setActiveCategory(item)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === item 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-800 space-y-4">
          <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-3">Vault Metrics</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Memories</span>
                <span className="text-white font-mono">{vaultStats.total}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Critical Priority</span>
                <span className="text-red-400 font-mono">{vaultStats.highPriority}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative pb-44">
        <header className="sticky top-0 z-40 bg-[#0d1117]/80 backdrop-blur-xl border-b border-gray-800/50 px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-6">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Icons.Search />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query your cognitive vault (e.g., 'When will I cut the cake?')..."
                className="w-full bg-gray-900 border border-gray-700 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500/30 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-8 py-10">
          <IntelligenceBlock 
            answer={semanticResults.answer} 
            isThinking={semanticResults.isThinking} 
            confidence={semanticResults.confidence}
            hasSources={semanticResults.sources.length > 0}
            onShowSources={() => resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />

          <div ref={resultsContainerRef} className="flex items-baseline justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {searchQuery.trim() ? 'Semantic Hits' : 'Active Intel'}
              </h2>
            </div>
          </div>

          {displayMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-800 rounded-[32px]">
              <div className="bg-gray-800/20 p-6 rounded-full mb-4 text-gray-600">
                <Icons.Shield />
              </div>
              <h3 className="text-lg font-medium text-gray-400">Vault scope is empty</h3>
              <p className="text-xs text-gray-600 max-w-xs mt-2">No records found matching your filters or semantic query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayMemories.map(memory => (
                <MemoryCard 
                  key={memory.id} 
                  memory={memory} 
                  onDelete={handleDeleteMemory} 
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SmartInput 
        onProcess={handleProcessMemory} 
        isProcessing={isProcessing} 
        ingestionStep={ingestionStep} 
      />
    </div>
  );
};

export default App;