import {
    Sparkles,
    FolderGit2,
    Settings,
    PanelLeftClose,
    PanelLeft,
    Eye,
    MessageSquare,
    Github,
    GitBranch,
    Activity,
    User,
} from "lucide-react";
import { NotificationHub } from "./NotificationHub";

interface HeaderActionsProps {
    isMobile?: boolean;
    onNavigate: (screen: "ai-planner" | "repos" | "settings" | "dashboard" | "profile") => void;
    // Desktop specific props
    sidebarVisible?: boolean;
    onToggleSidebar?: () => void;
    previewVisible?: boolean;
    onTogglePreview?: () => void;
    rightPanel?: "chat" | "github" | "git";
    chatVisible?: boolean;
    onToggleRightPanel?: (panel: "chat" | "github" | "git") => void;
}

export function HeaderActions({
    isMobile = false,
    onNavigate,
    sidebarVisible,
    onToggleSidebar,
    previewVisible,
    onTogglePreview,
    rightPanel,
    chatVisible,
    onToggleRightPanel,
}: HeaderActionsProps) {
    if (isMobile) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => onNavigate("ai-planner")}
                    aria-label="Open AI project planner"
                    title="AI Project Planner"
                    className="p-2 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                >
                    <Sparkles className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate("repos")}
                    aria-label="Open repositories"
                    title="Repositories"
                    className="p-2 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                >
                    <FolderGit2 className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate("settings")}
                    aria-label="Open settings"
                    title="Settings"
                    className="p-2 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                >
                    <Settings className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    aria-label="Open dashboard"
                    title="Dashboard"
                    className="p-2 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                >
                    <Activity className="h-4 w-4" />
                </button>
                <NotificationHub />
                <button
                    type="button"
                    onClick={() => onNavigate("profile")}
                    aria-label="Open profile"
                    title="Profile"
                    className="p-2 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                >
                    <User className="h-4 w-4" />
                </button>
            </>
        );
    }

    // Desktop Actions
    return (
        <div className="flex items-center gap-0.5">
            <button
                type="button"
                onClick={() => onNavigate("ai-planner")}
                aria-label="Open AI project planner"
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                title="AI Project Planner"
            >
                <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onNavigate("repos")}
                aria-label="Open repositories"
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                title="Repositories"
            >
                <FolderGit2 className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onNavigate("settings")}
                aria-label="Open settings"
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                title="Settings"
            >
                <Settings className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                aria-label="Open dashboard"
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                title="Dashboard"
            >
                <Activity className="h-3.5 w-3.5" />
            </button>
            <NotificationHub />
            <button
                type="button"
                onClick={() => onNavigate("profile")}
                aria-label="Open user profile"
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                title="User Profile"
            >
                <User className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
                title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
                className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
            >
                {sidebarVisible ? (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                    <PanelLeft className="h-3.5 w-3.5" />
                )}
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
                type="button"
                onClick={onTogglePreview}
                aria-label={previewVisible ? "Hide preview" : "Show preview"}
                className={`p-1.5 rounded-md transition-all duration-200 ${previewVisible
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                title="Preview"
            >
                <Eye className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={() => onToggleRightPanel?.("chat")}
                aria-label={rightPanel === "chat" && chatVisible ? "Hide AI chat panel" : "Show AI chat panel"}
                title="AI Chat"
                className={`p-1.5 rounded-md transition-all duration-200 ${rightPanel === "chat" && chatVisible
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
            >
                <MessageSquare className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={() => onToggleRightPanel?.("github")}
                aria-label={rightPanel === "github" && chatVisible ? "Hide GitHub panel" : "Show GitHub panel"}
                title="GitHub"
                className={`p-1.5 rounded-md transition-all duration-200 ${rightPanel === "github" && chatVisible
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
            >
                <Github className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={() => onToggleRightPanel?.("git")}
                aria-label={rightPanel === "git" && chatVisible ? "Hide Git panel" : "Show Git panel"}
                className={`p-1.5 rounded-md transition-all duration-200 ${rightPanel === "git" && chatVisible
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                title="Git"
            >
                <GitBranch className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
