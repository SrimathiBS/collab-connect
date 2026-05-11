import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Target,
  Loader2,
  Plus,
  Check,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Circle,
} from "lucide-react";

type TaskStatus = "pending" | "completed";

interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
}
interface Task {
  id: string;
  project_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}
interface Profile {
  id: string;
  username: string;
}

const db = supabase as any;

const ProgressBar = ({ done, total }: { done: number; total: number }) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Milestone</span>
        <span>
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const MissionControl = () => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});

  const loadOverview = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Owned projects
    const { data: owned } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id);

    // Accepted memberships
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const memberProjectIds = (memberships ?? []).map((m: any) => m.project_id);
    let memberProjects: Project[] = [];
    if (memberProjectIds.length > 0) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .in("id", memberProjectIds);
      memberProjects = (data as Project[]) ?? [];
    }

    const all = [...((owned as Project[]) ?? []), ...memberProjects];
    const dedup = Array.from(new Map(all.map((p) => [p.id, p])).values());
    setProjects(dedup);

    if (dedup.length > 0) {
      const { data: tasks } = await db
        .from("project_tasks")
        .select("*")
        .in(
          "project_id",
          dedup.map((p) => p.id),
        );
      const map: Record<string, Task[]> = {};
      ((tasks as Task[]) ?? []).forEach((t) => {
        (map[t.project_id] ||= []).push(t);
      });
      setTasksByProject(map);
    } else {
      setTasksByProject({});
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!projectId) loadOverview();
  }, [projectId, loadOverview]);

  if (projectId) {
    return <ProjectBoard projectId={projectId} onBack={() => navigate("/app/mission-control")} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Mission Control</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Assign tasks, track milestones, and ship your projects together.
      </p>

      {projects.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          You're not part of any projects yet. Create one or join a team to get started.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const tasks = tasksByProject[p.id] ?? [];
            const done = tasks.filter((t) => t.status === "completed").length;
            const isOwner = p.owner_id === user?.id;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/app/mission-control/${p.id}`)}
                className="text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{p.title}</h3>
                  {isOwner && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                      Owner
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {p.description || "No description"}
                </p>
                <ProgressBar done={done} total={tasks.length} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ProjectBoard = ({ projectId, onBack }: { projectId: string; onBack: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const isOwner = project?.owner_id === user?.id;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    setProject((p as Project) ?? null);

    const { data: t } = await db
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks((t as Task[]) ?? []);

    // Load accepted members + owner
    if (p) {
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("status", "accepted");
      const ids = Array.from(
        new Set([(p as any).owner_id, ...((memberRows ?? []).map((m: any) => m.user_id))]),
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      setMembers((profiles as Profile[]) ?? []);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((pr: any) => (map[pr.id] = pr.username));
      setProfileMap(map);
    }

    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTask = async () => {
    if (!user || !title.trim() || !assignee) {
      return toast.error("Title and assignee required");
    }
    setCreating(true);
    const { error } = await db.from("project_tasks").insert({
      project_id: projectId,
      assigned_to: assignee,
      assigned_by: user.id,
      title: title.trim(),
      description: description.trim(),
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Task assigned");
    setOpen(false);
    setTitle("");
    setDescription("");
    setAssignee("");
    load();
  };

  const completeTask = async (id: string) => {
    const { error } = await db
      .from("project_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Milestone reached!");
    load();
  };

  const deleteTask = async (id: string) => {
    const { error } = await db.from("project_tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const visibleTasks = useMemo(
    () => (isOwner ? tasks : tasks.filter((t) => t.assigned_to === user?.id)),
    [tasks, isOwner, user?.id],
  );

  const done = visibleTasks.filter((t) => t.status === "completed").length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Assign task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign a task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          @{m.username}
                          {m.id === project.owner_id ? " (owner)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createTask}
                  disabled={creating}
                  className="bg-gradient-primary shadow-glow hover:opacity-90"
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{project.title}</h1>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
        <ProgressBar done={done} total={visibleTasks.length} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isOwner ? "All tasks" : "Your tasks"}
        </h2>
        {visibleTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {isOwner
              ? "No tasks yet — assign one to get the team moving."
              : "No tasks assigned to you yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map((t) => {
              const completed = t.status === "completed";
              const canComplete = !completed && t.assigned_to === user?.id;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-card p-4 flex items-start gap-3"
                >
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium ${completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {t.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        @{profileMap[t.assigned_to] ?? "user"}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canComplete && (
                      <Button
                        size="sm"
                        onClick={() => completeTask(t.id)}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Completed
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionControl;
