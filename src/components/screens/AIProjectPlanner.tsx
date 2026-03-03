import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  deadline_days: number | null;
  assignee: string | null;
  status: string;
  step_order: number;
  parent_task_id: string | null;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
};

const STATUS_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Play,
  done: CheckCircle2,
};

// 1. استخراج TaskCard كمكون منفصل (Architectural Improvement for Performance)
const TaskCard = memo(({
  task,
  subtasks,
  isExpanded,
  analyzing,
  onToggleStatus,
  onAnalyze,
  onToggleExpand
}: {
  task: Task;
  subtasks: Task[];
  isExpanded: boolean;
  analyzing: boolean;
  onToggleStatus: (t: Task) => void;
  onAnalyze: (t: Task) => void;
  onToggleExpand: (id: string) => void;
}) => {
  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  return (
    <div className="group relative rounded-lg border border-border/50 bg-ide-sidebar/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_20px_-5px_rgba(234,88,12,0.1)]">
      {/* Dynamic Status Progress Bar (Avant-Garde UX) */}
      <div
        className={`absolute top-0 right-0 w-1 h-full transition-colors duration-500 ease-in-out ${task.status === "done" ? 'bg-ide-success' :
          task.status === "in_progress" ? 'bg-primary shadow-[0_0_10px_rgba(234,88,12,0.5)]' :
            'bg-transparent'
          }`}
      />

      <div className="flex items-start gap-3 p-3 text-right">
        {/* Actions Container */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button onClick={() => onToggleStatus(task)} className="mt-0.5 hover:scale-110 transition-transform">
            <StatusIcon
              className={`h-4 w-4 ${task.status === "done" ? "text-ide-success" :
                task.status === "in_progress" ? "text-primary fill-primary/20" :
                  "text-muted-foreground"
                }`}
            />
          </button>

          <div className="flex flex-col items-center gap-1">
            {!subtasks.length && (
              <button
                onClick={() => onAnalyze(task)}
                disabled={analyzing}
                className="p-1 rounded hover:bg-secondary/60 text-muted-foreground transition-colors disabled:opacity-50"
                title="تحليل المهمة (Deep Analysis)"
              >
                {analyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {subtasks.length > 0 && (
              <button
                onClick={() => onToggleExpand(task.id)}
                className="p-1 rounded hover:bg-secondary/60 text-muted-foreground transition-colors"
                title={isExpanded ? "طي" : "توسيع"}
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-sm font-semibold transition-all duration-300 ${task.status === "done" ? "line-through text-muted-foreground/60" : "text-foreground"
              }`}>
              {task.title}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-30 tracking-wider font-mono ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>

          {task.description && (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-2 line-clamp-2 pr-1">{task.description}</p>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 font-mono">
            {task.estimated_hours != null && (
              <span className="flex items-center gap-1 bg-secondary/30 px-1.5 py-0.5 rounded">
                <Clock className="h-3 w-3 text-primary/70" />
                {task.estimated_hours}h
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1 bg-secondary/30 px-1.5 py-0.5 rounded">
                <User className="h-3 w-3 text-accent/70" />
                {task.assignee}
              </span>
            )}
            {task.deadline_days != null && (
              <span className="bg-secondary/30 px-1.5 py-0.5 rounded">
                Day {task.deadline_days}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtasks Container */}
      {isExpanded && subtasks.length > 0 && (
        <div className="border-t border-border/30 bg-background/40 p-2 space-y-1 backdrop-blur-md">
          {subtasks.map((st) => {
            const StIcon = STATUS_ICONS[st.status] || Circle;
            return (
              <div key={st.id} className="group/st flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/20 transition-colors">
                <button onClick={() => onToggleStatus(st)} className="mt-0.5 shrink-0 opacity-80 hover:opacity-100">
                  <StIcon
                    className={`h-3 w-3 ${st.status === "done" ? "text-ide-success" :
                      st.status === "in_progress" ? "text-primary" :
                        "text-muted-foreground/50"
                      }`}
                  />
                </button>
                <div className="flex-1 min-w-0 text-right pr-2">
                  <span className={`block text-[11px] font-medium ${st.status === "done" ? "line-through text-muted-foreground/50" : "text-foreground/90 group-hover/st:text-primary transition-colors"
                    }`}>
                    {st.title}
                  </span>
                  <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground/60 mt-0.5">
                    {st.estimated_hours != null && <span>{st.estimated_hours}h</span>}
                    <span className={`text-[9px] px-1 py-0 rounded border border-opacity-20 ${PRIORITY_COLORS[st.priority]}`}>
                      {PRIORITY_LABELS[st.priority]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

interface AIProjectPlannerProps {
  onBack: () => void;
  sessionId: string;
}

export function AIProjectPlanner({ onBack, sessionId }: AIProjectPlannerProps) {
  const [view, setView] = useState<"input" | "projects" | "tasks">("projects");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
  }, [sessionId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchTasks = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("step_order");
    if (data) setTasks(data);
  }, []);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: { type: "generate", description, session_id: sessionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("تم توليد خطة المشروع بنجاح!");
      setDescription("");
      await fetchProjects();
      if (data?.project_id) {
        const proj = { id: data.project_id, name: data.plan.project_name, description, created_at: new Date().toISOString() };
        setSelectedProject(proj);
        await fetchTasks(data.project_id);
        setView("tasks");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || "حدث خطأ أثناء توليد الخطة");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeTask = async (task: Task) => {
    setAnalyzing(task.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: {
          type: "analyze",
          session_id: sessionId,
          task_title: task.title,
          description: task.description,
          project_id: task.project_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("تم تحليل المهمة بنجاح!");
      await fetchTasks(task.project_id);
      setExpandedTasks((prev) => new Set(prev).add(task.id));
    } catch (e: unknown) {
      toast.error((e as Error).message || "حدث خطأ أثناء تحليل المهمة");
    } finally {
      setAnalyzing(null);
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await supabase.from("ai_tasks").update({ status: nextStatus }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
  };

  const mainTasks = tasks.filter((t) => !t.parent_task_id);
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parent_task_id === parentId);

  // Projects list view
  if (view === "projects") {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="h-11 bg-ide-sidebar border-b border-border flex items-center px-3 gap-2 shrink-0">
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">مخطط المشاريع الذكي</span>
          <div className="flex-1" />
          <button
            onClick={() => setView("input")}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            <Plus className="h-3 w-3" />
            مشروع جديد
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <Sparkles className="h-12 w-12 text-primary/40 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                لا توجد مشاريع بعد. أنشئ مشروعاً جديداً لتبدأ!
              </p>
              <button
                onClick={() => setView("input")}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                إنشاء مشروع جديد
              </button>
            </div>
          ) : (
            projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProject(proj);
                  fetchTasks(proj.id);
                  setView("tasks");
                }}
                className="w-full text-right p-3 rounded-lg border border-border bg-ide-sidebar hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{proj.name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(proj.created_at).toLocaleDateString("ar")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Input view
  if (view === "input") {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="h-11 bg-ide-sidebar border-b border-border flex items-center px-3 gap-2 shrink-0">
          <button onClick={() => setView("projects")} className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">مشروع جديد</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">مخطط المشاريع الذكي</h2>
            <p className="text-xs text-muted-foreground">
              أدخل وصفاً لمشروعك وسيقوم الذكاء الاصطناعي بتوليد خطة عمل مفصلة
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">وصف المشروع</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: تطبيق موبايل لإدارة المهام مع تكامل تقويم ونظام إشعارات..."
              className="w-full h-32 rounded-lg border border-border bg-ide-sidebar p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              dir="rtl"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري توليد الخطة...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                توليد خطة العمل
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Tasks view
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-11 bg-ide-sidebar border-b border-border flex items-center px-3 gap-2 shrink-0">
        <button onClick={() => setView("projects")} className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-foreground truncate">{selectedProject?.name}</span>
      </div>

      <div className="px-4 py-3 bg-secondary/20 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground tracking-wide uppercase font-mono shadow-inner">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-muted-foreground" /> {mainTasks.length}</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-ide-success" /> {tasks.filter((t) => t.status === "done").length}</span>
        </div>
        <span className="flex items-center gap-1 font-semibold text-primary/80"><Clock className="h-3 w-3" /> {Math.round(tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0))}h</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50" dir="rtl">
        {mainTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            subtasks={getSubtasks(task.id)}
            isExpanded={expandedTasks.has(task.id)}
            analyzing={analyzing === task.id}
            onToggleStatus={toggleStatus}
            onAnalyze={handleAnalyzeTask}
            onToggleExpand={(id) => setExpandedTasks((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            })}
          />
        ))}
      </div>
    </div>
  );
}
