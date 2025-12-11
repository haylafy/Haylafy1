import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, MessageSquare, CreditCard, UserCircle, Heart, Upload, Bell } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UpcomingVisits from '@/components/clientportal/UpcomingVisits';
import CareNotes from '@/components/clientportal/CareNotes';
import SecureMessaging from '@/components/clientportal/SecureMessaging';
import BillingInfo from '@/components/clientportal/BillingInfo';
import ContactInfo from '@/components/clientportal/ContactInfo';
import DocumentUpload from '@/components/clientportal/DocumentUpload';
import ClientNotifications from '@/components/clientportal/ClientNotifications';
import ClientNotificationAutomation from '@/components/clientportal/ClientNotificationAutomation';

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);

  // Fetch unread notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['client-notif-count', user?.email],
    queryFn: () => base44.entities.Notification.list(),
    enabled: !!user?.email,
    select: (data) => data.filter(n => n.user_email === user.email && !n.is_read),
    refetchInterval: 30000
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Get client profile - assumes user.client_id is set or user is linked to a client
  const { data: clients = [] } = useQuery({
    queryKey: ['my-client-profile', user?.email],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user,
    select: (data) => {
      // Find client by user's email or client_id
      const client = data.find(c => 
        c.email === user.email || 
        c.id === user.client_id ||
        c.created_by === user.email
      );
      return client;
    }
  });

  useEffect(() => {
    if (clients) {
      setClientProfile(clients);
    }
  }, [clients]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Heart className="w-16 h-16 text-teal-500 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!clientProfile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Card className="p-12">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Welcome to Your Care Portal</h2>
          <p className="text-slate-600 mb-6">
            We're setting up your account. Please contact your care coordinator for access.
          </p>
          <p className="text-sm text-slate-500">Email: {user.email}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Background notification automation */}
      {clientProfile && (
        <ClientNotificationAutomation 
          clientId={clientProfile.id}
          clientEmail={user.email}
          clientName={clientProfile.name}
        />
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 border border-teal-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                Welcome, {clientProfile.name?.split(' ')[0] || 'Family'}!
              </h1>
              <p className="text-slate-600 mt-1">Your personalized care portal</p>
            </div>
          </div>
          {notifications.length > 0 && (
            <Badge className="bg-red-500 text-white px-3 py-2 text-base">
              <Bell className="w-4 h-4 mr-1" />
              {notifications.length} new
            </Badge>
          )}
        </div>
      </div>

      {/* Main Portal Content */}
      <Tabs defaultValue="visits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="visits" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Visits</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Care Notes</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 relative">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          <UpcomingVisits clientId={clientProfile.id} />
        </TabsContent>

        <TabsContent value="notes">
          <CareNotes clientId={clientProfile.id} />
        </TabsContent>

        <TabsContent value="messages">
          <SecureMessaging clientId={clientProfile.id} clientName={clientProfile.name} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentUpload clientId={clientProfile.id} clientName={clientProfile.name} />
        </TabsContent>

        <TabsContent value="notifications">
          <ClientNotifications clientEmail={user.email} />
        </TabsContent>

        <TabsContent value="billing">
          <BillingInfo clientId={clientProfile.id} clientName={clientProfile.name} />
        </TabsContent>

        <TabsContent value="profile">
          <ContactInfo client={clientProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}