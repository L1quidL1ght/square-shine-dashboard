import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Dashboard from "./Dashboard";
const Index = () => {
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dashboard-bg">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          
          <main className="flex-1 p-3 overflow-auto">
            <Dashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>;
};
export default Index;