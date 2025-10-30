import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart3, FileText, Users, Package, PlusCircle, Home, UserCircle, LogOut, CheckCircle } from "lucide-react";
import { useCompanySettings } from "@/contexts/CompanySettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import FaviconUpdater from "@/components/FaviconUpdater";
import TitleUpdater from "@/components/TitleUpdater";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger } from
"@/components/ui/sidebar";

const navigationItems = [
{
  title: "Dashboard",
  url: createPageUrl("Dashboard"),
  icon: Home,
  color: "lavender"
},
{
  title: "New Quote",
  url: createPageUrl("QuoteBuilder"),
  icon: PlusCircle,
  color: "mint"
},
{
  title: "Products",
  url: createPageUrl("Products"),
  icon: Package,
  color: "blue"
},
{
  title: "Customers",
  url: createPageUrl("Customers"),
  icon: Users,
  color: "peach"
},
{
  title: "Quotes",
  url: createPageUrl("Quotes"),
  icon: FileText,
  color: "lavender"
},
{
  title: "Confirmed Sales Orders",
  url: createPageUrl("ConfirmedSalesOrders"),
  icon: CheckCircle,
  color: "blue"
},
{
  title: "Company Settings",
  url: createPageUrl("CompanySettings"),
  icon: BarChart3,
  color: "blue"
},
{
  title: "My Account",
  url: createPageUrl("MyAccount"),
  icon: UserCircle,
  color: "peach"
}];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getLogoUrl, companySettings } = useCompanySettings();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // The ProtectedRoute will automatically redirect to login when isAuthenticated becomes false
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (currentPageName === 'QuotePrint') {
    return <>{children}</>;
  }

  const getIconBg = (color, isActive) => {
    const colors = {
      lavender: isActive ? "bg-gradient-to-br from-purple-200 to-purple-300" : "bg-gradient-to-br from-purple-100 to-purple-200",
      mint: isActive ? "bg-gradient-to-br from-green-200 to-green-300" : "bg-gradient-to-br from-green-100 to-green-200",
      blue: isActive ? "bg-gradient-to-br from-blue-200 to-blue-300" : "bg-gradient-to-br from-blue-100 to-blue-200",
      peach: isActive ? "bg-gradient-to-br from-orange-200 to-orange-300" : "bg-gradient-to-br from-orange-100 to-orange-200"
    };
    return colors[color] || colors.lavender;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <FaviconUpdater />
      <TitleUpdater />
      <style>
        {`
          .clay-shadow {
            box-shadow: 
              8px 8px 16px rgba(163, 177, 198, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7),
              inset 2px 2px 4px rgba(255, 255, 255, 0.2),
              inset -2px -2px 4px rgba(163, 177, 198, 0.1);
          }
          
          .clay-inset {
            box-shadow: 
              inset 6px 6px 12px rgba(163, 177, 198, 0.2),
              inset -6px -6px 12px rgba(255, 255, 255, 0.8);
          }
          
          .clay-button {
            box-shadow: 
              4px 4px 8px rgba(163, 177, 198, 0.2),
              -4px -4px 8px rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .clay-button:hover {
            box-shadow: 
              2px 2px 4px rgba(163, 177, 198, 0.25),
              -2px -2px 4px rgba(255, 255, 255, 0.9);
            transform: translate(1px, 1px);
          }
          
          .clay-button:active {
            box-shadow: 
              inset 2px 2px 4px rgba(163, 177, 198, 0.3),
              inset -2px -2px 4px rgba(255, 255, 255, 0.7);
            transform: translate(2px, 2px);
          }
        `}
      </style>
      
      <SidebarProvider>
        <div className="flex w-full">
          <Sidebar className="border-none clay-shadow bg-gradient-to-b from-white/80 to-slate-50/80 backdrop-blur-sm">
            <SidebarHeader className="p-6 flex flex-col gap-2 border-none">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-50 h-20  rounded-s clay-shadow flex items-center justify-center p-2">
                  <img
                    src={getLogoUrl()}
                    alt="Company Logo"
                    className="w-full h-full object-contain" />

                </div>
                <div>
                  <h2 className="text-slate-800 text-xl font-bold uppercase">QUOTE BUILDER</h2>
                  <p className="text-sm text-slate-500 font-medium">{companySettings.company_name || "GROW UNITED ITALY"}</p>
                </div>
              </div>
              
              {/* User Info and Logout */}
              {user && (
                <div className="mt-4 p-3 bg-white/60 rounded-lg clay-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </SidebarHeader>
            
            <SidebarContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden px-4">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-3">
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    {navigationItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <Link
                              to={item.url} className="bg-gradient-to-r text-left px-2 py-4 text-sm font-medium uppercase peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 clay-button hover:clay-button:hover active:clay-button:active gap-3 rounded-2xl transition-all duration-300 h-10 from-white/60 to-slate-50/60">









                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${getIconBg(item.color, isActive)}`}>
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-slate-600'}`} />
                              </div>
                              <span className="text-slate-700 font-medium">
                                {item.title}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>);

                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            <header className="bg-white/70 backdrop-blur-md clay-shadow px-6 py-4 md:hidden">
              <div className="flex items-center gap-4">
                <div className="clay-button bg-white/80 p-2 rounded-2xl">
                  <SidebarTrigger className="text-slate-700" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Quotation App</h1>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>);

}
