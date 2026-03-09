import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Code2, ArrowLeft, ArrowUpRight, Github, Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll();
  
  const yElement1 = useTransform(scrollYProgress, [0, 1], [0, isMobile ? -50 : -150]);
  const yElement2 = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 50 : 100]);

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30 selection:text-primary overflow-x-hidden relative font-sans">
      
      {/* Avant-Garde Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay z-0 mix-blend-screen" />
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Navigation Layer */}
      <nav className="fixed top-0 left-0 right-0 p-6 z-50 flex justify-between items-center mix-blend-difference">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold font-display tracking-tighter">
            HC
          </div>
          <span className="font-display font-bold tracking-tight text-white hidden sm:block">
            Hug<span className="text-primary/90">Code</span>
          </span>
        </motion.div>

        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={onEnter}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white text-white hover:text-black transition-all duration-500 backdrop-blur-md overflow-hidden relative"
        >
          <span className="relative z-10 font-medium text-sm tracking-wide">Enter Studio</span>
          <ArrowUpRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover:rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1" />
        </motion.button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-[20vh] pb-32 flex flex-col items-center sm:items-start text-center sm:text-left min-h-screen">
        <div className="max-w-5xl w-full mx-auto sm:mx-0 relative">
          
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-[12vw] sm:text-[8vw] leading-[0.85] font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-300 to-neutral-600">
              RETHINK.
            </h1>
            <h1 className="text-[12vw] sm:text-[8vw] leading-[0.85] font-display font-black tracking-tighter ml-[5vw] sm:ml-[10vw] flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-400 to-amber-600">
              CODE.
            </h1>
          </motion.div>

          {/* Asymmetrical Description block */}
          <motion.div 
            style={{ y: yElement1 }}
            className="mt-12 sm:mt-8 sm:ml-[25vw] sm:max-w-md lg:max-w-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-lg sm:text-xl text-neutral-400 leading-relaxed font-light">
              ليس مجرد محرر نصوص. إنها بيئة تطوير ذكية تتجاوز المعايير التقليدية. 
              تصميم طليعي، ذكاء اصطناعي مدمج، وتجربة مستخدم تركز على البساطة المتعمدة والقوة المطلقة.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <button 
                onClick={onEnter}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-medium tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Launch IDE
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </button>
              <button 
                onClick={onEnter}
                className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-medium tracking-wide hover:bg-white/5 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign In <Github className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

        </div>

        {/* Abstract Component Showcase */}
        <motion.div 
          style={{ y: yElement2 }}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:absolute sm:right-0 sm:top-[40vh] sm:w-[50vw] mt-24 sm:mt-0 px-4 sm:px-0 pointer-events-none"
        >
          <div className="relative aspect-[4/3] w-full max-w-2xl ml-auto border border-white/10 bg-black/40 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/5">
            {/* Fake Editor Header */}
            <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/50 tracking-widest font-mono">
                App.tsx — HugCode
              </div>
            </div>
            {/* Fake Editor Content */}
            <div className="flex-1 p-6 font-mono text-sm sm:text-base leading-relaxed text-neutral-400">
              <div className="text-primary/80">const</div> <div className="text-white inline">System</div> = <div className="text-yellow-400 inline">()</div> <div className="text-primary/80 inline">{"=>"}</div> {"{"} <br/>
              &nbsp;&nbsp;<div className="text-primary/80 inline">return</div> ( <br/>
              &nbsp;&nbsp;&nbsp;&nbsp;{'<'} <div className="text-red-400 inline">AvantGarde</div> {'>'} <br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'<'} <div className="text-blue-400 inline">Intelligence</div> {'>'} Unbound {'</'} <div className="text-blue-400 inline">Intelligence</div> {'>'} <br/>
              &nbsp;&nbsp;&nbsp;&nbsp;{'</'} <div className="text-red-400 inline">AvantGarde</div> {'>'} <br/>
              &nbsp;&nbsp;) <br/>
              {"}"}; <br/>
              <motion.div 
                animate={{ opacity: [1, 0] }} 
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear", repeatType: "reverse" }} 
                className="inline-block w-2.5 h-4 bg-white/80 mt-2" 
              />
            </div>
            
            {/* Fake AI popup overlay floating */}
            <div className="absolute bottom-6 right-6 p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-start gap-3 w-64 translate-x-4 translate-y-4 -rotate-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-white text-xs font-medium mb-1">AI Recommendation</p>
                <p className="text-neutral-400 text-[10px] leading-tight">Optimized layout calculation to 60fps native thread boundary.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Avant-garde Grid Section */}
      <section className="relative z-10 py-32 border-t border-white/10 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-16 gap-x-8">
            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 tracking-tight">Performant</h3>
              <p className="text-neutral-500 font-light leading-relaxed">
                مبني للسرعة. عزل خيوط المعالجة في التطبيق للحفاظ على سلاسة 60 إطاراً في الثانية. لا مساومة في الأداء.
              </p>
            </div>
            <div className="flex flex-col sm:mt-16">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 tracking-tight">Intelligent</h3>
              <p className="text-neutral-500 font-light leading-relaxed">
                ذكاء اصطناعي متغلغل في كل زاوية. ليس كملحق، بل كجوهر للبيئة ليقرأ، يخطط، ويكتب الكود معك.
              </p>
            </div>
            <div className="flex flex-col sm:mt-32">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 tracking-tight">Aesthetic</h3>
              <p className="text-neutral-500 font-light leading-relaxed">
                تصميم يكسر القواعد. مساحات بيضاء متعمدة وتأثيرات بصرية تضع التركيز على الكود بأسلوب غير مسبوق.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-8 border-t border-white/5 text-center text-neutral-600 text-sm font-mono tracking-widest relative z-10 bg-black">
        © {new Date().getFullYear()} HUGCODE INTELLIGENCE.
      </footer>
    </div>
  );
};
