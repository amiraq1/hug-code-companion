import React, { useState, useMemo, useEffect } from "react";
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from "recharts";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, getSortedRowModel, SortingState
} from "@tanstack/react-table";
import {
    Terminal, Server, FileCode, CheckCircle2, XCircle, Search, Settings, MoreHorizontal,
    GitCommit, Sparkles, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// --- Mock Data ---
const activityData = [
    { name: "Mon", commits: 40, aiTokens: 2400, sessions: 20 },
    { name: "Tue", commits: 30, aiTokens: 1398, sessions: 25 },
    { name: "Wed", commits: 20, aiTokens: 9800, sessions: 18 },
    { name: "Thu", commits: 27, aiTokens: 3908, sessions: 22 },
    { name: "Fri", commits: 18, aiTokens: 4800, sessions: 35 },
    { name: "Sat", commits: 23, aiTokens: 3800, sessions: 40 },
    { name: "Sun", commits: 34, aiTokens: 4300, sessions: 38 },
];

// --- Components ---
const StatCard = ({ title, value, icon: Icon, change, trend, primaryClass }: any) => (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${primaryClass}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        <div className="flex items-center mt-4">
            <span className={`flex items-center text-xs font-semibold ${trend === "up" ? "text-ide-success" : "text-destructive"}`}>
                {trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {change}
            </span>
            <span className="text-xs text-muted-foreground ml-2">vs last week</span>
        </div>
    </div>
);

export function DashboardScreen() {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    // Fetch real AI tasks
    const { data: realTasksData = [], isLoading } = useQuery({
        queryKey: ["ai_tasks"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_tasks")
                .select(`
                    id,
                    title,
                    status,
                    priority,
                    assignee,
                    created_at,
                    projects(name)
                `)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            // Format data for the table
            return data.map((task: any) => ({
                id: task.id.split("-")[0].toUpperCase() || "T-00",
                project: task.projects?.name || task.title,
                status: task.status === "done" ? "completed" : task.status === "todo" ? "todo" : "in-progress",
                assignee: task.assignee || "System",
                priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
                time: new Date(task.created_at).toLocaleDateString(),
            }));
        },
    });

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel("ai_tasks_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ai_tasks" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["ai_tasks"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const columns = useMemo(() => [
        {
            accessorKey: "id",
            header: "Task ID",
            cell: (info: any) => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
        },
        {
            accessorKey: "project",
            header: "Project",
            cell: (info: any) => <span className="font-medium">{info.getValue()}</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: (info: any) => {
                const val = info.getValue();
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${val === "completed" ? "bg-ide-success/10 text-ide-success border-ide-success/20" :
                        val === "in-progress" ? "bg-ide-warning/10 text-ide-warning border-ide-warning/20" :
                            val === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                "bg-muted text-muted-foreground border-border"
                        }`}>
                        {val === "completed" ? <CheckCircle2 className="w-3 h-3" /> : val === "failed" ? <XCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                        {val}
                    </span>
                );
            },
        },
        {
            accessorKey: "priority",
            header: "Priority",
        },
        {
            accessorKey: "time",
            header: "Last Update",
            cell: (info: any) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
        },
        {
            id: "actions",
            cell: () => (
                <button className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            ),
        },
    ], []);

    const table = useReactTable({
        data: realTasksData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="flex-1 bg-background overflow-hidden flex flex-col h-full font-sans">
            {/* Top Navbar */}
            <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Server className="w-4 h-4 text-primary" />
                    </div>
                    <h1 className="text-lg font-display font-semibold tracking-tight text-foreground">Command Center</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search operations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-secondary/50 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all"
                        />
                    </div>
                    <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Commits (7d)"
                        value="194"
                        change="+12.5%"
                        trend="up"
                        icon={GitCommit}
                        primaryClass="bg-blue-500/10 text-blue-500"
                    />
                    <StatCard
                        title="AI Tokens Consumed"
                        value="26.5k"
                        change="+4.1%"
                        trend="up"
                        icon={Sparkles}
                        primaryClass="bg-amber-500/10 text-amber-500"
                    />
                    <StatCard
                        title="Active Files Edited"
                        value="18"
                        change="-2.4%"
                        trend="down"
                        icon={FileCode}
                        primaryClass="bg-emerald-500/10 text-emerald-500"
                    />
                    <StatCard
                        title="IDE Sessions"
                        value="198"
                        change="+22.1%"
                        trend="up"
                        icon={Terminal}
                        primaryClass="bg-purple-500/10 text-purple-500"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Area Chart */}
                    <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-foreground">AI Token Usage vs Commits</h2>
                            <select className="bg-secondary text-xs rounded border-border px-2 py-1 outline-none">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="aiTokens" name="AI Tokens" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                                    <Area type="monotone" dataKey="commits" name="Git Commits" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Secondary Bar Chart */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="mb-6">
                            <h2 className="text-base font-semibold text-foreground">Active Sessions</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily IDE connections</p>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--secondary))' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill="#8b5cf6" barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Advanced Data Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-border flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Recent AI Operations</h2>
                            <p className="text-xs text-muted-foreground mt-1">Real-time status of IDE backend tasks.</p>
                        </div>
                        <button className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                            View All Logs
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary/50 text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-6 py-3 font-semibold cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                                                <div className="flex items-center gap-1.5">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: <ArrowUpRight className="w-3 h-3" />,
                                                        desc: <ArrowDownRight className="w-3 h-3" />,
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-border">
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-secondary/30 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Showing 1 to {realTasksData.length} entries</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 bg-card border border-border rounded hover:bg-secondary transition disabled:opacity-50" disabled>Previous</button>
                            <button className="px-3 py-1 bg-card border border-border rounded hover:bg-secondary transition">Next</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
