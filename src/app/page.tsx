"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Mic, Sparkles, Zap, AudioLines, Share2, FileText, LayoutTemplate, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const horizontalWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 1. Hero Entrance Animation
    const tl = gsap.timeline();
    
    tl.fromTo(".hero-badge", 
      { opacity: 0, y: -20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    )
    .fromTo(".hero-title-line", 
      { opacity: 0, y: 120, rotateX: -45, transformOrigin: "0% 50% -50" }, 
      { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.1, ease: "power4.out" },
      "-=0.4"
    )
    .fromTo(".hero-desc",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      "-=0.4"
    )
    .fromTo(".hero-buttons",
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" },
      "-=0.2"
    );

    // 2. Marquee Animation
    gsap.to(".marquee-inner", {
      xPercent: -50,
      ease: "none",
      duration: 15,
      repeat: -1,
    });

    // 3. Features Stagger on Scroll
    gsap.fromTo(".feature-card",
      { opacity: 0, y: 100, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: "back.out(1.2)",
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 85%",
          toggleActions: "play none none reverse",
        }
      }
    );

    // 4. Horizontal Scroll (The Pipeline) — desktop only
    if (horizontalRef.current && horizontalWrapRef.current && window.innerWidth >= 768) {
      const scrollEl = horizontalRef.current;
      
      gsap.to(scrollEl, {
        x: () => -(scrollEl.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: horizontalWrapRef.current,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => "+=" + scrollEl.scrollWidth,
          invalidateOnRefresh: true,
        }
      });
    }

    // 5. Brutal CTA Text Scale Scrub
    gsap.fromTo(".cta-massive-text",
      { scale: 0.5, opacity: 0, y: 100 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top bottom",
          end: "center center",
          scrub: 1,
        }
      }
    );

    // 6. Parallax Backgrounds
    gsap.to(".bg-parallax", {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      }
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      
      {/* Global Decorative Backgrounds */}
      <div className="bg-parallax fixed inset-0 z-0 bg-dot-pattern opacity-30 mix-blend-overlay pointer-events-none"></div>
      
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-5 mix-blend-difference text-white">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <span className="font-heading font-bold text-2xl tracking-tighter">Expandcast</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="font-medium hover:text-primary transition-colors text-white hover:bg-white/10">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-none px-6">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 mix-blend-screen animate-pulse duration-10000 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-chart-4/10 rounded-full blur-[128px] -z-10 mix-blend-screen pointer-events-none"></div>

        <div className="flex flex-col items-center max-w-5xl px-6 text-center">
          <div className="hero-badge mb-8 flex items-center gap-2 bg-secondary border border-border/50 px-4 py-1.5 rounded-none backdrop-blur-sm shadow-[4px_4px_0_0_var(--color-primary)]">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold tracking-widest uppercase font-mono">The AI content multiplier is live</span>
          </div>

          <h1 className="font-heading font-extrabold tracking-tighter leading-[0.85] mb-8 text-foreground uppercase perspective-1000"
            style={{ fontSize: "clamp(2.8rem, 12vw, 9rem)" }}>
            <div className="overflow-hidden pb-2"><div className="hero-title-line">EXPAND YOUR</div></div>
            <div className="overflow-hidden pb-2"><div className="hero-title-line"><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-chart-4">CONTENT.</span></div></div>
          </h1>

          <p className="hero-desc text-base md:text-2xl text-muted-foreground max-w-3xl mb-12 leading-relaxed font-mono">
            Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.
          </p>

          <div className="hero-buttons flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Button 
              asChild 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base md:text-xl h-16 md:h-20 px-8 md:px-12 rounded-none group shadow-[8px_8px_0_0_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] hover:translate-y-1 hover:translate-x-1 transition-all w-full sm:w-auto"
            >
              <Link href="/register" className="flex items-center justify-center gap-3">
                START CREATING
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Marquee Section */}
      <section className="relative z-10 w-full bg-primary text-primary-foreground py-4 md:py-6 border-y-4 border-foreground overflow-hidden flex whitespace-nowrap">
        <div className="marquee-inner flex font-heading font-black text-3xl md:text-6xl uppercase tracking-tighter w-max">
          <span className="px-8">AI GENERATED</span> • 
          <span className="px-8">VIRAL CLIPS</span> • 
          <span className="px-8">SEO BLOGS</span> • 
          <span className="px-8">NEWSLETTERS</span> • 
          <span className="px-8">LINKEDIN POSTS</span> • 
          <span className="px-8">SHOW NOTES</span> • 
          {/* Duplicate for seamless loop */}
          <span className="px-8">AI GENERATED</span> • 
          <span className="px-8">VIRAL CLIPS</span> • 
          <span className="px-8">SEO BLOGS</span> • 
          <span className="px-8">NEWSLETTERS</span> • 
          <span className="px-8">LINKEDIN POSTS</span> • 
          <span className="px-8">SHOW NOTES</span> • 
        </div>
      </section>

      {/* Horizontal Scroll / The Pipeline — desktop only */}
      <section ref={horizontalWrapRef} className="hidden md:flex h-screen w-full bg-zinc-950 flex-col justify-center overflow-hidden relative border-b-4 border-border">
        <div className="absolute top-12 left-12 md:top-24 md:left-24 z-10 mix-blend-difference pointer-events-none">
          <h2 className="text-white font-heading font-extrabold text-6xl md:text-8xl uppercase tracking-tighter opacity-20">The Pipeline</h2>
        </div>
        
        <div ref={horizontalRef} className="flex gap-12 px-12 md:px-32 items-center w-max h-full">
          <div className="w-[85vw] md:w-[60vw] lg:w-[40vw] h-[60vh] bg-background border-4 border-primary p-8 md:p-12 flex flex-col justify-between shrink-0 shadow-[16px_16px_0_0_var(--color-primary)]">
             <div>
               <span className="font-mono text-primary font-bold text-xl mb-4 block">STEP 01</span>
               <h3 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter leading-none mb-6">Upload &<br/>Transcribe</h3>
             </div>
             <AudioLines className="w-24 h-24 md:w-32 md:h-32 text-primary opacity-50" />
             <p className="text-xl md:text-2xl font-mono text-muted-foreground mt-8">Drop any MP3, WAV, or video file. We transcribe it with superhuman accuracy, recognizing speakers and context automatically.</p>
          </div>
          
          <div className="w-[85vw] md:w-[60vw] lg:w-[40vw] h-[60vh] bg-background border-4 border-chart-4 p-8 md:p-12 flex flex-col justify-between shrink-0 shadow-[16px_16px_0_0_var(--color-chart-4)]">
             <div>
               <span className="font-mono text-chart-4 font-bold text-xl mb-4 block">STEP 02</span>
               <h3 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter leading-none mb-6">AI Context<br/>Analysis</h3>
             </div>
             <Zap className="w-24 h-24 md:w-32 md:h-32 text-chart-4 opacity-50" />
             <p className="text-xl md:text-2xl font-mono text-muted-foreground mt-8">Our engine extracts the juiciest hooks, controversial takes, and high-value insights from your content.</p>
          </div>
          
          <div className="w-[85vw] md:w-[60vw] lg:w-[40vw] h-[60vh] bg-background border-4 border-foreground p-8 md:p-12 flex flex-col justify-between shrink-0 shadow-[16px_16px_0_0_var(--color-foreground)]">
             <div>
               <span className="font-mono text-foreground font-bold text-xl mb-4 block">STEP 03</span>
               <h3 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter leading-none mb-6">Content<br/>Multiplication</h3>
             </div>
             <Share2 className="w-24 h-24 md:w-32 md:h-32 text-foreground opacity-50" />
             <p className="text-xl md:text-2xl font-mono text-muted-foreground mt-8">Instantly get ready-to-publish viral clips, SEO-optimized blog posts, newsletters, and social threads.</p>
          </div>

          <div className="w-[20vw] flex items-center justify-center shrink-0">
             <ArrowRight className="w-32 h-32 text-primary animate-pulse" />
          </div>
        </div>
      </section>

      {/* Pipeline — mobile vertical stack */}
      <section className="md:hidden w-full bg-zinc-950 border-b-4 border-border px-5 py-16 overflow-hidden">
        <h2 className="font-heading font-extrabold uppercase tracking-tighter text-white opacity-20 mb-10"
          style={{ fontSize: "clamp(2rem, 10vw, 5rem)" }}>The Pipeline</h2>
        <div className="flex flex-col gap-8">
          {[
            { step: "01", title: "Upload &\nTranscribe", icon: AudioLines, color: "border-primary text-primary", shadow: "shadow-[8px_8px_0_0_var(--color-primary)]", desc: "Drop any MP3, WAV, or video file. Transcribed with superhuman accuracy." },
            { step: "02", title: "AI Context\nAnalysis", icon: Zap, color: "border-chart-4 text-chart-4", shadow: "shadow-[8px_8px_0_0_var(--color-chart-4)]", desc: "Extracts the juiciest hooks, controversial takes, and high-value insights." },
            { step: "03", title: "Content\nMultiplication", icon: Share2, color: "border-foreground text-foreground", shadow: "shadow-[8px_8px_0_0_var(--color-foreground)]", desc: "Instantly get blogs, newsletters, viral clips, and social threads." },
          ].map(({ step, title, icon: Icon, color, shadow, desc }) => (
            <div key={step} className={`border-4 ${color} ${shadow} bg-background p-7 flex flex-col gap-4`}>
              <span className="font-mono font-bold text-base">STEP {step}</span>
              <h3 className="font-heading font-black uppercase tracking-tighter leading-tight whitespace-pre-line"
                style={{ fontSize: "clamp(1.5rem, 8vw, 2.5rem)" }}>{title}</h3>
              <Icon className="w-14 h-14 opacity-50" />
              <p className="font-mono text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 py-20 md:py-32 overflow-hidden">
          <div className="mb-20 text-center md:text-left">
          <h2 className="font-heading font-black uppercase tracking-tighter leading-none mb-6 break-words"
            style={{ fontSize: "clamp(1.6rem, 7vw, 5rem)" }}>Everything you need<br/><span className="text-primary">to dominate algorithms.</span></h2>
          <p className="text-2xl font-mono text-muted-foreground max-w-2xl">Stop doing manual labor. Let AI handle the distribution while you focus on creating.</p>
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: FileText, title: "SEO Blogs", desc: "Long-form articles that rank on Google, drafted in your exact tone of voice.", color: "text-primary", border: "border-primary" },
            { icon: MessageSquare, title: "Social Threads", desc: "Twitter/X and LinkedIn threads optimized for maximum engagement and reach.", color: "text-chart-2", border: "border-chart-2" },
            { icon: LayoutTemplate, title: "Newsletters", desc: "Beautifully formatted email newsletters ready to send to your audience.", color: "text-chart-4", border: "border-chart-4" },
            { icon: Mic, title: "Voice Matching", desc: "We train on your past content to write exactly how you speak and create.", color: "text-chart-5", border: "border-chart-5" },
            { icon: Share2, title: "Channel Optimizer", desc: "Analyze your YouTube channel, find viral moments, and repurpose every video.", color: "text-primary", border: "border-primary" },
            { icon: Zap, title: "Viral Hooks", desc: "AI identifies the most controversial and engaging moments to use as promo material.", color: "text-chart-2", border: "border-chart-2" }
          ].map((feature, i) => (
            <div key={i} className={`feature-card p-10 border-4 ${feature.border} bg-card hover:-translate-y-2 hover:-translate-x-2 transition-transform duration-300 shadow-[8px_8px_0_0_currentColor] group`} style={{ color: "var(--color-border)" }}>
              <div className="text-foreground">
                <feature.icon className={`w-12 h-12 mb-6 ${feature.color} group-hover:scale-110 transition-transform`} />
                <h3 className="font-heading font-black uppercase text-3xl mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground font-mono text-lg">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Massive CTA */}
      <section className="cta-section relative z-10 w-full min-h-[80vh] bg-primary flex flex-col items-center justify-center overflow-hidden border-t-4 border-foreground text-primary-foreground">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <h2 className="cta-massive-text font-heading font-black uppercase tracking-tighter leading-none text-center mb-12 px-4"
          style={{ fontSize: "clamp(3rem, 14vw, 12vw)" }}>
          GO VIRAL <br/>
          <span className="text-foreground">TODAY.</span>
        </h2>
        
        <Button 
          asChild 
          size="lg" 
          className="bg-foreground text-background hover:bg-foreground/90 font-bold text-lg md:text-2xl h-16 md:h-24 px-10 md:px-16 rounded-none shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-all z-10"
        >
          <Link href="/register" className="flex items-center gap-3">
            START FOR FREE
            <Zap className="w-6 h-6 md:w-8 md:h-8" />
          </Link>
        </Button>
      </section>
      
      <footer className="w-full bg-zinc-950 border-t border-zinc-900 py-12 px-6 relative z-10">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-xl tracking-tighter">Expandcast</span>
          </div>
          <div className="text-zinc-500 font-mono text-sm uppercase">
            © {new Date().getFullYear()} Expandcast Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-zinc-500 font-mono text-sm uppercase">
            <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}