
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { IngestionStep } from '../types';

interface SmartInputProps {
  onProcess: (text: string, image?: string) => void;
  isProcessing: boolean;
  ingestionStep: IngestionStep;
}

const SmartInput: React.FC<SmartInputProps> = ({ onProcess, isProcessing, ingestionStep }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isProcessing || (!text.trim() && !image)) return;
    
    onProcess(text, image?.split(',')[1] || undefined);
    setText('');
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const getStepLabel = () => {
    switch(ingestionStep) {
      case 'MASKING': return 'Scanning for PII...';
      case 'ANALYSIS': return 'Gemini Cognitive Analysis...';
      case 'EMBEDDING': return 'Generating Vector State...';
      default: return 'Processing...';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/95 to-transparent z-50">
      <div className="max-w-4xl mx-auto">
        {isProcessing && (
          <div className="mb-4 flex items-center justify-center gap-3 animate-pulse">
            <div className="flex gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${ingestionStep === 'MASKING' ? 'bg-blue-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${ingestionStep === 'ANALYSIS' ? 'bg-blue-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${ingestionStep === 'EMBEDDING' ? 'bg-blue-500' : 'bg-gray-600'}`} />
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{getStepLabel()}</span>
          </div>
        )}

        <form 
          onSubmit={handleSubmit} 
          className={`relative flex flex-col w-full transition-all duration-300 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-[24px] shadow-2xl overflow-hidden
            ${isProcessing ? 'border-blue-500/30' : 'focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}
          `}
        >
          {image && (
            <div className="px-4 pt-4 flex gap-2">
              <div className="relative group">
                <img src={image} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-700" />
                <button 
                  type="button" 
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-gray-950 text-white rounded-full p-1 border border-gray-700 hover:bg-red-600 transition-all shadow-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 p-2 px-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-all"
            >
              <Icons.Image />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
              placeholder="Store a memory or query vault..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-[15px] text-gray-100 placeholder-gray-500 min-h-[44px] max-h-[160px]"
              disabled={isProcessing}
            />

            <div className="flex items-center gap-1 pb-1">
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-3 rounded-full transition-all ${isRecording ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
              >
                <Icons.Mic />
              </button>
              
              <button
                type="submit"
                disabled={isProcessing || (!text.trim() && !image)}
                className={`p-3 rounded-full transition-all shadow-xl ${isProcessing || (!text.trim() && !image) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                )}
              </button>
            </div>
          </div>
        </form>
        
        <p className="text-[9px] text-center text-gray-600 mt-4 font-bold uppercase tracking-[0.2em]">
          End-to-End Encrypted <span className="mx-2 text-gray-800">|</span> Zero Trust Vault
        </p>

        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      </div>
    </div>
  );
};

export default SmartInput;
