
import React, { useState, useEffect, useRef } from 'react';
import { GenerationState, ThemeOption } from './types';
import { THEMES, LOADING_MESSAGES } from './constants';
import { transformToChristmasAvatar, urlToBase64 } from './services/geminiService';
import confetti from 'canvas-confetti';

const GENERATION_LIMIT = 3;
const WINDOW_HOURS = 24;
const IS_HIBERNATING = true; // Set to true to disable the app for the off-season

const App: React.FC = () => {
  const [handle, setHandle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('classic');
  const [isExpanded, setIsExpanded] = useState(false);
  const [remainingToday, setRemainingToday] = useState(GENERATION_LIMIT);
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    originalImage: null,
    generatedImage: null,
    status: 'idle',
  });
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const resultRef = useRef<HTMLDivElement>(null);

  // Load and check limits whenever handle changes
  useEffect(() => {
    if (handle) {
      updateRemainingCount(handle.replace('@', '').toLowerCase());
    }
  }, [handle]);

  useEffect(() => {
    let interval: any;
    if (state.status === 'generating') {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state.status]);

  const updateRemainingCount = (cleanHandle: string) => {
    const log = JSON.parse(localStorage.getItem('xmas_usage_log') || '{}');
    const handleLog: number[] = log[cleanHandle] || [];
    const now = Date.now();
    const activeGenerations = handleLog.filter(ts => (now - ts) < (WINDOW_HOURS * 60 * 60 * 1000));
    setRemainingToday(Math.max(0, GENERATION_LIMIT - activeGenerations.length));
  };

  const recordGeneration = (cleanHandle: string) => {
    const log = JSON.parse(localStorage.getItem('xmas_usage_log') || '{}');
    const now = Date.now();
    const handleLog: number[] = log[cleanHandle] || [];
    const newLog = [...handleLog, now].filter(ts => (now - ts) < (WINDOW_HOURS * 60 * 60 * 1000));
    log[cleanHandle] = newLog;
    localStorage.setItem('xmas_usage_log', JSON.stringify(log));
    updateRemainingCount(cleanHandle);
  };

  const triggerCelebration = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 1000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 100 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#ef4444', '#eab308', '#ffffff', '#15803d'] });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#ef4444', '#eab308', '#ffffff', '#15803d'] });
    }, 250);
  };

  const handleFetchProfile = async () => {
    if (!handle || IS_HIBERNATING) return;
    const cleanHandle = handle.replace('@', '').toLowerCase();
    setState(prev => ({ ...prev, isLoading: true, status: 'fetching', error: null }));
    try {
      const avatarUrl = `https://unavatar.io/twitter/${cleanHandle}`;
      const base64 = await urlToBase64(avatarUrl);
      setState(prev => ({ ...prev, originalImage: base64, isLoading: false, status: 'idle' }));
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: "Profile lost in the blizzard. Try uploading manually.", status: 'idle' }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (IS_HIBERNATING) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, originalImage: reader.result as string, error: null, generatedImage: null, status: 'idle' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (themeId?: ThemeOption) => {
    if (IS_HIBERNATING) return;
    const targetThemeId = themeId || selectedTheme;
    const cleanHandle = handle ? handle.replace('@', '').toLowerCase() : 'anonymous';
    
    if (!state.originalImage) return;

    // Safety check on limit
    const log = JSON.parse(localStorage.getItem('xmas_usage_log') || '{}');
    const handleLog: number[] = log[cleanHandle] || [];
    const now = Date.now();
    const activeGenerations = handleLog.filter(ts => (now - ts) < (WINDOW_HOURS * 60 * 60 * 1000));
    
    if (activeGenerations.length >= GENERATION_LIMIT) {
      setState(prev => ({ ...prev, error: `Santa's workshop is full for @${cleanHandle}! Try again in 24 hours.`, status: 'idle' }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, status: 'generating', error: null }));
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const theme = THEMES.find(t => t.id === targetThemeId);
      const result = await transformToChristmasAvatar(state.originalImage, theme?.description || '');
      
      setState(prev => ({ ...prev, generatedImage: result, isLoading: false, status: 'completed' }));
      recordGeneration(cleanHandle);
      triggerCelebration();
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message || "The North Pole server is busy. Try again soon.", status: 'idle' }));
    }
  };

  const downloadImage = () => {
    if (!state.generatedImage) return;
    const link = document.createElement('a');
    link.href = state.generatedImage;
    link.download = `xmas-avatar-${handle || 'festive'}.png`;
    link.click();
  };

  const resetResultOnly = () => {
    setState(prev => ({ ...prev, generatedImage: null, status: 'idle', error: null }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearEverything = () => {
    setState({ isLoading: false, error: null, originalImage: null, generatedImage: null, status: 'idle' });
    setHandle('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const visibleThemes = isExpanded ? THEMES : THEMES.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Funny Breaking News Banner */}
      <div className={`w-full ${IS_HIBERNATING ? 'bg-slate-800' : 'bg-yellow-400'} py-3 text-white border-b-2 border-black/20 relative z-50 overflow-hidden shadow-lg transition-colors duration-1000`}>
        <div className="flex items-center justify-center gap-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap animate-pulse">
          {IS_HIBERNATING ? (
            <>
              <span>❆ SEASON FINALE: SANTA HAS OFFICIALLY LEFT THE BUILDING ❆</span>
              <span className="hidden sm:inline">REINDEER HIBERNATION ACTIVE</span>
              <span>❆ SEE YOU IN DECEMBER 2026 ❆</span>
            </>
          ) : (
            <>
              <span>🚨 BREAKING: SANTA SAYS YOUR CURRENT PROFILE PIC IS 'TOO BASIC'</span>
              <span className="hidden sm:inline">❆ REINDEER DECLARED A NO-FLY ZONE UNTIL AVATARS IMPROVE ❆</span>
              <span>🚨 ALCHEMY IN PROGRESS 🚨</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-24 flex flex-col items-center overflow-x-hidden">
        <header className="text-center mb-16 md:mb-28 space-y-6 md:space-y-8 animate-fade-in relative">
          <div className="inline-block px-6 py-2 bg-white/20 border border-white/40 rounded-full text-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-4 shadow-sm backdrop-blur-md">
            The 2025 Boutique Archive
          </div>
          <h1 className="text-7xl md:text-[11rem] font-christmas text-white text-shadow-xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] leading-[0.85] tracking-tight">
            X-Mas <span className="text-yellow-400 italic block mt-2 md:inline md:mt-0">Avatar</span>
          </h1>
          <p className="text-2xl md:text-4xl font-serif-elegant italic text-white/80 max-w-3xl mx-auto px-4 leading-relaxed">
            {IS_HIBERNATING 
              ? "The workshop is closed for the season. We're busy preparing next year's magic. See you in 2026!"
              : "Manifest your digital holiday soul. No more boring profile pictures—only pure festive alchemy."}
          </p>
        </header>

        <div className="w-full space-y-32 md:space-y-48">
          {/* Step 1: Input Section - High Contrast */}
          <section className={`bg-white/95 p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] flex flex-col md:flex-row items-center gap-10 md:gap-16 max-w-5xl mx-auto relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.3)] ring-1 ring-white group ${IS_HIBERNATING ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            {IS_HIBERNATING && (
              <div className="absolute inset-0 z-50 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-8 text-center pointer-events-none">
                <div className="bg-white px-8 py-4 rounded-3xl shadow-2xl border-4 border-slate-200 font-black text-slate-800 uppercase tracking-widest text-sm animate-bounce">
                  Inputs Disabled Until Next Season
                </div>
              </div>
            )}
            <div className="shimmer-sweep opacity-20"></div>
            <div className="flex-1 w-full space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <label className="text-[11px] md:text-[12px] font-black text-red-600 uppercase tracking-[0.3em] ml-1">Identity Origin</label>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-red-400 font-black text-lg">@</span>
                  <input
                    type="text"
                    disabled={IS_HIBERNATING}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="X handle"
                    className="w-full pl-12 pr-6 py-4 md:py-5 bg-red-50 border-2 border-red-100 rounded-3xl focus:ring-4 focus:ring-red-200 outline-none text-red-950 placeholder:text-red-200 transition-all font-semibold text-base md:text-lg shadow-inner disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={handleFetchProfile}
                  disabled={true} // Always disabled in hibernation
                  className="w-full sm:w-auto px-10 md:px-14 py-4 md:py-0 bg-slate-400 text-white font-black rounded-3xl transition-all shadow-xl whitespace-nowrap text-base md:text-lg tracking-widest uppercase cursor-not-allowed"
                >
                  Season Ended
                </button>
              </div>
            </div>

            <div className="hidden md:block h-24 w-px bg-red-100"></div>

            <div className="flex-1 w-full space-y-4 text-center md:text-left relative z-10">
              <label className="text-[11px] md:text-[12px] font-black text-red-600 uppercase tracking-[0.3em] ml-1">Physical Artifact</label>
              <div className="relative">
                <input
                  type="file"
                  disabled={IS_HIBERNATING}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-[11px] md:text-xs text-red-400 file:mr-5 file:py-3.5 md:file:py-4.5 file:px-7 md:file:px-9 file:rounded-2xl file:border-0 file:bg-red-50 file:text-red-600 hover:file:bg-red-100 cursor-pointer file:font-black file:transition-all file:uppercase file:tracking-widest border-2 border-dashed border-red-100 p-2 rounded-3xl disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Step 2: Theme Selection - Gallery (View Only in Hibernation) */}
          <section className="space-y-16 md:space-y-24">
            <div className="text-center md:text-left space-y-3 px-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="space-y-3">
                  <h3 className="text-5xl md:text-7xl font-serif-elegant font-bold text-white italic leading-none drop-shadow-lg">The Gallery Archive</h3>
                  <p className="text-white/60 uppercase tracking-[0.5em] text-[11px] md:text-[13px] font-black">Past manifestations & Future styles</p>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-8 py-3 bg-white/10 border border-white/30 rounded-full text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md"
                  >
                    {isExpanded ? 'Collapse Gallery' : 'View Entire Palette'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14 px-2 max-w-7xl mx-auto grid-expand-transition ${IS_HIBERNATING ? 'opacity-60' : ''}`}>
              {visibleThemes.map((theme, idx) => (
                <div
                  key={theme.id}
                  onClick={() => !IS_HIBERNATING && setSelectedTheme(theme.id)}
                  className={`group relative p-8 md:p-12 rounded-[2.5rem] border-2 transition-all duration-700 flex flex-col min-h-[400px] md:min-h-[460px] animate-fade-in ${!IS_HIBERNATING ? 'cursor-pointer' : 'cursor-default'} ${
                    selectedTheme === theme.id && !IS_HIBERNATING
                    ? 'border-red-600 bg-white theme-card-active scale-[1.05] z-20 shadow-2xl' 
                    : 'border-white/20 bg-white/90 hover:bg-white hover:border-red-200 z-10 shadow-xl'
                  }`}
                >
                  {IS_HIBERNATING && (
                    <div className="absolute top-6 right-6 bg-slate-800 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-30 shadow-lg">
                      Archived
                    </div>
                  )}
                  <div className="shimmer-sweep opacity-5 transition-opacity"></div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-8 flex items-center justify-between">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${selectedTheme === theme.id && !IS_HIBERNATING ? 'bg-red-600 text-white border-red-500 shadow-xl rotate-3' : 'bg-red-50 border-red-100 text-red-300'}`}>
                        <span className="text-2xl font-black">{idx + 1}</span>
                      </div>
                      
                      {!IS_HIBERNATING && (
                        <button 
                          disabled={true}
                          className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100"
                        >
                          Unavailable
                        </button>
                      )}
                    </div>
                    
                    <h4 className={`font-serif-elegant font-bold text-3xl md:text-5xl mb-6 transition-colors ${selectedTheme === theme.id && !IS_HIBERNATING ? 'text-red-600 italic' : 'text-slate-900'}`}>
                      {theme.label}
                    </h4>
                    <p className={`text-base md:text-lg leading-relaxed font-medium transition-colors line-clamp-4 mb-8 ${selectedTheme === theme.id && !IS_HIBERNATING ? 'text-slate-600' : 'text-slate-400'}`}>
                      {theme.description}
                    </p>

                    <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-100">
                       <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${selectedTheme === theme.id && !IS_HIBERNATING ? 'text-red-500' : 'text-slate-300'}`}>
                         Boutique No. {idx + 101}
                       </span>
                       <div className={`w-2 h-2 rounded-full ${selectedTheme === theme.id && !IS_HIBERNATING ? 'bg-red-600 animate-pulse' : 'bg-slate-100'}`}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Step 3: Transformation Section - HIBERNATION UI */}
          <section ref={resultRef} className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center pb-32 md:pb-40 pt-20 max-w-7xl mx-auto px-4 relative">
            <div className="space-y-8 md:space-y-12 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
              <div className="space-y-4 md:space-y-8">
                <h2 className="text-6xl md:text-8xl font-serif-elegant italic text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
                  {IS_HIBERNATING ? "See You" : "The"} <br/>
                  <span className="text-yellow-400 not-italic font-christmas text-[1.1em]">{IS_HIBERNATING ? "Next Year" : "Manifest"}</span>
                </h2>
                <p className="text-white/70 max-w-lg text-xl md:text-2xl leading-relaxed font-medium italic">
                  {IS_HIBERNATING 
                    ? "Santa's servers are sleeping. We'll reopen the manifest boutique in December 2026."
                    : "Witness the seasonal shift. Your recognized essence, refined by artisans."}
                </p>
              </div>
              
              <button
                disabled={true}
                className="group relative px-12 md:px-20 py-8 md:py-12 rounded-[2.5rem] bg-slate-700 text-white/50 font-black text-2xl md:text-4xl shadow-xl overflow-hidden w-full sm:w-auto ring-[8px] ring-white/10 cursor-not-allowed opacity-80"
              >
                <span className="relative z-10 tracking-tighter uppercase italic">
                  Returning 2026
                </span>
              </button>
            </div>

            <div className="flex flex-col items-center order-1 lg:order-2 w-full">
              <div className="relative w-full max-w-[500px] md:max-w-xl">
                <div className="bg-white p-6 md:p-10 shadow-[0_60px_120px_rgba(0,0,0,0.5)] rounded-2xl md:rotate-[1.5deg] group relative overflow-hidden">
                  {IS_HIBERNATING && (
                     <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center text-white space-y-6">
                        <div className="text-7xl md:text-9xl font-christmas text-yellow-400 drop-shadow-lg">❆</div>
                        <h4 className="text-3xl md:text-5xl font-serif-elegant italic font-bold">Closed for the Season</h4>
                        <p className="text-sm md:text-lg opacity-80 uppercase tracking-[0.3em] font-black">Returning Dec 2026</p>
                        <div className="w-12 h-1 bg-yellow-400/50 rounded-full"></div>
                        <p className="text-xs italic opacity-60">The digital elves are on vacation.</p>
                     </div>
                  )}
                  
                  <div className="aspect-square bg-slate-900 flex items-center justify-center relative overflow-hidden rounded-lg ring-2 ring-slate-100 shadow-inner">
                      <div className="flex flex-col items-center justify-center text-slate-100 space-y-8 md:space-y-12 p-12 text-center">
                        <div className="text-[10rem] md:text-[18rem] font-sans opacity-5 rotate-12">❆</div>
                        <div className="space-y-6">
                          <p className="font-serif-elegant italic text-slate-300 text-3xl md:text-5xl opacity-40 leading-tight">Workshop <br/> Hibernating</p>
                        </div>
                      </div>
                  </div>
                  
                  <div className="mt-8 md:mt-12 border-t-2 border-slate-50 pt-8 md:pt-10 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 px-2">
                    <div className="space-y-2 md:space-y-4 text-center sm:text-left">
                      <div className="text-[9px] md:text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Official Boutique Masterpiece</div>
                      <div className="font-serif-elegant font-bold text-slate-950 text-2xl md:text-3xl italic leading-none">Edition of One</div>
                      <div className="text-[9px] md:text-[10px] text-slate-200 font-mono tracking-[0.2em] mt-2">2025 FESTIVE ARCHIVE</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-40 md:mt-80 pt-24 md:pt-40 border-t-2 border-white/10 w-full text-center space-y-10 md:space-y-16 pb-40">
          <div className="flex items-center justify-center gap-8 mb-12">
             <div className="h-px bg-white/20 w-24 md:w-64"></div>
             <span className="text-white text-5xl md:text-8xl font-christmas drop-shadow-lg">❆</span>
             <div className="h-px bg-white/20 w-24 md:w-64"></div>
          </div>
          <p className="text-white text-[12px] md:text-[18px] uppercase tracking-[1.2em] font-black drop-shadow-md">
            The North Pole Boutique • <a href="https://tmbrella.studio" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-white transition-colors">tmbrella.studio</a>
          </p>
          <p className="text-white/40 text-[12px] md:text-[15px] max-w-3xl mx-auto leading-loose italic font-medium px-6">
            Thank you for an incredible 2025 season. We transformed thousands of avatars and spread joy across the digital realm. <br/>The ritual will resume next December. Merry Everything!
          </p>
        </footer>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fadeIn 3s ease-out forwards; }
          @keyframes slideUp { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
          .animate-slide-up { animation: slideUp 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .text-shadow-xl { text-shadow: 0 40px 100px rgba(0,0,0,0.9); }
          .animate-spin-slow { animation: spin 12s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
};

export default App;
