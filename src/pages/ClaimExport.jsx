import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Filter,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from 'date-fns';
import ClaimValidator from '@/components/billing/ClaimValidator';
import RemittanceReport from '@/components/billing/RemittanceReport';

export default function ClaimExport() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState('CSV');
  const [selectedPayer, setSelectedPayer] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [generating, setGenerating] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 100),
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-start_time', 200),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['claim-batches'],
    queryFn: () => base44.entities.ClaimBatch.list('-created_date'),
  });

  const isLoading = loadingPayments || loadingShifts || loadingClients || loadingBatches;

  // Filter completed and paid claims with EVV verification
  const billableClaims = payments.filter(p => {
    const isPayable = p.status === 'paid' || p.status === 'pending';
    const shift = shifts.find(s => p.shift_ids?.includes(s.id));
    const isEVVVerified = shift?.evv_status === 'verified';
    return isPayable && (isEVVVerified || !shift); // Allow if no shift or if verified
  });

  // Get unique payers (using client names as proxy)
  const payers = [...new Set(clients.map(c => c.name))];

  // Generate export
  const handleGenerateExport = async () => {
    setGenerating(true);
    try {
      // Filter claims based on date range
      let filteredClaims = billableClaims;
      
      if (dateRange.start) {
        filteredClaims = filteredClaims.filter(c => 
          new Date(c.due_date) >= new Date(dateRange.start)
        );
      }
      if (dateRange.end) {
        filteredClaims = filteredClaims.filter(c => 
          new Date(c.due_date) <= new Date(dateRange.end)
        );
      }

      // Generate batch number
      const batchNumber = `BATCH-${Date.now()}`;
      const totalAmount = filteredClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

      // Create export data (billing info only - no clinical notes)
      const exportData = filteredClaims.map(claim => {
        const shift = shifts.find(s => claim.shift_ids?.includes(s.id));
        const client = clients.find(c => c.id === claim.client_id);
        
        return {
          invoice_number: claim.invoice_number,
          patient_name: claim.client_name,
          patient_id: claim.client_id,
          service_date: claim.due_date,
          provider_name: claim.provider_name || shift?.caregiver_name || 'N/A',
          provider_id: claim.provider_id || shift?.caregiver_id || 'N/A',
          billing_code: claim.billing_code || 'G0156', // Home health aide services
          modifier: claim.modifiers?.[0] || 'UN',
          units: claim.units || (shift ? calculateUnits(shift) : 1),
          rate: claim.amount,
          total_amount: claim.amount,
          check_in: shift?.check_in_time || null,
          check_out: shift?.check_out_time || null,
          payer: selectedPayer || 'Primary Insurance',
          claim_status: claim.status
        };
      });

      // Generate file content
      let fileContent = '';
      let fileName = '';

      if (exportType === 'CSV') {
        // CSV format
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).join(',')).join('\n');
        fileContent = `${headers}\n${rows}`;
        fileName = `${batchNumber}_claim_export.csv`;
      } else if (exportType === '837P') {
        // 837P EDI format (simplified placeholder)
        fileContent = generate837P(exportData, batchNumber);
        fileName = `${batchNumber}_837P.txt`;
      } else if (exportType === '837I') {
        // 837I EDI format (simplified placeholder)
        fileContent = generate837I(exportData, batchNumber);
        fileName = `${batchNumber}_837I.txt`;
      }

      // Create downloadable file
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      // Save batch record
      await base44.entities.ClaimBatch.create({
        batch_number: batchNumber,
        export_type: exportType,
        status: 'submitted',
        submission_date: format(new Date(), 'yyyy-MM-dd'),
        payer_name: selectedPayer || 'Primary Insurance',
        total_claims: filteredClaims.length,
        total_amount: totalAmount,
        claim_ids: filteredClaims.map(c => c.id),
        export_file_url: url
      });

      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
      toast.success(`Export generated: ${fileName}`);
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate export');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const calculateUnits = (shift) => {
    if (!shift.check_in_time || !shift.check_out_time) return 1;
    const start = new Date(shift.check_in_time);
    const end = new Date(shift.check_out_time);
    const hours = (end - start) / (1000 * 60 * 60);
    return Math.round(hours * 4) / 4; // Round to nearest 15 min
  };

  const generate837P = (data, batchNumber) => {
    // Simplified 837P format (placeholder)
    return `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${format(new Date(), 'yyMMdd')}*${format(new Date(), 'HHmm')}*^*00501*${batchNumber}*0*P*:~
GS*HC*SENDER*RECEIVER*${format(new Date(), 'yyyyMMdd')}*${format(new Date(), 'HHmm')}*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*${batchNumber}*${format(new Date(), 'yyyyMMdd')}*${format(new Date(), 'HHmm')}*CH~
${data.map((claim, idx) => `CLM*${claim.invoice_number}*${claim.total_amount}***11:B:1*Y*A*Y*Y~`).join('\n')}
SE*${data.length + 4}*0001~
GE*1*1~
IEA*1*${batchNumber}~`;
  };

  const generate837I = (data, batchNumber) => {
    // Simplified 837I format (placeholder)
    return generate837P(data, batchNumber).replace('005010X222A1', '005010X223A2');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Claim Export & Remittance</h1>
          <p className="text-slate-500 mt-1">Generate payer-ready claim exports and track payments</p>
        </div>
        <Button 
          onClick={() => setExportDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Generate Claim Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Billable Claims</p>
              <p className="text-2xl font-bold text-slate-900">{billableClaims.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Valid Claims</p>
              <p className="text-2xl font-bold text-slate-900">
                {billableClaims.filter(c => c.invoice_number && c.amount).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="text-2xl font-bold text-slate-900">
                ${billableClaims.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="validation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="validation">Claim Validation</TabsTrigger>
          <TabsTrigger value="remittance">Remittance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="validation">
          <ClaimValidator claims={billableClaims} shifts={shifts} clients={clients} />
        </TabsContent>

        <TabsContent value="remittance">
          <RemittanceReport batches={batches} />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Claim Export</DialogTitle>
            <DialogDescription>
              Select export format and filters. Only billing data will be exported (no clinical notes).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Export Format</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV/Excel</SelectItem>
                  <SelectItem value="837P">837P EDI (Professional)</SelectItem>
                  <SelectItem value="837I">837I EDI (Institutional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payer (Optional)</Label>
              <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                <SelectTrigger>
                  <SelectValue placeholder="All payers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All payers</SelectItem>
                  {payers.slice(0, 10).map(payer => (
                    <SelectItem key={payer} value={payer}>{payer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>Export includes billing data only. All clinical notes, assessments, and care plans remain secure and are not included.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateExport}
              disabled={generating}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {generating ? 'Generating...' : `Download ${exportType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}