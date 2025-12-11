import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { addDays, isBefore, differenceInDays, isToday, format } from 'date-fns';

export default function NotificationAutomation() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-start_time', 100),
  });

  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list(),
  });

  const { data: existingNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 50),
  });

  // Check if notification already sent today
  const notificationSentToday = (type, relatedId) => {
    return existingNotifications.some(n => 
      n.type === type && 
      n.related_shift_id === relatedId &&
      isToday(new Date(n.created_date))
    );
  };

  // Check expiring business licenses
  useEffect(() => {
    if (!businesses.length) return;

    const checkExpiringLicenses = async () => {
      const today = new Date();
      const thirtyDaysOut = addDays(today, 30);

      for (const business of businesses) {
        if (!business.license_expiration) continue;

        const expirationDate = new Date(business.license_expiration);
        const daysUntilExpiration = differenceInDays(expirationDate, today);

        // Alert at 30, 14, and 7 days before expiration
        if ([30, 14, 7].includes(daysUntilExpiration) && 
            !notificationSentToday('urgent', business.id)) {
          
          const admins = [business.owner_email];

          for (const adminEmail of admins) {
            // Create notification
            await base44.entities.Notification.create({
              user_email: adminEmail,
              type: 'urgent',
              title: 'Business License Expiring Soon',
              message: `License for ${business.business_name} expires in ${daysUntilExpiration} days (${format(expirationDate, 'MMM d, yyyy')})`,
              priority: daysUntilExpiration <= 7 ? 'urgent' : 'high',
              related_shift_id: business.id
            });

            // Send email
            try {
              await base44.integrations.Core.SendEmail({
                from_name: 'Haylafy Alerts',
                to: adminEmail,
                subject: `⚠️ Business License Expiring in ${daysUntilExpiration} Days`,
                body: `Hello,

This is an automated reminder that the business license for ${business.business_name} is expiring soon.

License Number: ${business.license_number || 'N/A'}
Expiration Date: ${format(expirationDate, 'MMMM d, yyyy')}
Days Remaining: ${daysUntilExpiration}

Please renew your license before it expires to avoid service interruptions.

Best regards,
Haylafy Team`
              });
            } catch (err) {
              console.error('Email send failed:', err);
            }
          }
        }
      }
    };

    checkExpiringLicenses();
  }, [businesses, existingNotifications]);

  // Check upcoming shifts for caregivers (24 hours before)
  useEffect(() => {
    if (!shifts.length || !user) return;

    const checkUpcomingShifts = async () => {
      const now = new Date();
      const tomorrow = addDays(now, 1);

      for (const shift of shifts) {
        if (shift.status !== 'scheduled') continue;

        const shiftStart = new Date(shift.start_time);
        const hoursUntilShift = (shiftStart - now) / (1000 * 60 * 60);

        // Send reminder 24 hours before shift
        if (hoursUntilShift > 23 && hoursUntilShift <= 25 && 
            shift.caregiver_id &&
            !notificationSentToday('shift_reminder', shift.id)) {
          
          // Create notification
          await base44.entities.Notification.create({
            user_email: shift.caregiver_name, // Assuming this is email
            type: 'shift_reminder',
            title: 'Upcoming Shift Tomorrow',
            message: `You have a shift with ${shift.client_name} tomorrow at ${format(shiftStart, 'h:mm a')}. Location: ${shift.client_address || 'See details'}`,
            related_shift_id: shift.id,
            priority: 'medium'
          });

          // Send email
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Haylafy Scheduling',
              to: shift.caregiver_name,
              subject: '📅 Shift Reminder: Tomorrow',
              body: `Hello,

This is a reminder about your upcoming shift:

Client: ${shift.client_name}
Date: ${format(shiftStart, 'EEEE, MMMM d, yyyy')}
Time: ${format(shiftStart, 'h:mm a')} - ${format(new Date(shift.end_time), 'h:mm a')}
Location: ${shift.client_address || 'Contact office for details'}

${shift.notes ? `Special Instructions: ${shift.notes}` : ''}

Please arrive on time and be prepared for your shift.

Best regards,
Haylafy Team`
            });
          } catch (err) {
            console.error('Email send failed:', err);
          }
        }
      }
    };

    checkUpcomingShifts();
  }, [shifts, user, existingNotifications]);

  // Check overdue onboarding tasks
  useEffect(() => {
    if (!onboardingTasks.length) return;

    const checkOverdueTasks = async () => {
      const today = new Date();

      for (const task of onboardingTasks) {
        if (task.status === 'completed' || !task.due_date) continue;

        const dueDate = new Date(task.due_date);
        
        // Task is overdue
        if (isBefore(dueDate, today) && !notificationSentToday('urgent', task.id)) {
          
          // Notify assigned person and admins
          const recipients = [task.assigned_to, task.caregiver_name].filter(Boolean);

          for (const email of recipients) {
            // Create notification
            await base44.entities.Notification.create({
              user_email: email,
              type: 'urgent',
              title: 'Overdue Onboarding Task',
              message: `Task "${task.task_name}" for ${task.caregiver_name} is overdue (Due: ${format(dueDate, 'MMM d, yyyy')})`,
              priority: 'high',
              related_shift_id: task.id
            });

            // Send email
            try {
              await base44.integrations.Core.SendEmail({
                from_name: 'Haylafy HR',
                to: email,
                subject: '⚠️ Overdue Onboarding Task',
                body: `Hello,

The following onboarding task is now overdue:

Caregiver: ${task.caregiver_name}
Task: ${task.task_name}
Type: ${task.task_type}
Due Date: ${format(dueDate, 'MMMM d, yyyy')}
Status: ${task.status}

${task.description ? `Description: ${task.description}` : ''}

Please complete this task as soon as possible to ensure compliance.

Best regards,
Haylafy Team`
              });
            } catch (err) {
              console.error('Email send failed:', err);
            }
          }
        }
      }
    };

    checkOverdueTasks();
  }, [onboardingTasks, existingNotifications]);

  // This component doesn't render anything
  return null;
}