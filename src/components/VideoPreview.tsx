import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PlayCircle, AlertCircle, CheckCircle2, Clock, Share2, Copy, X, Twitter, Facebook, Download, Info } from 'lucide-react';
import { VideoJob } from '../types';
import { cn } from '../lib/utils';

interface VideoPreviewProps {
  job: VideoJob | null;
}

export function VideoPreview({ job }: VideoPreviewProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);

  // Simulation technical logs for fallback
  const technicalLogs = [
    "Initializing neural engine...",
    "Allocating GPU memory pools (16GB VRAM)...",
    "Loading Hunyuan weights @ FP16...",
    "Processing text embedding (Transformer v4)...",
    "Synthesizing latent noise field...",
    "Injecting temporal coherence vectors...",
    "Iterative denoising: Batch 1/24...",
    "Iterative denoising: Batch 8/24...",
    "Synthesizing high-frequency details...",
    "Up-scaling resolution to 4K cinematic...",
    "Compiling bitstream...",
    "Finalizing container (MP4/H.265)...",
    "Finalizing cinematic export..."
  ];

  // Sync real and simulated progress
  useEffect(() => {
    let interval: any;
    
    if (job?.status === 'pending') {
      setDisplayProgress(5);
      setDisplayLogs(["Queue accepted. Waiting for GPU slot..."]);
    } else if (job?.status === 'processing') {
      // Use real progress if available, otherwise simulate
      if (job.progress && job.progress > 0) {
        setDisplayProgress(job.progress);
        if (job.logs && job.logs.length > 0) {
          setDisplayLogs(job.logs.slice(-4));
        } else {
          // Keep at least some simulated logs if real ones are empty
          const logIndex = Math.floor((job.progress / 100) * technicalLogs.length);
          setDisplayLogs(prev => [...prev.slice(-3), technicalLogs[logIndex] || technicalLogs[technicalLogs.length - 1]]);
        }
      } else {
        // Full simulation fallback (same as before but using displayProgress state)
        setDisplayLogs([technicalLogs[0]]);
        interval = setInterval(() => {
          setDisplayProgress(prev => {
            if (prev >= 98) return 98;
            const inc = prev < 30 ? 1 : prev < 70 ? 0.4 : prev < 90 ? 0.2 : 0.05;
            const next = Math.min(98, prev + inc);
            const logIndex = Math.floor((next / 100) * technicalLogs.length);
            setDisplayLogs(prevLogs => {
              const nextLog = technicalLogs[logIndex];
              if (prevLogs[prevLogs.length - 1] === nextLog) return prevLogs;
              return [...prevLogs.slice(-3), nextLog];
            });
            return next;
          });
        }, 400);
      }
    } else if (job?.status === 'completed') {
      setDisplayProgress(100);
      setDisplayLogs(["Task complete. Video synthesized successfully."]);
    } else {
      setDisplayProgress(0);
      setDisplayLogs([]);
    }

    return () => clearInterval(interval);
  }, [job?.status, job?.progress, job?.logs]);

  if (!job) {
    return (
      <div className="w-full aspect-video rounded-2xl border border-dashed border-neutral-800 flex flex-col items-center justify-center text-neutral-600 gap-4 bg-neutral-950/20">
        <PlayCircle className="w-12 h-12 stroke-[1px]" />
        <p className="text-sm font-medium tracking-tight">Your video will appear here after generation</p>
      </div>
    );
  }

  const handleCopyUrl = async () => {
    if (job.videoUrl) {
      await navigator.clipboard.writeText(job.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=Check out this AI video I generated!&url=${encodeURIComponent(job.videoUrl || '')}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(job.videoUrl || '')}`,
  };

  const getErrorDetails = (error: string) => {
    const lowerError = error?.toLowerCase() || '';
    if (lowerError.includes('safety') || lowerError.includes('nsfw') || lowerError.includes('content filter')) {
      return {
        title: "Policy Violation",
        description: "The neural engine identified one or more terms that conflict with our safety protocols. Please refine your prompt to be more descriptive and less ambiguous.",
        suggestion: "Avoid sensitive subjects, violence, or explicitly restricted terms.",
        icon: <AlertCircle className="w-12 h-12 text-orange-500" />
      };
    }
    if (lowerError.includes('quota') || lowerError.includes('credit') || lowerError.includes('insufficient funds')) {
      return {
        title: "Simulation Limit",
        description: "Your account has reached its daily synthesis quota. High-fidelity video generation requires significant neural compute resources.",
        suggestion: "Wait for your quota to reset or upgrade to a premium rendering tier.",
        icon: <AlertCircle className="w-12 h-12 text-yellow-500" />
      };
    }
    if (lowerError.includes('timeout') || lowerError.includes('too long')) {
      return {
        title: "Temporal Link Sync Error",
        description: "The rendering pipeline timed out. The neural synthesis of complex high-fidelity frames can sometimes exceed expected thresholds.",
        suggestion: "Try simplifying your prompt or reducing the scene complexity.",
        icon: <Clock className="w-12 h-12 text-blue-500" />
      };
    }
    return {
      title: "Synthesis Failed",
      description: error || "The neural studio encountered an unexpected interruption. This could be due to memory overflows or bitstream compilation errors.",
      suggestion: "Verify your prompt settings and try again in a few moments.",
      icon: <AlertCircle className="w-12 h-12 text-red-500" />
    };
  };

  const errorDetails = job?.status === 'failed' ? getErrorDetails(job.error || '') : null;

  return (
    <div className="w-full space-y-4">
      <div className={cn(
        "relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl",
        job.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[600px] mx-auto' : 'aspect-video'
      )}>
        <AnimatePresence mode="wait">
          {job.status === 'completed' && job.videoUrl ? (
            <motion.video
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={job.videoUrl}
              poster={job.previewUrl || `${job.videoUrl}#t=0.001`}
              controls
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          ) : job.status === 'failed' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center justify-center p-10 text-center gap-6 bg-black/40"
            >
              <div className="relative">
                {errorDetails?.icon}
                <div className="absolute inset-0 blur-3xl opacity-20 bg-red-500" />
              </div>
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-medium text-white tracking-tight">
                    {errorDetails?.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                    {errorDetails?.description}
                  </p>
                </div>
                
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-left space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">System Suggestion</span>
                  <p className="text-[11px] text-neutral-300">
                    {errorDetails?.suggestion}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-xs font-semibold px-6 py-2 bg-white text-neutral-950 rounded-lg hover:bg-neutral-200 transition-all active:scale-95"
                  >
                    Try Again
                  </button>
                  <a 
                    href="https://fal.ai/docs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Documentation
                  </a>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-6 relative overflow-hidden"
            >
              {/* Animated Neural Background */}
              <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-900/40" />
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] mix-blend-overlay"
                />
              </div>

              {/* Live Badge */}
              <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-2 py-1 bg-red-600/10 border border-red-500/20 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Live Synthesis</span>
              </div>

              <div className="relative z-10 space-y-6 w-full max-w-xs">
                <div className="relative inline-block">
                  <Loader2 className="w-16 h-16 text-blue-500 animate-spin stroke-[1px]" />
                  <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 px-1">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Neural Core
                    </span>
                    <span className="font-mono">{Math.round(displayProgress)}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-neutral-800/50 rounded-full overflow-hidden border border-neutral-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${displayProgress}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    />
                  </div>

                  {/* Pseudo Logs */}
                  <div className="p-4 bg-black/40 backdrop-blur-md rounded-xl border border-neutral-800/50 text-left space-y-1.5 min-h-[100px] flex flex-col justify-end">
                    <AnimatePresence mode="popLayout">
                      {displayLogs.map((log, i) => (
                        <motion.div
                          key={log + i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "text-[10px] font-mono flex items-start gap-2",
                            i === displayLogs.length - 1 ? "text-blue-400 font-bold" : "text-neutral-600"
                          )}
                        >
                          <span className="opacity-50">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                          <span className="flex-1 truncate">{log}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold animate-pulse">
                    Processing Cinematic Latents...
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDetailsModalOpen(true)}
            className="group flex flex-col hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Job ID</span>
              <Info className="w-2.5 h-2.5 text-neutral-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-xs font-mono text-neutral-400">#{job.id.slice(0, 8)}</span>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Status</span>
            <div className="flex items-center gap-1">
              {job.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              {job.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-500" />}
              <span className={cn(
                "text-xs font-medium capitalize",
                job.status === 'completed' ? "text-green-500" :
                job.status === 'failed' ? "text-red-500" :
                "text-blue-500"
              )}>
                {job.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {job.status === 'completed' && job.videoUrl && (
            <>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="text-xs font-semibold px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 rounded-lg transition-all flex items-center gap-2"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
              <a
                href={job.videoUrl}
                download={`lumina-clip-${job.id.slice(0, 8)}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 rounded-lg transition-all flex items-center gap-2"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-medium text-lg text-neutral-100">Job Metadata</h3>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-1 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Prompt</label>
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-relaxed text-neutral-300">
                    {job.prompt}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Style</label>
                    <div className="text-sm font-medium text-neutral-100">{job.style}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Aspect Ratio</label>
                    <div className="text-sm font-medium text-neutral-100">{job.aspectRatio}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Status</label>
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        job.status === 'completed' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                        job.status === 'failed' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                        "bg-blue-500 animate-pulse"
                      )} />
                      <span className="text-sm font-medium text-neutral-100 capitalize">{job.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Job ID</label>
                    <div className="text-xs font-mono text-neutral-400">#{job.id}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Fal Request ID</label>
                  <div className="text-xs font-mono text-neutral-400 truncate">
                    {job.falRequestId || 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Created</label>
                    <div className="text-[11px] text-neutral-400">
                      {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleString() : 'Pending...'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Last Synced</label>
                    <div className="text-[11px] text-neutral-400">
                      {job.updatedAt?.toDate ? job.updatedAt.toDate().toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-sm font-semibold transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-medium text-lg text-neutral-100">Share Studio Clip</h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Video URL
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-400 truncate">
                      {job.videoUrl}
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className={cn(
                        "p-2 rounded-lg border transition-all",
                        copied 
                          ? "bg-green-500/10 border-green-500/50 text-green-400" 
                          : "bg-neutral-800 border-neutral-700 hover:border-neutral-600 text-neutral-300"
                      )}
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-medium transition-all group"
                  >
                    <Twitter className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    Twitter
                  </a>
                  <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-medium transition-all group"
                  >
                    <Facebook className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    Facebook
                  </a>
                </div>
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-sm font-semibold transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
