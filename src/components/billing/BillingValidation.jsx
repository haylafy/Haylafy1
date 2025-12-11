import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BillingValidation() {
  const [validationResult, setValidationResult] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list(),
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const recentInvoices = invoices.slice(0, 50);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these healthcare invoices for potential billing errors and inconsistencies.

INVOICES:
${JSON.stringify(recentInvoices.map(inv => ({
  invoice_number: inv.invoice_number,
  client_name: inv.client_name,
  line_items: inv.line_items,
  total_amount: inv.total_amount,
  invoice_date: inv.invoice_date,
  status: inv.status
})), null, 2)}

Check for:
1. Missing or invalid billing codes
2. Unusual billing amounts or unit calculations
3. Duplicate charges for same service/date
4. Services billed without proper authorization
5. Inconsistent rates across similar services
6. Missing required documentation references

Categorize issues by severity: critical, warning, info`,
        response_json_schema: {
          type: "object",
          properties: {
            total_invoices_checked: { type: "number" },
            issues_found: { type: "number" },
            validation_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  invoice_number: { type: "string" },
                  severity: { type: "string" },
                  issue_type: { type: "string" },
                  description: { type: "string" },
                  recommended_action: { type: "string" }
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
      setValidationResult(data);
      toast.success('Validation complete');
    },
    onError: (error) => {
      toast.error('Validation failed');
      console.error(error);
    }
  });

  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
    warning: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    info: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Billing Validation</h3>
          <p className="text-sm text-slate-500">AI-powered error detection</p>
        </div>
        <Button
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending || invoices.length === 0}
          variant="outline"
          className="border-purple-500 text-purple-700 hover:bg-purple-50"
        >
          {validateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Run Validation
            </>
          )}
        </Button>
      </div>

      {validationResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Checked {validationResult.total_invoices_checked} invoices</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{validationResult.summary}</p>
              </div>
              <Badge className={cn(
                validationResult.issues_found === 0 
                  ? "bg-green-100 text-green-700" 
                  : "bg-red-100 text-red-700"
              )}>
                {validationResult.issues_found} issue(s) found
              </Badge>
            </div>
          </Card>

          {/* Issues */}
          {validationResult.validation_issues?.length > 0 && (
            <div className="space-y-2">
              {validationResult.validation_issues.map((issue, idx) => {
                const config = severityConfig[issue.severity] || severityConfig.info;
                const Icon = config.icon;
                
                return (
                  <Card key={idx} className={cn("p-4", config.color)}>
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Invoice #{issue.invoice_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {issue.issue_type}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{issue.description}</p>
                        <p className="text-xs font-medium">
                          ✓ {issue.recommended_action}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}