import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("code-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
