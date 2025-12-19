
import React from 'react';
import { MemoryRecord } from '../types';
import { Icons } from '../constants';

interface MemoryCardProps {
  memory: MemoryRecord;
  onDelete: (id: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onDelete }) => {
  const getImportanceColor = (score: number) => {
    if (score >= 8) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (score >= 5) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all group relative overflow-hidden backdrop-blur-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getImportanceColor(memory.importance)}`}>
            Rank {memory.importance}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-gray-400 border border-gray-700">
            {memory.category}
          </span>
        </div>
        <button 
          onClick={() => onDelete(memory.id)}
          className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
          title="Purge Memory"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>

      <h3 className="text-lg font-semibold text-gray-100 mb-2 group-hover:text-blue-400 transition-colors">
        {memory.title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
        {memory.summary}
      </p>

      {memory.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden aspect-video w-full border border-gray-700/50 bg-gray-900/50">
          <img src={memory.imageUrl} alt="Context" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {memory.entities.slice(0, 4).map((entity, i) => (
          <span key={i} className="px-2 py-1 bg-blue-500/5 text-blue-300/80 rounded border border-blue-500/10 text-[9px] uppercase tracking-tighter font-semibold">
            {entity.name}
          </span>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
          <Icons.Shield />
          <span className="text-emerald-500/80">PII Redacted</span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">
          {new Date(memory.timestamp).toLocaleDateString()}
        </span>
      </div>

      {memory.privacyAlerts && memory.privacyAlerts.length > 0 && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </div>
      )}
    </div>
  );
};

export default MemoryCard;
