import React, { useState, useEffect } from "react";
import {
    User, Mail, Shield, Key, Bell, Camera,
    Github, Twitter, Globe, Link as LinkIcon, Edit2,
    Check, Award, Zap, Code2, Server, Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ProfileScreen() {
    const { username, sessionId } = useAuthStore();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        handle: username ? `@${username}` : "",
        role: "Mule-Stack Developer", // fallback
        bio: "",
        location: "",
        email: "",
        website: "",
        twitter: "",
    });

    // Fetch Profile from DB
    const { data: profileData, isLoading: isProfileLoading } = useQuery({
        queryKey: ["profile", sessionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("session_id", sessionId)
                .maybeSingle();

            if (error) {
                console.error("Profile fetch error:", error);
                return null;
            }
            return data;
        }
    });

    // Fetch GitHub details
    const { data: githubData, isLoading: isGithubLoading } = useQuery({
        queryKey: ["github_user", username],
        queryFn: async () => {
            if (!username) return null;
            const res = await fetch(`https://api.github.com/users/${username}`);
            if (!res.ok) return null;
            return await res.json();
        },
        enabled: !!username
    });

    // Sync form data
    useEffect(() => {
        setFormData({
            name: profileData?.name || githubData?.name || username || "Dev User",
            handle: profileData?.handle || `@${username || "dev"}`,
            role: profileData?.role || "Full-Stack Developer",
            bio: profileData?.bio || githubData?.bio || "Building the future of coding with AI.",
            location: profileData?.location || githubData?.location || "Earth",
            email: profileData?.email || "",
            website: profileData?.website || githubData?.blog || "",
            twitter: profileData?.twitter || githubData?.twitter_username || "",
        });
    }, [profileData, githubData, username]);

    // Save Profile Mutation
    const saveProfileMutation = useMutation({
        mutationFn: async (updatedData: typeof formData) => {
            const { data, error } = await supabase
                .from("profiles")
                .upsert({
                    session_id: sessionId,
                    ...updatedData,
                    updated_at: new Date().toISOString()
                }, { onConflict: "session_id" });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile", sessionId] });
            toast.success("تم تحديث الملف الشخصي بنجاح");
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error("فشل في حفظ بيانات الملف الشخصي.");
            console.error(err);
        }
    });

    const achievements = [
        { icon: Code2, title: githubData?.public_repos ? `${githubData.public_repos} Repos` : "0 Repos", color: "text-blue-500", bg: "bg-blue-500/10" },
        { icon: Zap, title: "Performant", color: "text-amber-500", bg: "bg-amber-500/10" },
        { icon: Server, title: "Native Master", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ];
    const normalizedWebsite = formData.website.trim();
    const websiteHref = normalizedWebsite
        ? normalizedWebsite.startsWith("http")
            ? normalizedWebsite
            : `https://${normalizedWebsite}`
        : null;

    const handleSave = () => {
        saveProfileMutation.mutate(formData);
    };

    if (isProfileLoading || isGithubLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background/95">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background/95 pb-20">
            {/* Cover Photo Area */}
            <div className="h-48 md:h-64 w-full bg-gradient-to-r from-primary/40 via-purple-500/20 to-secondary relative">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-black/10" />

                {/* Edit Cover Action */}
                <button className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-md backdrop-blur text-white text-xs font-medium flex items-center gap-1.5 transition">
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Change Cover</span>
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Profile Section */}
                <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-8">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-background bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                            {githubData?.avatar_url ? (
                                <img src={githubData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-16 h-16 text-muted-foreground" />
                            )}
                        </div>
                        <button className="absolute bottom-2 right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Name & Basic Info */}
                    <div className="flex-1 text-center sm:text-left pt-4 sm:pt-0 pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <h1 className="text-3xl font-display font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
                                {formData.name}
                                <Award className="w-5 h-5 text-blue-500" /> {/* Verified Badge */}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold w-fit mx-auto sm:mx-0">
                                PRO USER
                            </span>
                        </div>
                        <p className="text-muted-foreground font-medium mt-1">{formData.handle} • {formData.role}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                disabled={saveProfileMutation.isPending}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                {saveProfileMutation.isPending ? (
                                    <Loader2 key="loading" className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check key="check" className="w-4 h-4" />
                                )}
                                <span>Save Changes</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium flex items-center gap-2 hover:bg-secondary/80 transition border border-border">
                                <Edit2 className="w-4 h-4" /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Sidebar (Info) */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Bio Section */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" /> About
                            </h3>
                            {isEditing ? (
                                <textarea
                                    className="w-full bg-secondary border border-border rounded-md p-3 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed">{formData.bio}</p>
                            )}

                            <hr className="my-4 border-border" />

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Globe className="w-4 h-4 shrink-0" />
                                    {isEditing ? (
                                        <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="bg-secondary rounded px-2 py-1 outline-none w-full border border-border" />
                                    ) : (
                                        <span>{formData.location}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Mail className="w-4 h-4 shrink-0" />
                                    {isEditing ? (
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary rounded px-2 py-1 outline-none w-full border border-border" />
                                    ) : (
                                        <span>{formData.email || 'No email provided'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <LinkIcon className="w-4 h-4 shrink-0" />
                                    {isEditing ? (
                                        <input type="text" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="bg-secondary rounded px-2 py-1 outline-none w-full border border-border" />
                                    ) : (
                                        websiteHref ? (
                                            <a href={websiteHref} target="_blank" rel="noreferrer" className="text-primary hover:underline line-clamp-1">
                                                {normalizedWebsite.replace('https://', '')}
                                            </a>
                                        ) : (
                                            <span>No website</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Achievements */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="font-semibold text-foreground mb-4">Achievements</h3>
                            <div className="space-y-4">
                                {achievements.map((achievement, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${achievement.bg}`}>
                                            <achievement.icon className={`w-4 h-4 ${achievement.color}`} />
                                        </div>
                                        <span className="text-sm font-medium text-foreground">{achievement.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Main Content (Tabs) */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Tabs Navbar */}
                        <div className="border-b border-border flex gap-6 overflow-x-auto hide-scrollbar">
                            {['profile', 'security', 'notifications'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 text-sm font-medium capitalize whitespace-nowrap transition-colors relative ${activeTab === tab
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content Area */}
                        <div className="bg-card border border-border rounded-xl p-6 min-h-[400px]">

                            {activeTab === 'profile' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h2 className="text-lg font-semibold border-b border-border pb-2">Public Profile Details</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary transition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">Username</label>
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={formData.handle}
                                                onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary transition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary transition"
                                            />
                                        </div>
                                    </div>

                                    <h2 className="text-lg font-semibold border-b border-border pb-2 mt-8">Social Connect</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-secondary/30 border border-border rounded-lg">
                                            <Github className="w-5 h-5 text-foreground" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">GitHub</p>
                                                <p className="text-xs text-muted-foreground">github.com/{username || "..."}</p>
                                            </div>
                                            {username ? (
                                                <div className="w-2 h-2 rounded-full bg-ide-success"></div>
                                            ) : (
                                                <button className="text-xs text-primary font-medium hover:underline">Connect</button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-secondary/30 border border-border rounded-lg">
                                            <Twitter className="w-5 h-5 text-blue-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Twitter</p>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={formData.twitter}
                                                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                                        placeholder="username"
                                                        className="bg-transparent text-xs text-foreground outline-none border-b border-border focus:border-primary px-1"
                                                    />
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">@{formData.twitter || "..."}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-primary" /> Session & Authentication
                                    </h2>
                                    <div className="space-y-4 bg-secondary/20 p-4 rounded-lg border border-border/50">
                                        <div className="flex justify-between items-center pb-4 border-b border-border/50">
                                            <div>
                                                <p className="text-sm font-medium">Session Protection</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Origin-bound session proof is stored in an HttpOnly cookie and never exposed in the UI.
                                                </p>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-ide-success"></div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    GitHub OAuth <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${username
                                                        ? "bg-ide-success/10 text-ide-success"
                                                        : "bg-muted text-muted-foreground"
                                                        }`}>{username ? "Connected" : "Inactive"}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {username
                                                        ? "Authenticated via GitHub with cookie-bound session verification."
                                                        : "Connect GitHub to enable repository access and signed session verification."}
                                                </p>
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">{sessionId.slice(0, 8)}••••</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-primary" /> IDE Notifications
                                    </h2>
                                    <div className="space-y-4 pt-2">
                                        {[
                                            { title: "Background Sync", desc: "Get notified when GitHub sync completes.", defaultOn: true },
                                            { title: "AI Generation", desc: "Play sound when AI finishes coding.", defaultOn: false },
                                            { title: "Usage Reports", desc: "Weekly digest of your AI Token and IDE usage.", defaultOn: true }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                                </div>
                                                <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer flex transition-colors ${item.defaultOn ? 'bg-primary justify-end' : 'bg-secondary border border-border justify-start'}`}>
                                                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
