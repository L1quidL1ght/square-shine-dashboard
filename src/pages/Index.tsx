import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Menu } from "lucide-react";
import Dashboard from "./Dashboard";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dashboard-bg">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between p-4 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="p-2 hover:bg-accent rounded-lg transition-colors">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold text-foreground">Square Analytics</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Dashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;