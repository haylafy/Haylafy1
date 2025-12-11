import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Initialize Stripe (you'll need to add your Stripe publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

function PaymentForm({ invoice, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(
    (invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      // In a real implementation, you would:
      // 1. Create a payment intent on the backend
      // 2. Confirm the payment with Stripe
      // 3. Update the invoice with payment details
      
      // For demo purposes, we'll simulate a successful payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message);
      } else {
        onSuccess(parseFloat(paymentAmount));
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">Invoice</span>
          <span className="font-medium">#{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">Total Amount</span>
          <span className="font-medium">${invoice.total_amount.toFixed(2)}</span>
        </div>
        {invoice.paid_amount > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">Already Paid</span>
            <span className="font-medium text-green-600">-${invoice.paid_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-semibold text-slate-900">Amount Due</span>
          <span className="text-lg font-bold text-slate-900">
            ${(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Amount</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <PaymentElement />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || processing}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ${paymentAmount}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentProcessor({ invoice, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentAmount) => {
      const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

      await base44.entities.Invoice.update(invoice.id, {
        paid_amount: newPaidAmount,
        paid_date: new Date().toISOString().split('T')[0],
        status: newStatus
      });

      // Create payment record
      await base44.entities.Payment.create({
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        amount: paymentAmount,
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: 'card',
        description: `Payment for invoice #${invoice.invoice_number}`,
        invoice_number: invoice.invoice_number
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentSuccess(true);
      toast.success('Payment processed successfully!');
      setTimeout(() => {
        onOpenChange(false);
        setPaymentSuccess(false);
      }, 2000);
    },
  });

  // Simulate creating a payment intent when dialog opens
  React.useEffect(() => {
    if (open && invoice && !clientSecret) {
      // In a real app, call your backend to create a Stripe PaymentIntent
      // For demo, we'll use a placeholder
      setClientSecret('placeholder_secret');
    }
  }, [open, invoice]);

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0d9488',
    },
  };

  const options = {
    clientSecret: clientSecret || undefined,
    appearance,
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            Process Payment
          </DialogTitle>
        </DialogHeader>

        {paymentSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Payment Successful!</h3>
            <p className="text-slate-600">The invoice has been updated</p>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              invoice={invoice}
              onSuccess={(amount) => recordPaymentMutation.mutate(amount)}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-slate-600">Initializing payment...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}