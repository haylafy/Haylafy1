
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Calendar, 
  CreditCard, 
  FileText, 
  MessageSquare,
  BarChart3,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  HeartPulse,
  GraduationCap,
  Settings,
  Clock,
  UserPlus,
  FileCheck,
  Building2,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/layout/NotificationCenter";
import NotificationAutomation from "@/components/notifications/NotificationAutomation";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AgencySwitcher from "@/components/admin/AgencySwitcher";
import { canAccessPage } from "./components/utils/permissions";
import PlatformTour from "@/components/onboarding/PlatformTour";
import ErrorBoundary from "@/components/common/ErrorBoundary";

function OperationsMenu({ navigation, currentPageName, onItemClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasActive = navigation.some(item => currentPageName === item.href);
  
  return (
    <div className="lg:contents">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="lg:hidden">
        <CollapsibleTrigger asChild>
          <button className={cn(
            "flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
            hasActive 
              ? "bg-teal-50 text-teal-700" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}>
            <span className="flex items-center gap-3">
              <Clock className={cn("w-5 h-5", hasActive && "text-teal-600")} />
              Operations
            </span>
            <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {navigation.map((item) => {
            const isActive = currentPageName === item.href;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.href)}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 ml-4 rounded-lg text-sm transition-all duration-200",
                  isActive 
                    ? "bg-teal-50 text-teal-700" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive && "text-teal-600")} />
                {item.name}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
      
      {/* Desktop view - show all items normally */}
      <div className="hidden lg:contents">
        {navigation.map((item) => {
          const isActive = currentPageName === item.href;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.href)}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-teal-50 text-teal-700 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-teal-600")} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const navigation = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { name: 'EVV Home', href: 'CaregiverDashboard', icon: Clock, caregiverOnly: true },
  { name: 'Info Center', href: 'InfoCenter', icon: FileText },
  { name: 'Patient Onboarding', href: 'PatientOnboarding', icon: UserPlus, adminOnly: true },
  { name: 'Caregiver Onboarding', href: 'CaregiverOnboarding', icon: GraduationCap, adminOnly: true },
  { name: 'Services', href: 'Services', icon: Users },
  { name: 'Human Resources', href: 'Caregivers', icon: UserCog, adminOnly: true },
  { name: 'Scheduling', href: 'Scheduling', icon: Calendar },
  { name: 'Family Portal', href: 'Clients', icon: Users },
  { name: 'Visit Tracking', href: 'VisitTracking', icon: FileCheck },
  { name: 'Clinical Documentation', href: 'ClinicalDocumentation', icon: FileText },
  { name: 'EVV', href: 'EVV', icon: Clock },
  { name: 'Billing Automation', href: 'BillingAutomation', icon: DollarSign, adminOnly: true },
  { name: 'Claims', href: 'Claims', icon: CreditCard, adminOnly: true },
  { name: 'Claim Export', href: 'ClaimExport', icon: FileText, adminOnly: true },
  { name: 'Reports', href: 'Reports', icon: BarChart3, adminOnly: true },
];

const adminNavigation = [
  { name: 'Business Management', href: 'BusinessManagement', icon: Building2 },
  { name: 'User Management', href: 'UserManagement', icon: Users }
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      // Show tour if user hasn't completed it and is not a caregiver
      if (userData && !userData.tour_completed && userData.user_role !== 'caregiver') {
        setShowTour(true);
      }
    }).catch(() => {});
  }, []);

  const completeTourMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ tour_completed: true }),
    onSuccess: () => {
      setShowTour(false);
      setUser(prev => ({ ...prev, tour_completed: true }));
    }
  });

  const handleTourComplete = () => {
    completeTourMutation.mutate();
  };

  const handleTourSkip = () => {
    completeTourMutation.mutate();
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Don't show layout for Welcome page
  if (currentPageName === 'Welcome') {
    return children;
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-50">
      {/* Platform Tour */}
      {showTour && (
        <PlatformTour 
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}

      {/* Automated notification checks */}
      <NotificationAutomation />
      
      <style>{`
        :root {
          --primary: 168 84% 32%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Haylafy</h1>
              <p className="text-xs text-slate-500">Home Care Software</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.slice(0, 7).filter(item => {
              if (item.adminOnly && user?.user_role === 'caregiver') return false;
              if (item.caregiverOnly && user?.user_role !== 'caregiver') return false;
              if (!canAccessPage(user, item.href)) return false;
              return true;
            }).map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-teal-50 text-teal-700 shadow-sm" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-teal-600")} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Operations collapsible on mobile */}
            <OperationsMenu 
              navigation={navigation.slice(7, 10)} 
              currentPageName={currentPageName}
              onItemClick={() => setSidebarOpen(false)}
            />
            
            {navigation.slice(10).filter(item => {
              if (item.adminOnly && user?.user_role === 'caregiver') return false;
              if (item.caregiverOnly && user?.user_role !== 'caregiver') return false;
              if (!canAccessPage(user, item.href)) return false;
              return true;
            }).map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-teal-50 text-teal-700 shadow-sm" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-teal-600")} />
                  {item.name}
                </Link>
              );
            })}

            {user?.role === 'admin' && (
              <>
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">
                    System Admin
                  </p>
                  {adminNavigation.map((item) => {
                    const isActive = currentPageName === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.href)}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                          isActive 
                            ? "bg-purple-50 text-purple-700 shadow-sm" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive && "text-purple-600")} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
            
            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                to={createPageUrl('Onboarding')}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  currentPageName === 'Onboarding'
                    ? "bg-teal-50 text-teal-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <GraduationCap className={cn("w-5 h-5", currentPageName === 'Onboarding' && "text-teal-600")} />
                HR Onboarding
              </Link>
              <Link
                to={createPageUrl('Settings')}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  currentPageName === 'Settings'
                    ? "bg-teal-50 text-teal-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Settings className={cn("w-5 h-5", currentPageName === 'Settings' && "text-teal-600")} />
                Settings
              </Link>
            </div>
          </nav>

          {/* User section */}
          {user && (
            <div className="p-4 border-t border-slate-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-medium">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900">{user.full_name || 'User'}</p>
                      <p className="text-xs text-slate-500">{user.role || 'Admin'}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="text-slate-600">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 h-16 px-4 lg:px-8">
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="hidden xl:flex items-center gap-3 flex-shrink-0">
              <Link to={createPageUrl('Caregivers')}>
                <Button variant="outline" size="sm" className="text-sm">
                  <UserCog className="w-4 h-4 mr-2" />
                  Employees
                </Button>
              </Link>
              <Link to={createPageUrl('Clients')}>
                <Button variant="outline" size="sm" className="text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  Patients
                </Button>
              </Link>
              <Link to={createPageUrl('Referrals')}>
                <Button variant="outline" size="sm" className="text-sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Referrals
                </Button>
              </Link>
              <Link to={createPageUrl('Referrals') + '?filter=outstanding'}>
                <Button variant="outline" size="sm" className="text-sm">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Outstanding Referrals
                </Button>
              </Link>
            </div>

            <div className="flex-1 max-w-xl">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {user?.role === 'admin' && <AgencySwitcher />}
              <NotificationCenter user={user} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
