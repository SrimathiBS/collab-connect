import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { SkillTags } from "@/components/SkillTags";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FolderKanban, Loader2, Plus, UserPlus, Check, Clock, X, CheckCircle2, Trophy, Search as SearchIcon } from "lucide-react";

interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  tech_stack: string[];
  status: "active" | "completed";
  completed_at: string | null;
  owner?: { username: string };
}
interface Membership {
  id: string;
  project_id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
}

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tech, setTech] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: pdata, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);

    const ownerIds = Array.from(new Set((pdata ?? []).map((p: any) => p.owner_id)));
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ownerIds);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const enriched: Project[] = (pdata ?? []).map((p: any) => ({ ...p, owner: pmap.get(p.owner_id) }));
    setProjects(enriched);

    const { data: mdata } = await supabase.from("project_members").select("*");
    setMemberships((mdata as Membership[]) ?? []);

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!user || !title.trim()) return toast.error("Title required");
    setCreating(true);
    const { error } = await supabase.from("projects").insert({
      owner_id: user.id, title: title.trim(), description: description.trim(), tech_stack: tech,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setOpen(false); setTitle(""); setDescription(""); setTech([]);
    load();
  };

  const requestJoin = async (projectId: string) => {
    if (!user) return;
    const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Join request sent");
    load();
  };

  const respondMember = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("project_members").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const markCompleted = async (projectId: string) => {
    const { error } = await supabase
      .from("projects")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) return toast.error(error.message);
    toast.success("Project marked as completed 🎉");
    load();
  };

  const reopenProject = async (projectId: string) => {
    const { error } = await supabase
      .from("projects")
      .update({ status: "active", completed_at: null })
      .eq("id", projectId);
    if (error) return toast.error(error.message);
    toast.success("Project reopened");
    load();
  };

  const myStatusFor = (projectId: string) =>
    memberships.find((m) => m.project_id === projectId && m.user_id === user?.id)?.status;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const active = projects.filter((p) => p.status !== "completed");
  const completed = projects.filter((p) => p.status === "completed");

  const renderCard = (p: Project) => {
    const isOwner = p.owner_id === user?.id;
    const status = myStatusFor(p.id);
    const pending = isOwner ? memberships.filter((m) => m.project_id === p.id && m.status === "pending") : [];
    const isCompleted = p.status === "completed";
    return (
      <div key={p.id} className={`rounded-xl border p-5 shadow-card flex flex-col ${isCompleted ? "border-emerald-500/30 bg-card/60" : "border-border bg-card"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {p.title}
              {isCompleted && <Trophy className="h-4 w-4 text-emerald-400" />}
            </h3>
            <p className="text-xs text-muted-foreground">by @{p.owner?.username ?? "unknown"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isOwner && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">Owner</span>}
            {isCompleted ? (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Completed</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Active</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.description}</p>
        <div className="mt-3"><SkillTags skills={p.tech_stack} /></div>

        {isCompleted && p.completed_at && (
          <p className="text-xs text-emerald-400/80 mt-3">
            Completed on {new Date(p.completed_at).toLocaleDateString()}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {isCompleted ? (
            isOwner ? (
              <Button variant="outline" className="w-full" onClick={() => reopenProject(p.id)}>
                Reopen project
              </Button>
            ) : (
              <Button disabled variant="secondary" className="w-full">
                <Trophy className="h-4 w-4 mr-2" />Completed
              </Button>
            )
          ) : isOwner ? (
            <>
              {pending.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pending requests ({pending.length}):</p>
                  {pending.map((m) => <PendingRow key={m.id} membership={m} onAccept={() => respondMember(m.id, "accepted")} onReject={() => respondMember(m.id, "rejected")} />)}
                </div>
              ) : <p className="text-xs text-muted-foreground">No pending requests.</p>}
              <Button onClick={() => markCompleted(p.id)} className="w-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark as completed
              </Button>
            </>
          ) : status === "accepted" ? (
            <Button disabled variant="secondary" className="w-full"><Check className="h-4 w-4 mr-2" />Member</Button>
          ) : status === "pending" ? (
            <Button disabled variant="outline" className="w-full"><Clock className="h-4 w-4 mr-2" />Request pending</Button>
          ) : status === "rejected" ? (
            <Button disabled variant="outline" className="w-full text-destructive">Request rejected</Button>
          ) : (
            <Button onClick={() => requestJoin(p.id)} className="w-full bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"><UserPlus className="h-4 w-4 mr-2" />Request to join</Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow hover:opacity-90"><Plus className="h-4 w-4 mr-2" />New project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a project</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></div>
              <div className="space-y-2"><Label>Tech stack</Label><TagInput value={tech} onChange={setTech} placeholder="react, node, postgres…" /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={creating} className="bg-gradient-primary shadow-glow hover:opacity-90">{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">
            <Trophy className="h-3.5 w-3.5 mr-1.5" />Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {active.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No active projects yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">{active.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completed.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No completed projects yet. Finish strong! 🚀</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">{completed.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PendingRow = ({ membership, onAccept, onReject }: { membership: Membership; onAccept: () => void; onReject: () => void }) => {
  const [username, setUsername] = useState<string>("…");
  useEffect(() => {
    supabase.from("profiles").select("username").eq("id", membership.user_id).maybeSingle().then(({ data }) => {
      if (data) setUsername(data.username);
    });
  }, [membership.user_id]);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate">@{username}</span>
      <div className="flex gap-1">
        <Button size="sm" onClick={onAccept} className="h-7 bg-gradient-primary hover:opacity-90"><Check className="h-3 w-3" /></Button>
        <Button size="sm" variant="outline" onClick={onReject} className="h-7"><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );
};

export default Projects;
