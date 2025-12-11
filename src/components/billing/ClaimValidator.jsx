import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ClaimValidator({ claims, shifts, clients }) {
  const validateClaim = (claim) => {
    const errors = [];
    const warnings = [];
    
    // Find associated shift
    const shift = shifts.find(s => claim.shift_ids?.includes(s.id));
    const client = clients.find(c => c.id === claim.client_id);
    
    // Required fields validation
    if (!claim.client_id) errors.push('Missing patient ID');
    if (!claim.invoice_number) errors.push('Missing invoice number');
    if (!claim.due_date) warnings.push('Missing service date');
    if (!claim.amount || claim.amount <= 0) errors.push('Invalid amount');
    
    // Payer information (using client data as proxy)
    if (!client?.email) warnings.push('Missing member ID/contact');
    
    // Provider information - check claim first, then shift
    if (!claim.provider_id && !shift?.caregiver_id) {
      errors.push('Missing provider identifier');
    }
    if (!claim.provider_name && !shift?.caregiver_name) {
      warnings.push('Missing provider name');
    }
    
    // EVV timestamps
    if (shift && (!shift.check_in_time || !shift.check_out_time)) {
      warnings.push('Missing EVV timestamps');
    }
    
    // EVV verification status
    if (shift && shift.evv_status !== 'verified') {
      errors.push('Visit not EVV verified');
    }
    
    // Service codes - check both billing_code and description
    if (!claim.billing_code && !claim.description) {
      warnings.push('Missing procedure code/description');
    }
    
    return { errors, warnings, isValid: errors.length === 0 };
  };

  const validatedClaims = claims.map(claim => ({
    ...claim,
    validation: validateClaim(claim)
  }));

  const totalClaims = validatedClaims.length;
  const validClaims = validatedClaims.filter(c => c.validation.isValid).length;
  const invalidClaims = totalClaims - validClaims;

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{validClaims}</p>
              <p className="text-sm text-slate-600">Valid Claims</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{invalidClaims}</p>
              <p className="text-sm text-slate-600">Invalid Claims</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {validatedClaims.reduce((sum, c) => sum + c.validation.warnings.length, 0)}
              </p>
              <p className="text-sm text-slate-600">Warnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Details */}
      <div className="space-y-2">
        {validatedClaims.filter(c => !c.validation.isValid || c.validation.warnings.length > 0).map((claim) => (
          <div key={claim.id} className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-slate-900">{claim.client_name}</p>
                <p className="text-sm text-slate-500">Invoice: {claim.invoice_number}</p>
              </div>
              <Badge className={cn(
                claim.validation.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {claim.validation.isValid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
            
            {claim.validation.errors.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {claim.validation.errors.map((error, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <XCircle className="w-3 h-3" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {claim.validation.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-600 mb-1">Warnings:</p>
                <ul className="text-sm text-amber-600 space-y-1">
                  {claim.validation.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}