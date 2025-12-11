import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { addHours, differenceInHours } from 'date-fns';

export default function ClientNotificationAutomation({ clientId, clientEmail, clientName }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['client-shifts-notifications', clientId],
    queryFn: () => base44.entities.Shift.list(),
    enabled: !!clientId,
    refetchInterval: 300000, // Check every 5 minutes
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['client-messages-notifications', clientId],
    queryFn: () => base44.entities.Message.list('-created_date'),
    enabled: !!clientId,
    refetchInterval: 60000, // Check every minute
  });

  const { data: existingNotifications = [] } = useQuery({
    queryKey: ['existing-notifications', clientEmail],
    queryFn: () => base44.entities.Notification.list(),
    enabled: !!clientEmail,
  });

  useEffect(() => {
    if (!clientId || !clientEmail) return;

    const checkUpcomingVisits = async () => {
      const now = new Date();
      const upcomingShifts = shifts.filter(s => {
        const shiftStart = new Date(s.start_time);
        const hoursUntil = differenceInHours(shiftStart, now);
        return hoursUntil > 0 && hoursUntil <= 24 && s.status === 'scheduled';
      });

      for (const shift of upcomingShifts) {
        const notificationKey = `visit_reminder_${shift.id}`;
        const alreadyNotified = existingNotifications.some(
          n => n.message.includes(notificationKey)
        );

        if (!alreadyNotified) {
          try {
            const shiftDate = new Date(shift.start_time);
            await base44.entities.Notification.create({
              user_email: clientEmail,
              type: 'shift_reminder',
              title: 'Upcoming Visit Reminder',
              message: `Your caregiver ${shift.caregiver_name} will arrive on ${shiftDate.toLocaleDateString()} at ${shiftDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. ${notificationKey}`,
              related_shift_id: shift.id,
              priority: 'medium',
              is_read: false
            });
          } catch (error) {
            console.error('Failed to create visit notification:', error);
          }
        }
      }
    };

    const checkNewMessages = async () => {
      const recentMessages = messages.filter(msg => {
        const messageTime = new Date(msg.created_date);
        const minutesAgo = differenceInHours(new Date(), messageTime) * 60;
        return minutesAgo <= 5 && msg.recipient_id === clientId && msg.status === 'unread';
      });

      for (const msg of recentMessages) {
        const notificationKey = `message_${msg.id}`;
        const alreadyNotified = existingNotifications.some(
          n => n.message.includes(notificationKey)
        );

        if (!alreadyNotified) {
          try {
            await base44.entities.Notification.create({
              user_email: clientEmail,
              type: 'new_message',
              title: 'New Message from Care Team',
              message: `You have a new message: "${msg.subject}". ${notificationKey}`,
              priority: 'medium',
              is_read: false
            });
          } catch (error) {
            console.error('Failed to create message notification:', error);
          }
        }
      }
    };

    checkUpcomingVisits();
    checkNewMessages();
  }, [shifts, messages, clientId, clientEmail, existingNotifications]);

  return null; // This is a background component
}