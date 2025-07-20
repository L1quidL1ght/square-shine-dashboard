
import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Dashboard from "./Dashboard";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dashboard-bg">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-3 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div>
                <h1 className="text-sm font-semibold text-foreground">Restaurant Performance</h1>
                <p className="text-xs text-muted-foreground">Analytics Dashboard</p>
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 overflow-auto">
            <Dashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
