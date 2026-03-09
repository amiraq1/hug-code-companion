import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function getRequesterKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT) return false;
  existing.count += 1;
  return true;
}

const SYSTEM_PROMPT = `أنت مساعد برمجي ذكي اسمك HugCode Agent. تعمل داخل بيئة تطوير متكاملة (IDE) لمساعدة المطورين.

قدراتك:
- كتابة وتحسين الكود بأي لغة برمجة
- تصحيح الأخطاء وشرح المشاكل
- شرح المفاهيم البرمجية
- تصميم حلول معمارية
- تحليل المهام وتقسيمها لخطوات

قواعد الإجابة:
- استخدم Markdown مع code blocks لعرض الكود
- كن مختصراً ودقيقاً
- إذا أُعطيت سياق ملفات المشروع، استخدمه لتقديم إجابات مخصصة
- أجب بنفس لغة المستخدم (عربي أو إنجليزي)
- عند كتابة كود، اشرح التغييرات بإيجاز`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, project_context } = await req.json();
    const requesterKey = getRequesterKey(req);

    if (!checkRateLimit(requesterKey)) {
      return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات لهذه الدقيقة" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "صيغة الرسائل غير صالحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!NVIDIA_API_KEY && !GROQ_API_KEY) {
      throw new Error("لا يوجد مفتاح API صالح (NVIDIA أو GROQ)");
    }

    // Build context-aware system prompt
    let systemContent = SYSTEM_PROMPT;
    if (project_context) {
      systemContent += `\n\n--- سياق المشروع الحالي ---\n`;
      if (project_context.active_file) {
        systemContent += `\nالملف المفتوح حالياً: ${project_context.active_file.path}\n`;
        if (project_context.active_file.content) {
          systemContent += `\nمحتوى الملف:\n\`\`\`${project_context.active_file.language || ""}\n${project_context.active_file.content}\n\`\`\`\n`;
        }
      }
      if (project_context.open_files?.length) {
        systemContent += `\nالملفات المفتوحة: ${project_context.open_files.join(", ")}\n`;
      }
      if (project_context.file_tree) {
        systemContent += `\nهيكل المشروع:\n${project_context.file_tree}\n`;
      }
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "read_file",
          description: "اقرأ محتوى ملف موجود في المشروع. Use this to read files to understand the code.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "مسار الملف، مثلاً src/App.tsx" }
            },
            required: ["path"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "write_file",
          description: "قم بإنشاء أو تحديث ملف في المشروع.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "مسار الملف، مثلاً src/components/New.tsx" },
              content: { type: "string", description: "محتوى الملف بالكامل." }
            },
            required: ["path", "content"],
          }
        }
      }
    ];

    const payload = {
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      tools,
      stream: true,
    };

    let response = null;
    let primaryError = null;

    // First attempt: Groq API (High Speed)
    if (GROQ_API_KEY) {
      const groqPayload = { ...payload, model: "llama-3.1-70b-versatile" };
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groqPayload),
      });

      if (!response.ok) {
         const errText = await response.text();
         console.error("Groq API Error:", response.status, errText);
         primaryError = { status: response.status, text: errText, source: "Groq" };
         response = null; // Mark failed to trigger fallback
      }
    }

    // Second Attempt fallback: NVIDIA API
    if (!response && NVIDIA_API_KEY) {
      if (primaryError) console.log("Switching to Fallback Node (NVIDIA)...");
      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
         const t = await response.text();
         throw new Error(`NVIDIA API Error (${response.status}): ${t}`);
      }
    }

    // If both failed (No generic response object initialized)
    if (!response) {
      if (primaryError?.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات من المزود الرئيسي للذكاء الاصطناعي، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (primaryError?.status === 402) {
        return new Response(JSON.stringify({ error: "الرصيد نفد والمحول الاحتياطي غير متاح" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error (${primaryError?.status || 500}): ${primaryError?.text}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("code-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
