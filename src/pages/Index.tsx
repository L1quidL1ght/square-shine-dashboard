
import React from "react";
import Dashboard from "./Dashboard";

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-dashboard-bg">
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Square Analytics</h1>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
