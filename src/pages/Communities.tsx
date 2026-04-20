import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessagesSquare, Loader2, Plus, Check, ArrowRight } from "lucide-react";

interface Community {
  id: string;
  name: string;
  description: string;
  created_by: string;
  member_count?: number;
  joined?: boolean;
}

const Communities = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: cdata, error } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);

    const { data: members } = await supabase.from("community_members").select("community_id, user_id");
    const counts = new Map<string, number>();
    const joined = new Set<string>();
    (members ?? []).forEach((m: any) => {
      counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
      if (m.user_id === user.id) joined.add(m.community_id);
    });

    setCommunities((cdata ?? []).map((c: any) => ({
      ...c,
      member_count: counts.get(c.id) ?? 0,
      joined: joined.has(c.id),
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!user || !name.trim()) return toast.error("Name required");
    setCreating(true);
    const { data, error } = await supabase.from("communities").insert({
      name: name.trim(), description: description.trim(), created_by: user.id,
    }).select().single();
    if (error) { setCreating(false); return toast.error(error.message); }
    // Auto-join the creator
    await supabase.from("community_members").insert({ community_id: data.id, user_id: user.id });
    setCreating(false);
    setOpen(false); setName(""); setDescription("");
    toast.success("Community created");
    load();
  };

  const join = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Joined!");
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Communities</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow hover:opacity-90"><Plus className="h-4 w-4 mr-2" />New community</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a community</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="e.g. React Devs" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={creating} className="bg-gradient-primary shadow-glow hover:opacity-90">{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {communities.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No communities yet — create one!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-col">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg"># {c.name}</h3>
                <span className="text-xs text-muted-foreground">{c.member_count} {c.member_count === 1 ? "member" : "members"}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">{c.description || <span className="italic">No description</span>}</p>
              <div className="mt-4 flex gap-2">
                {c.joined ? (
                  <>
                    <Button disabled variant="secondary" className="flex-1"><Check className="h-4 w-4 mr-2" />Joined</Button>
                    <Button asChild className="flex-1 bg-gradient-primary shadow-glow hover:opacity-90">
                      <Link to={`/app/communities/${c.id}`}>Open <ArrowRight className="h-4 w-4 ml-2" /></Link>
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => join(c.id)} className="w-full bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30">Join</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Communities;
