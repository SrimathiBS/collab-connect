import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, FolderKanban, MessagesSquare, Github } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle text-foreground">
      {/* Nav */}
      <nav className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">CollabX</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Link to="/auth?mode=signup">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-6">
          <Sparkles className="h-3 w-3" />
          Where developers find their next collaborator
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Build together on{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            CollabX
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Find collaborators by skill, connect with developers, launch projects, and
          join communities — all in one beautifully dark place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Link to="/auth?mode=signup">Create your profile</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-24 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, title: "Skill-based search", desc: "Discover devs that match your stack." },
          { icon: Github, title: "GitHub-first", desc: "Show off your work with one link." },
          { icon: FolderKanban, title: "Projects", desc: "Post ideas, accept teammates." },
          { icon: MessagesSquare, title: "Communities", desc: "Hang out with React, DevOps & more." },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary mb-3">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built with Lovable Cloud · CollabX © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Landing;
