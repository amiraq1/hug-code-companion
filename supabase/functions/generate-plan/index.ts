import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مدير مشاريع محترف ومهندس برمجيات. عند إعطائك وصف مشروع، قم بتوليد خطة عمل مفصلة.

أجب دائماً باستخدام tool calling مع الدالة generate_project_plan.

قواعد التوليد:
- قسّم المشروع إلى مهام رئيسية (5-10 مهام)
- كل مهمة رئيسية يمكن أن تحتوي على مهام فرعية (2-5)
- حدد الأولوية: critical, high, medium, low
- قدّر الساعات المطلوبة بشكل واقعي
- حدد deadline_days (عدد الأيام من بداية المشروع)
- اقترح مسؤول افتراضي مناسب (مثل: مطور Frontend, مطور Backend, مصمم UI/UX, مهندس DevOps, محلل بيانات)
- رتب المهام حسب الأولوية والتسلسل المنطقي`;

const ANALYZE_PROMPT = `أنت محلل مهام محترف. عند إعطائك مهمة، قم بتحليلها وتقسيمها إلى خطوات تفصيلية.

أجب دائماً باستخدام tool calling مع الدالة analyze_task.

قواعد التحليل:
- قسّم المهمة إلى 3-8 خطوات تفصيلية
- كل خطوة يجب أن تكون قابلة للتنفيذ
- قدّر الوقت لكل خطوة
- حدد الأولوية لكل خطوة`;

const tools = [
  {
    type: "function",
    function: {
      name: "generate_project_plan",
      description: "Generate a detailed project plan with tasks and subtasks",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "اسم المشروع المقترح" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                estimated_hours: { type: "number" },
                deadline_days: { type: "integer" },
                assignee: { type: "string" },
                subtasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      estimated_hours: { type: "number" },
                      assignee: { type: "string" },
                    },
                    required: ["title", "priority", "estimated_hours"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "priority", "estimated_hours", "deadline_days"],
              additionalProperties: false,
            },
          },
        },
        required: ["project_name", "tasks"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_task",
      description: "Analyze a task and break it into detailed steps",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                estimated_hours: { type: "number" },
                assignee: { type: "string" },
              },
              required: ["title", "priority", "estimated_hours"],
              additionalProperties: false,
            },
          },
        },
        required: ["steps"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, description, session_id, project_id, task_title } = await req.json();
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt: string;
    let userMessage: string;
    let toolChoice: any;

    if (type === "analyze") {
      systemPrompt = ANALYZE_PROMPT;
      userMessage = `حلل هذه المهمة وقسمها إلى خطوات تفصيلية:\n\n${task_title}\n${description || ""}`;
      toolChoice = { type: "function", function: { name: "analyze_task" } };
    } else {
      systemPrompt = SYSTEM_PROMPT;
      userMessage = `قم بإنشاء خطة عمل مفصلة للمشروع التالي:\n\n${description}`;
      toolChoice = { type: "function", function: { name: "generate_project_plan" } };
    }

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-405b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    // For plan generation, save to DB
    if (type !== "analyze" && session_id) {
      const projectName = result.project_name || "مشروع جديد";
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .insert({ session_id, name: projectName, description })
        .select("id")
        .single();

      if (projErr) throw projErr;

      const tasks = result.tasks || [];
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const { data: mainTask, error: taskErr } = await supabase
          .from("ai_tasks")
          .insert({
            project_id: project.id,
            title: task.title,
            description: task.description || null,
            priority: task.priority,
            estimated_hours: task.estimated_hours,
            deadline_days: task.deadline_days,
            assignee: task.assignee || "غير محدد",
            step_order: i + 1,
          })
          .select("id")
          .single();

        if (taskErr) throw taskErr;

        if (task.subtasks?.length) {
          const subtaskRows = task.subtasks.map((st: any, j: number) => ({
            project_id: project.id,
            parent_task_id: mainTask.id,
            title: st.title,
            description: st.description || null,
            priority: st.priority,
            estimated_hours: st.estimated_hours,
            assignee: st.assignee || task.assignee || "غير محدد",
            step_order: j + 1,
          }));
          const { error: subErr } = await supabase.from("ai_tasks").insert(subtaskRows);
          if (subErr) throw subErr;
        }
      }

      return new Response(JSON.stringify({ project_id: project.id, plan: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For analyze, save subtasks if project_id provided
    if (type === "analyze" && project_id && result.steps) {
      const stepRows = result.steps.map((s: any, i: number) => ({
        project_id,
        title: s.title,
        description: s.description || null,
        priority: s.priority,
        estimated_hours: s.estimated_hours,
        assignee: s.assignee || "غير محدد",
        step_order: i + 1,
      }));
      const { error } = await supabase.from("ai_tasks").insert(stepRows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
