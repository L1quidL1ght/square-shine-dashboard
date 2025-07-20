
import { BarChart3, Users, FileText, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Overview", url: "/", icon: BarChart3 },
  { title: "Team Performance", url: "/team", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-12" : "w-48"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold px-2 py-3 text-sidebar-foreground">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium">Analytics</span>
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8 transition-all duration-200 hover:bg-sidebar-accent/50">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded px-2 py-1.5 transition-all text-xs font-medium ${
                          isActive ? 
                            "bg-primary text-primary-foreground shadow-sm" : 
                            "text-black hover:bg-sidebar-accent hover:text-black"
                        }`
                      }
                    >
                      <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium text-xs">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
