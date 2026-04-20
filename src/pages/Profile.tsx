import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/TagInput";
import { SkillTags } from "@/components/SkillTags";
import { toast } from "sonner";
import { Github, Loader2, Pencil, Save, X } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  bio: string;
  github_url: string;
  skills: string[];
  avatar_url: string;
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit state
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setProfile(data as Profile);
        setBio(data.bio ?? "");
        setGithub(data.github_url ?? "");
        setSkills(data.skills ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio, github_url: github, skills })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile((p) => (p ? { ...p, bio, github_url: github, skills } : p));
    setEditing(false);
    toast.success("Profile updated");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!profile) return <p className="text-muted-foreground">No profile found.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-28 bg-gradient-primary" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end justify-between">
            <div className="h-24 w-24 rounded-2xl bg-card border-4 border-card flex items-center justify-center text-3xl font-bold bg-gradient-primary text-primary-foreground shadow-glow">
              {profile.username[0]?.toUpperCase()}
            </div>
            {!editing ? (
              <Button variant="outline" onClick={() => setEditing(true)} className="mt-12">
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2 mt-12">
                <Button variant="ghost" onClick={() => { setEditing(false); setBio(profile.bio); setGithub(profile.github_url); setSkills(profile.skills); }}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                <Button onClick={save} disabled={saving} className="bg-gradient-primary shadow-glow hover:opacity-90">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold mt-4">@{profile.username}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>

          <div className="mt-6 space-y-6">
            <div>
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Bio</Label>
              {editing ? (
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Tell devs about yourself…" className="mt-1" />
              ) : (
                <p className="mt-1 text-foreground/90">{profile.bio || <span className="text-muted-foreground italic">No bio yet.</span>}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">GitHub</Label>
              {editing ? (
                <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/you" className="mt-1" />
              ) : profile.github_url ? (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-2 text-primary hover:underline">
                  <Github className="h-4 w-4" /> {profile.github_url}
                </a>
              ) : (
                <p className="mt-1 text-muted-foreground italic">No GitHub link.</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Skills</Label>
              <div className="mt-2">
                {editing ? (
                  <TagInput value={skills} onChange={setSkills} placeholder="Add a skill and press Enter" />
                ) : (
                  <SkillTags skills={profile.skills} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
