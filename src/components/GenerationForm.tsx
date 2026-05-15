import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Video, Layers, Wand2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { VideoStyle, AspectRatio } from '../types';

interface GenerationFormProps {
  onGenerate: (data: { prompt: string; style: VideoStyle; aspectRatio: AspectRatio }) => void;
  isLoading: boolean;
}

const styles: { value: VideoStyle; label: string; icon: any; description: string }[] = [
  { value: '2D Anime', label: 'Anime', icon: Wand2, description: 'Vibrant, hand-drawn aesthetic' },
  { value: '3D Pixar-style', label: '3D Pixar', icon: ImageIcon, description: 'Soft, cinematic 3D renders' },
  { value: 'Classic Comic', label: 'Comic', icon: Layers, description: 'Golden age comic book feel' },
];

const ratios: { value: string; label: string; icon: any }[] = [
  { value: '16:9', label: '16:9 (Landscape)', icon: Video },
  { value: '9:16', label: '9:16 (Portrait)', icon: Video },
  { value: 'custom', label: 'Custom Ratio', icon: Settings2 },
];

export function GenerationForm({ onGenerate, isLoading }: GenerationFormProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<VideoStyle>('2D Anime');
  const [aspectRatioMode, setAspectRatioMode] = useState<string>('16:9');
  const [customRatio, setCustomRatio] = useState('1:1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const finalRatio = aspectRatioMode === 'custom' ? customRatio : aspectRatioMode;
    onGenerate({ prompt, style, aspectRatio: finalRatio as AspectRatio });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto p-4">
      {/* Prompt Input */}
      <div className="space-y-2">
        <label htmlFor="prompt" className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          Scene Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your cinematic masterpiece..."
          className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-neutral-700"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Style Selector */}
        <div className="space-y-4">
          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Artistic Style
          </label>
          <div className="grid grid-cols-1 gap-2">
            {styles.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border text-left transition-all",
                  style === s.value
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                )}
                disabled={isLoading}
              >
                <s.icon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[10px] opacity-60 uppercase tracking-tighter">{s.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ratio Selector */}
        <div className="space-y-4">
          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-1 gap-2">
            {ratios.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setAspectRatioMode(r.value)}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border text-left transition-all",
                  aspectRatioMode === r.value
                    ? "bg-purple-600/10 border-purple-500/50 text-purple-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                )}
                disabled={isLoading}
              >
                <r.icon className={cn("w-5 h-5", r.value === '9:16' ? 'rotate-90' : '')} />
                <div className="text-sm font-medium">{r.label}</div>
              </button>
            ))}
            
            <AnimatePresence>
              {aspectRatioMode === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    value={customRatio}
                    onChange={(e) => setCustomRatio(e.target.value)}
                    placeholder="e.g., 21:9 or 1:1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 mt-1 focus:border-purple-500/50 outline-none transition-colors"
                    disabled={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className={cn(
          "w-full py-4 rounded-xl font-display font-semibold transition-all flex items-center justify-center gap-2",
          isLoading
            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            : "bg-neutral-100 text-neutral-950 hover:bg-white active:scale-95 shadow-lg shadow-white/5"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
            Queuing Generation...
          </div>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Studio Quality Video
          </>
        )}
      </button>
    </form>
  );
}
