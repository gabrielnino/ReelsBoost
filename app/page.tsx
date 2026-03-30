"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Download, Video, Image as ImageIcon, PlayCircle, Mic, Languages } from 'lucide-react';

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [narration, setNarration] = useState("");
  const [language, setLanguage] = useState<"english" | "espanol">("english");
  
  const [status, setStatus] = useState<"IDLE" | "GENERATING_IMAGE" | "GENERATING_VIDEO" | "SUCCESS" | "ERROR">("IDLE");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleVideoPlay = () => {
    if (audioRef.current) {
       // Sync audio to video time
       if (videoRef.current) audioRef.current.currentTime = videoRef.current.currentTime;
       audioRef.current.play().catch(() => {});
    }
  };

  const handleVideoPause = () => {
    if (audioRef.current) audioRef.current.pause();
  };

  const handleVideoSeeked = () => {
    if (audioRef.current && videoRef.current) {
       audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setStatus("GENERATING_IMAGE");
      setErrorMessage("");
      setImageUrl(null);
      setVideoUrl(null);
      setAudioUrl(null);

      // --- 1. Generate Image ---
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error || "Failed to generate image");
      
      const generatedImageUrl = imgData.imageUrl;
      setImageUrl(generatedImageUrl);

      // --- 2. Dispatch Audio Generation (Parallel) ---
      let audioPromise = Promise.resolve(null as string | null);
      if (narration.trim()) {
        audioPromise = fetch("/api/generate-audio", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ text: narration.trim(), language }),
        })
        .then(async (r) => {
           const d = await r.json();
           if (!r.ok) {
              console.warn("Audio generation warning:", d.error);
              return null;
           }
           if (d.audioBase64) return `data:audio/mp3;base64,${d.audioBase64}`;
           return d.mockUrl || null;
        }).catch(err => {
           console.warn("Audio fetch failed:", err);
           return null;
        });
      }

      // --- 3. Generate Video Task ---
      setStatus("GENERATING_VIDEO");
      const vidRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: generatedImageUrl, prompt }),
      });
      const vidData = await vidRes.json();
      if (!vidRes.ok) throw new Error(vidData.error || "Failed to initiate video generation");

      const taskId = vidData.task_id;

      // --- 4. Poll Video Status ---
      let videoResultUrl = null;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll every 3s
        const statusRes = await fetch(`/api/generate-video/status?taskId=${taskId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "SUCCEEDED") {
          videoResultUrl = statusData.videoUrl;
          break;
        } else if (statusData.status === "FAILED") {
          throw new Error(statusData.error || "Video generation failed during processing");
        } else if (statusData.error) {
           throw new Error(statusData.error);
        }
      }

      // Wait for audio just in case it takes longer than video polling (rare)
      const generatedAudioUrl = await audioPromise;

      setVideoUrl(videoResultUrl);
      setAudioUrl(generatedAudioUrl);
      setStatus("SUCCESS");

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred");
      setStatus("ERROR");
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white selection:bg-purple-500/30 font-sans flex flex-col items-center py-12 px-4 relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl z-10 flex flex-col items-center"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-2 rounded-xl text-white shadow-lg shadow-purple-500/20">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            ReelsBoost.
          </h1>
        </div>
        <p className="text-gray-400 text-lg md:text-xl mb-10 text-center max-w-xl">
          Convert a simple idea into a stunning <span className="text-white font-medium">viral vertical video</span> with AI Voice Narration.
        </p>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="w-full relative group flex flex-col gap-4">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-20 group-focus-within:opacity-50 blur transition duration-500 pointer-events-none"></div>
          
          <div className="relative bg-[#111113] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
            
            {/* Visual Prompt */}
            <div className="flex flex-col gap-2">
               <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                 <Sparkles className="w-3 h-3" /> Visual & Motion Prompt *
               </label>
               <input
                 type="text"
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 disabled={status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO"}
                 placeholder="e.g. A futuristic cyberpunk city at sunset, neon glowing..."
                 className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-lg disabled:opacity-50 w-full outline-none focus:border-purple-500/50 transition-colors"
               />
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            {/* Narration Setup */}
            <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-3 h-3" /> Voice Narration (Optional)
                  </label>
                  <textarea
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    disabled={status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO"}
                    placeholder="Enter script for voiceover..."
                    rows={2}
                    className="bg-black/40 border border-white/5 resize-none rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-pink-500/50 transition-colors disabled:opacity-50 w-full"
                  />
               </div>
               
               <div className="w-full md:w-48 flex flex-col gap-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Languages className="w-3 h-3" /> Language
                  </label>
                  <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
                     <button 
                        type="button"
                        onClick={() => setLanguage("english")}
                        disabled={status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO"}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${language === "english" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"}`}
                     >
                        English
                     </button>
                     <button 
                        type="button"
                        onClick={() => setLanguage("espanol")}
                        disabled={status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO"}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${language === "espanol" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"}`}
                     >
                        Español
                     </button>
                  </div>
               </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!prompt.trim() || status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO"}
              className="mt-2 w-full bg-white text-black hover:bg-gray-100 disabled:bg-white/20 disabled:text-white/40 border-none outline-none font-bold px-6 py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              {status === "GENERATING_IMAGE" || status === "GENERATING_VIDEO" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {status === "GENERATING_IMAGE" ? "Styling visual..." : status === "GENERATING_VIDEO" ? "Synthesizing AI Video & Audio..." : "Generate Reel"}
            </button>
          </div>
        </form>

        {/* Status Tracker */}
        <AnimatePresence>
          {status !== "IDLE" && status !== "SUCCESS" && status !== "ERROR" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mt-6 bg-[#161618] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
            >
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${status === "GENERATING_IMAGE" ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-white/50"}`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${status === "GENERATING_IMAGE" ? "text-white" : "text-white/50"} hidden sm:inline`}>
                    Styling visual
                  </span>
               </div>
               
               <div className="h-px bg-white/10 flex-1 mx-4 relative overflow-hidden">
                  <div className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 ${status === "GENERATING_VIDEO" ? "w-full transition-all duration-1000" : "w-1/2 animate-pulse"}`}></div>
               </div>

               <div className="flex items-center gap-3">
                  <span className={`font-medium ${status === "GENERATING_VIDEO" ? "text-white" : "text-white/50"} hidden sm:inline`}>
                    Synthesizing video
                  </span>
                  <div className={`p-2 rounded-xl transition-colors ${status === "GENERATING_VIDEO" ? "bg-pink-500/20 text-pink-400" : "bg-white/5 text-white/50"}`}>
                    <PlayCircle className="w-5 h-5" />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {status === "ERROR" && errorMessage && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }} 
               animate={{ opacity: 1, y: 0 }}
               className="mt-6 p-4 w-full bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center"
            >
              ⚠️ {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Area */}
        <AnimatePresence>
          {(imageUrl || videoUrl) && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 w-full flex flex-col md:flex-row gap-6 justify-center"
            >
              {/* Image Preview */}
              {imageUrl && !videoUrl && (
                  <div className="flex-1 w-full max-w-[320px] mx-auto flex flex-col gap-3">
                    <p className="text-white/60 font-medium text-sm text-center uppercase tracking-widest">Base Visual</p>
                    <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                        {status === "GENERATING_VIDEO" && (
                           <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                              <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                              <p className="text-pink-100 font-medium text-sm px-6 text-center">Animating with Wan2.6...</p>
                           </div>
                        )}
                        <img 
                          src={imageUrl} 
                          alt="Generated Base" 
                          className="w-full h-full object-cover"
                        />
                    </div>
                  </div>
              )}

              {/* Video Result */}
              {videoUrl && (
                <div className="flex-1 w-full max-w-[360px] mx-auto flex flex-col gap-3 items-center">
                   <p className="text-green-400 font-medium text-sm text-center uppercase tracking-widest flex items-center justify-center gap-2">
                     <Sparkles className="w-4 h-4" /> Ready to post
                   </p>
                   <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_0_40px_rgba(236,72,153,0.2)] bg-black">
                      <video 
                        ref={videoRef}
                        src={videoUrl} 
                        loop={!audioUrl} // only loop if no audio to prevent desync loop issues, or we can loop both
                        controls
                        controlsList="nodownload"
                        playsInline
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                        onSeeked={handleVideoSeeked}
                        className="w-full h-full object-cover"
                      />
                      {/* Hidden mapped Audio Track */}
                      {audioUrl && (
                        <audio 
                          ref={audioRef} 
                          src={audioUrl} 
                          loop={false}
                          className="hidden" 
                        />
                      )}
                   </div>
                   
                   <p className="text-white/40 text-xs text-center px-4">
                     {audioUrl ? "Audio track is synced with playback." : "No narration provided."}
                   </p>

                   <a 
                     href={videoUrl} 
                     download="reelsboost_video.mp4" 
                     target="_blank" rel="noopener noreferrer"
                     className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                   >
                     <Download className="w-5 h-5" /> Download Video
                   </a>
                   {audioUrl && (
                      <a 
                        href={audioUrl} 
                        download="reelsboost_audio.mp3" 
                        target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
                      >
                       <Mic className="w-5 h-5" /> Download Audio
                      </a>
                   )}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      
    </main>
  );
}
