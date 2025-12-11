import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

export default function OverdueAlerts() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    refetchInterval: 300000, // Check every 5 minutes
  });

  const createAlertMutation = useMutation({
    mutationFn: async ({ invoice, daysOverdue }) => {
      // Create notification for admin/billing staff
      await base44.entities.Notification.create({
        user_email: currentUser?.email,
        type: 'urgent',
        title: 'Overdue Invoice Alert',
        message: `Invoice #${invoice.invoice_number} for ${invoice.client_name} is ${daysOverdue} days overdue. Amount: $${(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}`,
        priority: daysOverdue > 30 ? 'urgent' : 'high'
      });
    },
  });

  useEffect(() => {
    if (!currentUser?.business_id || invoices.length === 0) return;

    const businessInvoices = invoices.filter(inv => 
      inv.business_id === currentUser.business_id &&
      inv.status !== 'paid' &&
      inv.due_date
    );

    const today = new Date();
    const criticallyOverdue = [];
    const newlyOverdue = [];

    businessInvoices.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = differenceInDays(today, dueDate);

      if (daysOverdue === 30 || daysOverdue === 60 || daysOverdue === 90) {
        criticallyOverdue.push({ invoice, daysOverdue });
      } else if (daysOverdue === 1) {
        newlyOverdue.push({ invoice, daysOverdue });
      }
    });

    // Send critical alerts
    criticallyOverdue.forEach(({ invoice, daysOverdue }) => {
      createAlertMutation.mutate({ invoice, daysOverdue });
    });

    // Show toast for newly overdue
    if (newlyOverdue.length > 0) {
      toast.error(
        `${newlyOverdue.length} invoice${newlyOverdue.length > 1 ? 's are' : ' is'} now overdue`,
        {
          icon: <AlertTriangle className="w-5 h-5" />,
          duration: 10000,
        }
      );
    }
  }, [invoices, currentUser]);

  return null; // This is a background monitoring component
}