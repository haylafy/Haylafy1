import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Send, Loader2, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AutomatedReminders() {
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(true);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendPaymentReminders', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.reminders_sent} payment reminders sent`);
    },
    onError: (error) => {
      toast.error('Failed to send reminders');
      console.error(error);
    }
  });

  // Calculate overdue stats
  const today = new Date().toISOString().split('T')[0];
  const overdueInvoices = invoices.filter(inv => 
    inv.due_date && 
    inv.due_date < today && 
    (inv.status === 'pending' || inv.status === 'submitted')
  );

  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              Payment Reminders
            </h3>
            <p className="text-sm text-slate-500">Automated reminders for overdue invoices</p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="auto-reminders" className="text-sm">Auto-Send</Label>
            <Switch
              id="auto-reminders"
              checked={autoRemindersEnabled}
              onCheckedChange={setAutoRemindersEnabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-slate-600">Overdue Invoices</p>
            <p className="text-2xl font-bold text-red-600">{overdueInvoices.length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-slate-600">Total Overdue</p>
            <p className="text-2xl font-bold text-red-600">${totalOverdue.toFixed(2)}</p>
          </div>
        </div>

        <Button
          onClick={() => sendRemindersMutation.mutate()}
          disabled={sendRemindersMutation.isPending || overdueInvoices.length === 0}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {sendRemindersMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Reminders...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Reminders Now ({overdueInvoices.length})
            </>
          )}
        </Button>

        {autoRemindersEnabled && (
          <p className="text-xs text-slate-500 mt-3 text-center">
            Automatic reminders will be sent weekly for overdue invoices
          </p>
        )}
      </Card>

      {overdueInvoices.length > 0 && (
        <Card className="p-5">
          <h4 className="font-medium text-slate-900 mb-3">Recent Overdue Invoices</h4>
          <div className="space-y-2">
            {overdueInvoices.slice(0, 5).map(invoice => {
              const daysPastDue = Math.floor(
                (new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)
              );
              
              return (
                <div key={invoice.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      #{invoice.invoice_number}
                    </p>
                    <p className="text-xs text-slate-600">{invoice.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">
                      ${invoice.total_amount?.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                      {daysPastDue} days overdue
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}