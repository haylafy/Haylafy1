import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow } from 'date-fns';
import { Bell, Calendar, MessageSquare, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const notificationIcons = {
  shift_reminder: Calendar,
  new_message: MessageSquare,
  schedule_change: AlertCircle,
  general: Bell,
  urgent: AlertCircle,
};

const priorityColors = {
  low: 'border-blue-200 bg-blue-50',
  medium: 'border-amber-200 bg-amber-50',
  high: 'border-orange-200 bg-orange-50',
  urgent: 'border-red-200 bg-red-50',
};

export default function ClientNotifications({ clientEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['client-notifications', clientEmail],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    enabled: !!clientEmail,
    select: (data) => data.filter(notif => notif.user_email === clientEmail),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notifId) => 
      base44.entities.Notification.update(notifId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notifId) => base44.entities.Notification.delete(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const recentNotifications = notifications.slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500">{unreadCount} new</Badge>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {recentNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Notifications</h3>
          <p className="text-slate-500">You're all caught up! New notifications will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentNotifications.map(notif => {
            const Icon = notificationIcons[notif.type] || Bell;
            const priorityColor = priorityColors[notif.priority] || priorityColors.medium;
            
            return (
              <Card 
                key={notif.id} 
                className={cn(
                  "p-4 transition-all",
                  !notif.is_read ? priorityColor : "bg-white border-slate-200",
                  !notif.is_read && "shadow-md"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    notif.priority === 'urgent' ? 'bg-red-500' :
                    notif.priority === 'high' ? 'bg-orange-500' :
                    notif.priority === 'medium' ? 'bg-amber-500' :
                    'bg-blue-500'
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{notif.title}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotificationMutation.mutate(notif.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{notif.message}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(notif.created_date), 'MMM d, h:mm a')}</span>
                        {notif.priority === 'urgent' && (
                          <Badge className="bg-red-500 text-xs">Urgent</Badge>
                        )}
                      </div>

                      {!notif.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsReadMutation.mutate(notif.id)}
                          className="text-xs h-7"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}