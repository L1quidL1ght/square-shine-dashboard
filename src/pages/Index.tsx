
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Users } from "lucide-react";
import Dashboard from "./Dashboard";

const Index = () => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen w-full bg-dashboard-bg">
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Square Analytics</h1>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/">
            <Button 
              variant={location.pathname === '/' ? "default" : "outline"} 
              size="sm"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Team Performance
            </Button>
          </Link>
          <Link to="/analytics">
            <Button 
              variant={location.pathname === '/analytics' ? "default" : "outline"} 
              size="sm"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Restaurant Analytics
            </Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 overflow-auto">
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
