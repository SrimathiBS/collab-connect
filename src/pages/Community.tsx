import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_username?: string;
}

const Community = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [community, setCommunity] = useState<{ name: string; description: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("community_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return; // RLS may block before joining; that's fine

    const ids = Array.from(new Set((data ?? []).map((m) => m.sender_id)));
    const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p.username]));

    setMessages((data ?? []).map((m: any) => ({ ...m, sender_username: pmap.get(m.sender_id) ?? "unknown" })));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from("communities").select("name, description").eq("id", id).maybeSingle();
      setCommunity(c);
      await loadMessages();
      setLoading(false);
    })();

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`community-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `community_id=eq.${id}` },
        () => loadMessages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !user || !id) return;
    if (content.length > 2000) return toast.error("Message too long");
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      community_id: id, sender_id: user.id, content,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setDraft("");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!community) return <p className="text-muted-foreground">Community not found.</p>;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button asChild variant="ghost" size="icon"><Link to="/app/communities"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold"># {community.name}</h1>
          <p className="text-xs text-muted-foreground">{community.description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No messages yet — say hi!</p>
        ) : messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-card ${mine ? "bg-gradient-primary text-primary-foreground" : "bg-card border border-border"}`}>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${mine ? "text-primary-foreground/90" : "text-primary"}`}>@{m.sender_username}</span>
                  <span className={`text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-border">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message #${community.name}…`} maxLength={2000} />
        <Button type="submit" disabled={sending || !draft.trim()} className="bg-gradient-primary shadow-glow hover:opacity-90">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default Community;
