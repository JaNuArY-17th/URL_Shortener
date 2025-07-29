import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Link2,
  BarChart3,
  Settings,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthenticatedHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath === path;
  };

  const isProfilePage = currentPath === "/profile";

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                QuickLink
              </h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button 
            variant={isActive("/dashboard") ? "default" : "ghost"} 
            size="sm" 
            className="gap-2"
            asChild
          >
            <Link to="/dashboard">
              <Link2 className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button 
            variant={isActive("/analytics") ? "default" : "ghost"} 
            size="sm" 
            className="gap-2"
            asChild
          >
            <Link to="/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button 
            variant={isActive("/settings") ? "default" : "ghost"} 
            size="sm" 
            className="gap-2"
            asChild
          >
            <Link to="/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button 
            variant={isProfilePage ? "default" : "outline"} 
            size="sm" 
            className="gap-2"
            asChild
          >
            <Link to="/profile">
              <User className={cn("h-4 w-4", isProfilePage && "text-white")} />
              <span className={isProfilePage ? "text-white" : ""}>
                {user?.name || 'Account'}
              </span>
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
} 