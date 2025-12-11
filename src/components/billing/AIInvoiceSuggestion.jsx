import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sparkles, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function AIInvoiceSuggestion({ onApplySuggestions }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const { data: visits = [] } = useQuery({
    queryKey: ['visits-unbilled'],
    queryFn: async () => {
      const allVisits = await base44.entities.Visit.list('-visit_date');
      const invoices = await base44.entities.Invoice.list();
      const invoicedVisitIds = invoices.flatMap(inv => inv.visit_ids || []);
      return allVisits.filter(v => 
        v.signature_status === 'fully_signed' && 
        !invoicedVisitIds.includes(v.id)
      );
    }
  });

  const { data: billingRates = [] } = useQuery({
    queryKey: ['billing-rates'],
    queryFn: () => base44.entities.BillingRate.list(),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const visitData = visits.slice(0, 20).map(v => ({
        id: v.id,
        client_name: v.client_name,
        visit_date: v.visit_date,
        duration_minutes: v.duration_minutes,
        services_provided: v.services_provided,
        caregiver_name: v.caregiver_name
      }));

      const ratesInfo = billingRates.map(r => ({
        service_type: r.service_type,
        billing_code: r.billing_code,
        rate_per_unit: r.rate_per_unit,
        unit_type: r.unit_type
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these home care visits and suggest invoice line items based on available billing rates.

VISITS DATA:
${JSON.stringify(visitData, null, 2)}

AVAILABLE BILLING RATES:
${JSON.stringify(ratesInfo, null, 2)}

For each visit, suggest:
1. Appropriate billing codes and service types based on services provided
2. Calculate units based on duration and unit_type (hourly, 15min, per_visit, etc.)
3. Flag any potential billing errors (missing info, duration mismatches, unusual patterns)
4. Group visits by client for efficient invoicing

Respond with actionable suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_invoices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  client_name: { type: "string" },
                  visit_ids: { type: "array", items: { type: "string" } },
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        service_type: { type: "string" },
                        billing_code: { type: "string" },
                        units: { type: "number" },
                        rate: { type: "number" },
                        amount: { type: "number" }
                      }
                    }
                  },
                  total_amount: { type: "number" },
                  confidence: { type: "string" }
                }
              }
            },
            billing_errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  visit_id: { type: "string" },
                  error_type: { type: "string" },
                  description: { type: "string" },
                  suggested_fix: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      setSelectedItems(data.suggested_invoices?.map((_, i) => i) || []);
      setDialogOpen(true);
      toast.success('AI analysis complete!');
    },
    onError: (error) => {
      toast.error('Failed to analyze visits');
      console.error(error);
    }
  });

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const applySelected = async () => {
    const selected = suggestions.suggested_invoices.filter((_, i) => selectedItems.includes(i));
    
    // Create invoices from suggestions
    try {
      for (const suggestion of selected) {
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        await base44.entities.Invoice.create({
          business_id: visits[0]?.business_id,
          business_name: visits[0]?.business_name,
          invoice_number: invoiceNumber,
          visit_ids: suggestion.visit_ids,
          client_id: visits.find(v => suggestion.visit_ids?.includes(v.id))?.client_id,
          client_name: suggestion.client_name,
          payer_name: 'Insurance',
          line_items: suggestion.line_items,
          subtotal: suggestion.total_amount,
          total_amount: suggestion.total_amount,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        });
      }
      
      onApplySuggestions(selected);
      setDialogOpen(false);
      toast.success(`${selected.length} invoice(s) created from AI suggestions`);
    } catch (error) {
      toast.error('Failed to create invoices');
      console.error(error);
    }
  };

  return (
    <>
      <Button
        onClick={() => analyzeMutation.mutate()}
        disabled={analyzeMutation.isPending || visits.length === 0}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        {analyzeMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Invoice Assistant
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Invoice Suggestions
            </DialogTitle>
          </DialogHeader>

          {suggestions && (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <p className="text-sm text-slate-700">{suggestions.summary}</p>
              </Card>

              {/* Billing Errors */}
              {suggestions.billing_errors?.length > 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-3">
                        Detected Issues ({suggestions.billing_errors.length})
                      </h3>
                      <div className="space-y-2">
                        {suggestions.billing_errors.map((error, idx) => (
                          <div key={idx} className="p-3 bg-white rounded border border-amber-200">
                            <div className="flex items-start justify-between mb-1">
                              <Badge className="bg-amber-600">{error.error_type}</Badge>
                            </div>
                            <p className="text-sm text-amber-900 mb-1">{error.description}</p>
                            <p className="text-xs text-amber-700">
                              <strong>Fix:</strong> {error.suggested_fix}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Suggested Invoices */}
              {suggestions.suggested_invoices?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">
                      Suggested Invoices ({suggestions.suggested_invoices.length})
                    </h3>
                    <Button 
                      onClick={applySelected}
                      disabled={selectedItems.length === 0}
                      className="bg-teal-600 hover:bg-teal-700"
                      size="sm"
                    >
                      Apply Selected ({selectedItems.length})
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {suggestions.suggested_invoices.map((invoice, idx) => (
                      <Card key={idx} className="p-4 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedItems.includes(idx)}
                            onCheckedChange={() => toggleItem(idx)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-slate-900">{invoice.client_name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {invoice.confidence} confidence
                                </Badge>
                                <Badge className="bg-teal-600">
                                  ${invoice.total_amount?.toFixed(2)}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {invoice.line_items?.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                                  <span className="text-slate-700">
                                    {item.service_type} ({item.billing_code}) - {item.units} units
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    ${item.amount?.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <p className="text-xs text-slate-500 mt-2">
                              Based on {invoice.visit_ids?.length} visit(s)
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}