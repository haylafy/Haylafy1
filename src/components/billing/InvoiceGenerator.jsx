import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export default function InvoiceGenerator() {
  const [selectedVisits, setSelectedVisits] = useState([]);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const { data: billingRates = [] } = useQuery({
    queryKey: ['billing-rates'],
    queryFn: () => base44.entities.BillingRate.list(),
  });

  const { data: existingInvoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (visitIds) => {
      const selectedVisitRecords = visits.filter(v => visitIds.includes(v.id));
      const groupedByClient = {};

      selectedVisitRecords.forEach(visit => {
        if (!groupedByClient[visit.client_id]) {
          groupedByClient[visit.client_id] = [];
        }
        groupedByClient[visit.client_id].push(visit);
      });

      const invoices = [];
      for (const [clientId, clientVisits] of Object.entries(groupedByClient)) {
        const client = clients.find(c => c.id === clientId);
        const business = businesses.find(b => b.id === currentUser?.business_id);
        
        const lineItems = [];
        let subtotal = 0;

        clientVisits.forEach(visit => {
          visit.services_provided?.forEach(service => {
            const rate = billingRates.find(r => 
              r.service_type === service && 
              r.business_id === currentUser?.business_id &&
              (!r.client_id || r.client_id === clientId) &&
              r.active
            );

            if (rate) {
              let units = 1;
              if (rate.unit_type === 'hourly' && visit.duration_minutes) {
                units = visit.duration_minutes / 60;
              } else if (rate.unit_type === '15min' && visit.duration_minutes) {
                units = visit.duration_minutes / 15;
              }

              const amount = units * rate.rate_per_unit;
              subtotal += amount;

              lineItems.push({
                service_type: service,
                billing_code: rate.billing_code,
                units: parseFloat(units.toFixed(2)),
                rate: rate.rate_per_unit,
                amount: parseFloat(amount.toFixed(2))
              });
            }
          });
        });

        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const invoice = await base44.entities.Invoice.create({
          business_id: currentUser?.business_id,
          business_name: business?.business_name,
          invoice_number: invoiceNumber,
          visit_ids: clientVisits.map(v => v.id),
          client_id: clientId,
          client_name: client?.name,
          payer_name: client?.insurance_primary_name || 'Self-Pay',
          payer_id: client?.insurance_primary_id,
          line_items: lineItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total_amount: parseFloat(subtotal.toFixed(2)),
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        });

        invoices.push(invoice);
      }

      return invoices;
    },
    onSuccess: (invoices) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`${invoices.length} invoice(s) generated successfully`);
      setSelectedVisits([]);
    },
    onError: (error) => {
      toast.error('Failed to generate invoices');
      console.error(error);
    }
  });

  // Filter billable visits
  const businessVisits = visits.filter(v => v.business_id === currentUser?.business_id);
  const invoicedVisitIds = existingInvoices.flatMap(inv => inv.visit_ids || []);
  
  const billableVisits = businessVisits.filter(visit => 
    visit.signature_status === 'fully_signed' &&
    visit.status === 'submitted' &&
    !invoicedVisitIds.includes(visit.id) &&
    visit.services_provided?.length > 0
  );

  const toggleVisit = (visitId) => {
    setSelectedVisits(prev =>
      prev.includes(visitId)
        ? prev.filter(id => id !== visitId)
        : [...prev, visitId]
    );
  };

  const selectAll = () => {
    setSelectedVisits(billableVisits.map(v => v.id));
  };

  const deselectAll = () => {
    setSelectedVisits([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Generate Invoices</h2>
          <p className="text-sm text-slate-500">
            Select completed and signed visits to generate invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
          <Button
            onClick={() => generateInvoiceMutation.mutate(selectedVisits)}
            disabled={selectedVisits.length === 0 || generateInvoiceMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Generate {selectedVisits.length > 0 && `(${selectedVisits.length})`}
          </Button>
        </div>
      </div>

      {billableVisits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No billable visits</h3>
          <p className="text-slate-500">
            Visits must be fully signed and submitted to be invoiced
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {billableVisits.map((visit) => {
            const isSelected = selectedVisits.includes(visit.id);
            return (
              <div
                key={visit.id}
                className={cn(
                  "bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all",
                  isSelected ? "border-teal-500 bg-teal-50" : "border-slate-100"
                )}
                onClick={() => toggleVisit(visit.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{visit.client_name}</h3>
                        <p className="text-sm text-slate-600">by {visit.caregiver_name}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready to Bill
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm text-slate-600 mb-2">
                      <div>
                        Date: {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                      </div>
                      <div>
                        Duration: {visit.duration_minutes} mins
                      </div>
                      <div>
                        Services: {visit.services_provided?.length || 0}
                      </div>
                    </div>

                    {visit.services_provided?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {visit.services_provided.map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}