import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Dashboard from "./Dashboard";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dashboard-bg">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <div className="ml-4">
              <h2 className="text-lg font-semibold">Restaurant Performance Analytics</h2>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Dashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
