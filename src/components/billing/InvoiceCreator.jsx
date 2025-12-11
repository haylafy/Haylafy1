import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Save, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function InvoiceCreator({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    client_id: '',
    payer_name: '',
    payer_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState([{
    service_type: '',
    billing_code: '',
    units: 1,
    rate: 0,
    amount: 0
  }]);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
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

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      return await base44.entities.Invoice.create(invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create invoice');
      console.error(error);
    }
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      payer_name: '',
      payer_id: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      notes: ''
    });
    setLineItems([{
      service_type: '',
      billing_code: '',
      units: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      payer_name: client?.insurance_primary_name || 'Self-Pay',
      payer_id: client?.insurance_primary_id || ''
    }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      service_type: '',
      billing_code: '',
      units: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    // Auto-calculate amount
    if (field === 'units' || field === 'rate') {
      updated[index].amount = parseFloat((updated[index].units * updated[index].rate).toFixed(2));
    }
    
    // Auto-fill from billing rates
    if (field === 'service_type' && value) {
      const rate = billingRates.find(r => 
        r.service_type === value && 
        r.business_id === currentUser?.business_id &&
        (!r.client_id || r.client_id === formData.client_id) &&
        r.active
      );
      
      if (rate) {
        updated[index].billing_code = rate.billing_code;
        updated[index].rate = rate.rate_per_unit;
        updated[index].amount = parseFloat((updated[index].units * rate.rate_per_unit).toFixed(2));
      }
    }
    
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.error('Please select a client');
      return;
    }
    
    if (lineItems.some(item => !item.service_type || item.rate === 0)) {
      toast.error('Please complete all line items');
      return;
    }

    const client = clients.find(c => c.id === formData.client_id);
    const business = businesses.find(b => b.id === currentUser?.business_id);
    const subtotal = calculateTotal();
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    createInvoiceMutation.mutate({
      business_id: currentUser?.business_id,
      business_name: business?.business_name,
      invoice_number: invoiceNumber,
      client_id: formData.client_id,
      client_name: client?.name,
      payer_name: formData.payer_name,
      payer_id: formData.payer_id,
      line_items: lineItems.map(item => ({
        service_type: item.service_type,
        billing_code: item.billing_code,
        units: parseFloat(item.units),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount)
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      total_amount: parseFloat(subtotal.toFixed(2)),
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      status: 'draft'
    });
  };

  const serviceTypes = [...new Set(billingRates.map(r => r.service_type))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Create New Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Client & Payer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payer Name</Label>
              <Input
                value={formData.payer_name}
                onChange={(e) => setFormData({...formData, payer_name: e.target.value})}
                placeholder="Insurance company or Self-Pay"
              />
            </div>

            <div>
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                required
              />
            </div>

            <div className="col-span-2">
              <Label>Payer ID (Insurance ID)</Label>
              <Input
                value={formData.payer_id}
                onChange={(e) => setFormData({...formData, payer_id: e.target.value})}
                placeholder="Insurance policy number"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Line Items *</Label>
              <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Item {index + 1}</span>
                    {lineItems.length > 1 && (
                      <Button 
                        type="button" 
                        onClick={() => removeLineItem(index)} 
                        size="sm" 
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Service Type *</Label>
                      <Select 
                        value={item.service_type}
                        onValueChange={(value) => updateLineItem(index, 'service_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes.map(service => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Billing Code</Label>
                      <Input
                        value={item.billing_code}
                        onChange={(e) => updateLineItem(index, 'billing_code', e.target.value)}
                        placeholder="Code"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Units *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.units}
                        onChange={(e) => updateLineItem(index, 'units', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Rate *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Amount: </span>
                      <span className="text-lg font-bold text-slate-900">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end p-4 bg-teal-50 rounded-lg">
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-teal-600">
                ${calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes or instructions..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createInvoiceMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}