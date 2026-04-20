import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-background/60 backdrop-blur-md px-4 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-auto text-xs text-muted-foreground">
              Find. Connect. Build.
            </div>
          </header>
          <main className="flex-1 p-6 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
