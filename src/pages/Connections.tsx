import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkillTags } from "@/components/SkillTags";
import { toast } from "sonner";
import { Check, X, Github, Loader2, Users } from "lucide-react";

interface ConnRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  profile: { id: string; username: string; github_url: string; skills: string[]; bio: string };
}

const Connections = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<ConnRow[]>([]);
  const [accepted, setAccepted] = useState<ConnRow[]>([]);
  const [outgoing, setOutgoing] = useState<ConnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("connections")
      .select("*")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // collect other-user ids and fetch profiles in one go
    const otherIds = Array.from(new Set((rows ?? []).map((r: any) => (r.requester_id === user.id ? r.receiver_id : r.requester_id))));
    const { data: profiles } = await supabase.from("profiles").select("id, username, github_url, skills, bio").in("id", otherIds);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const enriched: ConnRow[] = (rows ?? []).map((r: any) => ({
      ...r,
      profile: pmap.get(r.requester_id === user.id ? r.receiver_id : r.requester_id) ?? { id: "", username: "unknown", github_url: "", skills: [], bio: "" },
    }));

    setIncoming(enriched.filter((r) => r.receiver_id === user.id && r.status === "pending"));
    setOutgoing(enriched.filter((r) => r.requester_id === user.id && r.status === "pending"));
    setAccepted(enriched.filter((r) => r.status === "accepted"));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("connections").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Connection accepted" : "Request rejected");
    load();
  };

  const renderCard = (c: ConnRow, actions?: React.ReactNode) => (
    <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
          {c.profile.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">@{c.profile.username}</p>
          {c.profile.github_url && (
            <a href={c.profile.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <Github className="h-3 w-3" /> GitHub
            </a>
          )}
        </div>
      </div>
      {c.profile.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{c.profile.bio}</p>}
      <div className="mt-3 flex-1"><SkillTags skills={c.profile.skills} max={5} /></div>
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Connections</h1>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
          <TabsTrigger value="connections">Connected ({accepted.length})</TabsTrigger>
          <TabsTrigger value="outgoing">Sent ({outgoing.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6">
          {incoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No incoming requests.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {incoming.map((c) => renderCard(c, (
                <div className="flex gap-2">
                  <Button onClick={() => respond(c.id, "accepted")} className="flex-1 bg-gradient-primary shadow-glow hover:opacity-90"><Check className="h-4 w-4 mr-1" />Accept</Button>
                  <Button onClick={() => respond(c.id, "rejected")} variant="outline" className="flex-1"><X className="h-4 w-4 mr-1" />Reject</Button>
                </div>
              )))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          {accepted.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No connections yet — start searching!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{accepted.map((c) => renderCard(c))}</div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-6">
          {outgoing.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No pending sent requests.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {outgoing.map((c) => renderCard(c, <p className="text-xs text-muted-foreground text-center">Awaiting response…</p>))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Connections;
