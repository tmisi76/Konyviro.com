import { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  Bot,
  Mail,
  LifeBuoy,
  Settings,
  BarChart3,
  ScrollText,
  AlertCircle,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  ArrowLeft,
  Search,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FullPageLoader } from "@/components/ui/full-page-loader";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const ADMIN_NAV_ITEMS = [
  {
    section: "Főmenü",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Felhasználók", href: "/admin/users", icon: Users },
      { name: "Projektek", href: "/admin/projects", icon: BookOpen },
      { name: "Előfizetések", href: "/admin/billing", icon: CreditCard },
    ],
  },
  {
    section: "Rendszer",
    items: [
      { name: "AI Beállítások", href: "/admin/ai-settings", icon: Bot },
      { name: "TTS Hangok", href: "/admin/voices", icon: Bot },
      { name: "Email Sablonok", href: "/admin/emails", icon: Mail },
      { name: "Support Ticketek", href: "/admin/support", icon: LifeBuoy },
      { name: "Beállítások", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    section: "Analitika",
    items: [
      { name: "Statisztikák", href: "/admin/analytics", icon: BarChart3 },
      { name: "Tevékenység Log", href: "/admin/logs", icon: ScrollText },
      { name: "Hibalista", href: "/admin/issues", icon: AlertCircle },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, role, isLoading } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Header */}
      <header className="h-14 bg-background border-b flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <PenTool className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:inline">KönyvÍró AI</span>
            <Badge variant="secondary" className="text-xs">
              Admin
            </Badge>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              className="w-64 pl-9 h-9"
            />
          </div>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="font-medium mb-2">Értesítések</div>
              <div className="text-sm text-muted-foreground py-4 text-center">
                Nincs új értesítés
              </div>
            </PopoverContent>
          </Popover>

          {/* Admin Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm truncate max-w-[120px]">
                  {user?.email}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Admin Account</span>
                  <span className="text-xs font-normal text-muted-foreground capitalize">
                    {role?.replace("_", " ")}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Vissza az alkalmazásba
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Kijelentkezés
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "bg-background border-r flex flex-col transition-all duration-200 sticky top-14 h-[calc(100vh-3.5rem)]",
            sidebarOpen ? "w-56" : "w-14"
          )}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            {ADMIN_NAV_ITEMS.map((section) => (
              <div key={section.section} className="mb-4">
                {sidebarOpen && (
                  <div className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {section.section}
                  </div>
                )}
                <div className="space-y-1 px-2">
                  {section.items.map((item) => {
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== "/admin" &&
                        location.pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {sidebarOpen && <span>{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* System Status */}
          {sidebarOpen && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Rendszer OK</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
