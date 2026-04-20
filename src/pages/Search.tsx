import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkillTags } from "@/components/SkillTags";
import { toast } from "sonner";
import { Github, Loader2, Search as SearchIcon, UserPlus, Check, Clock } from "lucide-react";

interface UserRow {
  id: string;
  username: string;
  bio: string;
  github_url: string;
  skills: string[];
}

const Search = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [conns, setConns] = useState<Record<string, "pending" | "accepted" | "rejected" | "outgoing">>({});

  const loadUsers = async () => {
    setLoading(true);
    let q = supabase.from("profiles").select("*").neq("id", user!.id).limit(50);
    if (query.trim()) {
      const term = query.trim().toLowerCase();
      q = q.or(`username.ilike.%${term}%,skills.cs.{${term}}`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  };

  const loadConnections = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("connections")
      .select("requester_id, receiver_id, status")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
    const map: Record<string, any> = {};
    (data ?? []).forEach((c: any) => {
      const otherId = c.requester_id === user.id ? c.receiver_id : c.requester_id;
      map[otherId] = c.requester_id === user.id && c.status === "pending" ? "outgoing" : c.status;
    });
    setConns(map);
  };

  useEffect(() => {
    if (!user) return;
    loadUsers();
    loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const sendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from("connections").insert({
      requester_id: user.id,
      receiver_id: receiverId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connection request sent");
    setConns((c) => ({ ...c, [receiverId]: "outgoing" }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find collaborators</h1>
        <p className="text-muted-foreground text-sm">Search by username or skill (e.g. <code>react</code>).</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); loadUsers(); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="react, devops, ada…"
            className="pl-9"
          />
        </div>
        <Button type="submit" className="bg-gradient-primary shadow-glow hover:opacity-90">Search</Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No users found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const status = conns[u.id];
            return (
              <div key={u.id} className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">@{u.username}</p>
                    {u.github_url && (
                      <a href={u.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate">
                        <Github className="h-3 w-3" /> GitHub
                      </a>
                    )}
                  </div>
                </div>
                {u.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{u.bio}</p>}
                <div className="mt-3"><SkillTags skills={u.skills} max={5} /></div>
                <div className="mt-4">
                  {status === "accepted" ? (
                    <Button disabled variant="secondary" className="w-full"><Check className="h-4 w-4 mr-2" />Connected</Button>
                  ) : status === "outgoing" || status === "pending" ? (
                    <Button disabled variant="outline" className="w-full"><Clock className="h-4 w-4 mr-2" />Pending</Button>
                  ) : (
                    <Button onClick={() => sendRequest(u.id)} className="w-full bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30">
                      <UserPlus className="h-4 w-4 mr-2" />Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Search;
