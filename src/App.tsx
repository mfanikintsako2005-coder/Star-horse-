import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, where, orderBy, limit, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { GenerationForm } from './components/GenerationForm';
import { VideoPreview } from './components/VideoPreview';
import { VideoJob, VideoStyle, AspectRatio } from './types';
import { handleFirestoreError, OperationType } from './lib/utils';
import { Film, History, LogOut, Sparkles, User as UserIcon, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from './components/AuthModal';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [history, setHistory] = useState<VideoJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsReady(true);
    });
  }, []);

  // Listen to user's history
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'videos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const h = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoJob));
      setHistory(h);
      
      // If there's an active job in progress, update currentJob reference
      if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
        const updated = h.find(j => j.id === currentJob.id);
        if (updated) {
          setCurrentJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            setIsGenerating(false);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'videos', auth);
    });
  }, [user, currentJob?.id, currentJob?.status]);

  const handleGenerate = async (data: { prompt: string; style: VideoStyle; aspectRatio: AspectRatio }) => {
    if (!user) return;

    setIsGenerating(true);
    const path = 'videos';
    
    try {
      // 1. Create job in Firestore
      const jobData = {
        userId: user.uid,
        prompt: data.prompt,
        style: data.style,
        aspectRatio: data.aspectRatio,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, path), jobData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path, auth);
      }
      
      const newJob = { id: docRef.id, ...jobData } as unknown as VideoJob;
      setCurrentJob(newJob);

      // 2. Transition to processing state immediately
      try {
        await updateDoc(doc(db, path, docRef.id), {
          status: 'processing',
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to set processing state", error);
      }

      // 3. Trigger Server-side generation
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, jobId: docRef.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to start generation');
      }

      const result = await response.json();
      
      // Update job with request ID
      try {
        await updateDoc(doc(db, path, docRef.id), {
          falRequestId: result.request_id || result.id,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${path}/${docRef.id}`, auth);
      }

      // 4. Update with final results
      if (result.video?.url) {
        try {
          await updateDoc(doc(db, path, docRef.id), {
            status: 'completed',
            videoUrl: result.video.url,
            previewUrl: result.image?.url,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `${path}/${docRef.id}`, auth);
        }
      } else if (result.error) {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error("Generation error:", error);
      if (currentJob) {
        try {
          await updateDoc(doc(db, path, currentJob.id), {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to update status to error", e);
        }
      }
      setIsGenerating(false);
    }
  };

  if (!isReady) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#0a0a0a_100%)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass p-12 rounded-[2rem] text-center space-y-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="space-y-6">
            <div className="relative inline-block">
              <Film className="w-16 h-16 text-blue-500 mx-auto" />
              <div className="absolute inset-0 blur-2xl bg-blue-500/30 -z-10" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-display font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500">
                Lumina AI Video
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                Experience the next generation of cinematic synthesis. Turn your imagination into high-fidelity video.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-4 px-6 bg-white text-neutral-950 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-[0.98] group shadow-xl shadow-white/5"
            >
              Get Started
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-600">
              Neural Studio Access
            </p>
          </div>

          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-neutral-800/50">
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-300">4K</div>
              <div className="text-[9px] text-neutral-500 uppercase tracking-widest leading-none">Output</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-300">GPU</div>
              <div className="text-[9px] text-neutral-500 uppercase tracking-widest leading-none">Powered</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-300">Fal</div>
              <div className="text-[9px] text-neutral-500 uppercase tracking-widest leading-none">Inference</div>
            </div>
          </div>
        </motion.div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navigation */}
      <nav className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-blue-500" />
            <span className="font-display font-semibold text-lg">Lumina <span className="text-neutral-500 font-normal">Studio</span></span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-neutral-900/50 rounded-lg border border-neutral-800">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full border border-neutral-700" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-blue-400" />
                </div>
              )}
              <span className="text-xs font-medium text-neutral-300 truncate max-w-[120px]">
                {user.displayName || user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Col: Form */}
        <div className="lg:col-span-7 space-y-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-medium">New Generation</h2>
            <p className="text-neutral-500 text-sm">Fine-tune your prompt and artistic direction below.</p>
          </div>
          <GenerationForm onGenerate={handleGenerate} isLoading={isGenerating} />
        </div>

        {/* Right Col: Preview & History */}
        <div className="lg:col-span-5 space-y-12">
          {/* Current Job */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Live Preview</h3>
              {isGenerating && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase">Rendering</span>
                </div>
              )}
            </div>
            <VideoPreview job={currentJob} />
          </div>

          {/* History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Studio Clips
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence initial={false}>
                {history.length > 0 ? (
                  history.map((job) => (
                    <motion.button
                      key={job.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setCurrentJob(job)}
                      className={cn(
                        "group flex items-center gap-4 p-3 rounded-xl border transition-all text-left",
                        currentJob?.id === job.id
                          ? "bg-neutral-900 border-neutral-700 ring-1 ring-neutral-700"
                          : "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                      )}
                    >
                      <div className="w-16 aspect-video rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0 relative">
                        {job.previewUrl ? (
                          <img src={job.previewUrl} className="w-full h-full object-cover" alt="" />
                        ) : job.videoUrl ? (
                          <video src={`${job.videoUrl}#t=0.001`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-neutral-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-neutral-950/40 group-hover:bg-transparent transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-neutral-200 truncate">{job.prompt}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-neutral-500 font-medium uppercase">{job.style}</span>
                          <span className="text-[10px] text-neutral-700">•</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            job.status === 'completed' ? "text-green-500" :
                            job.status === 'failed' ? "text-red-500" :
                            "text-blue-500"
                          )}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="py-12 text-center text-neutral-700 border border-dashed border-neutral-900 rounded-2xl">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs uppercase tracking-widest font-medium">Your history will appear here</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-900 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Film className="w-4 h-4" />
            <span className="text-xs font-medium tracking-tighter">Lumina Neural Video Studio v1.0.4 - Production Grade</span>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Collective</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Synth</a>
            <a href="#" className="hover:text-white transition-colors">Neural Assets</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
