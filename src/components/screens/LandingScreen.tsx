import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#05060a] text-[#e6eef6] font-cairo" dir="rtl">

      {/* Main Container */}
      <div className="flex min-h-[100dvh] items-center justify-center p-4 md:p-8">
        <motion.main 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel relative flex w-full max-w-[920px] flex-col overflow-hidden rounded-[14px] shadow-2xl md:flex-row"
        >
          {/* Left Section (Information) */}
          <section className="flex-[1.1] p-6 md:p-12">
            <div className="flex items-center gap-3">
              <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <img src="/app-icon.png" alt="Hug Code Logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-wide">
                  Hug<span className="text-[#ffd24a]">Code</span>
                </div>
                <div className="text-xs text-[#9aa3b2]">محرر كود موبايل احترافي · محرّك تطوير مع تكامل GitHub</div>
              </div>
            </div>

            <h1 className="mt-8 text-3xl font-bold leading-tight md:text-[32px]">
              مرحبًا في Hug Code
            </h1>

            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-[#9aa3b2]">
              محرر ومحرّك تطوير موبايل هادئ وسريع، يجمع بين تجربة تحرير احترافية ومساعد ذكاء اصطناعي وتكامل مباشر مع GitHub — مُصمم للهواتف أولاً.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button 
                onClick={onEnter}
                className="h-12 rounded-[12px] bg-gradient-to-r from-[#ffda6a] to-[#ffd24a] px-6 text-[16px] font-bold text-[#071017] shadow-[0_8px_28px_rgba(255,210,74,0.12)] transition-transform hover:-translate-y-1"
              >
                افتح التطبيق
              </Button>
              <Button 
                variant="outline"
                asChild
                className="h-12 rounded-[12px] border-white/10 bg-transparent px-6 text-[16px] font-bold text-[#e6eef6] transition-transform hover:-translate-y-1 hover:bg-white/5 rtl:gap-2"
              >
                <a href="https://github.com/amiraq1/hug-code-companion" target="_blank" rel="noopener noreferrer">
                  عرض المشروع
                </a>
              </Button>
            </div>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.04] font-bold text-[#ffd24a]">AI</div>
                <div>
                  <div className="font-bold">مساعد ذكي</div>
                  <div className="text-sm text-[#9aa3b2]">اقتراحات، مساعدات كتابة، وأدوات تنفيذية داخل المحرر.</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.04] font-bold text-[#ffd24a]">Git</div>
                <div>
                  <div className="font-bold">تكامل GitHub</div>
                  <div className="text-sm text-[#9aa3b2]">عرض المستودعات، الفروع، والالتزامات مع إمكانية Commit & Push مباشرة.</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.04] font-bold text-[#ffd24a]">Preview</div>
                <div>
                  <div className="font-bold">معاينة مباشرة</div>
                  <div className="text-sm text-[#9aa3b2]">عرض صفحات HTML / CSS / JS وMarkdown مباشرة داخل الواجهة.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Section (Meta) */}
          <aside className="gradient-bg flex-[0.9] border-t border-white/5 p-8 md:border-r md:border-t-0 flex flex-col justify-center">
            <div className="mb-6">
              <div className="text-[13px] text-[#9aa3b2]">نسخة</div>
              <div className="mt-1 text-2xl font-bold">1.0.0</div>
              <div className="mt-2 text-[13px] text-[#9aa3b2]">نسخة مبدئية · جاهزة للاختبار</div>
            </div>

            <div className="mt-6 space-y-4 text-[13px] leading-relaxed text-[#9aa3b2]">
              <p>
                <strong>للمطوّرين:</strong> شغّل التطبيق محليًا عبر <code className="rounded bg-white/5 px-1.5 py-0.5">npm run dev</code>. لبناء الإنتاج استخدم <code className="rounded bg-white/5 px-1.5 py-0.5">npm run build</code>.
              </p>
              <p>إذا أردت صفحة بلغات متعددة أو إعادة توجيه مخصّص، أستطيع أعدّلها لك.</p>
            </div>
          </aside>
        </motion.main>
      </div>

      <footer className="absolute bottom-4 w-full text-center text-[13px] text-[#9aa3b2]/60">
        © Hug Code — جميع الحقوق محفوظة · <span className="opacity-80">2024</span>
      </footer>
    </div>
  );
};
