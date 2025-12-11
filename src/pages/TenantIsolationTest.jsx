import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantIsolationTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const addResult = (test, passed, message) => {
    setResults(prev => [...prev, { test, passed, message, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary(null);

    try {
      const user = await base44.auth.me();
      addResult('Auth Check', true, `Running as user: ${user.email}`);

      // Test 1: Verify current business_id is set
      if (!user.business_id) {
        addResult('Business ID Check', false, 'Current user has no business_id');
        throw new Error('Cannot run tests without business_id');
      }
      addResult('Business ID Check', true, `User business_id: ${user.business_id}`);

      // Test 2: Create test client for current tenant
      const testClient1 = await base44.entities.Client.create({
        business_id: user.business_id,
        name: `TEST_ISOLATION_CLIENT_${Date.now()}`,
        phone: '555-0001',
        status: 'active'
      });
      addResult('Create Test Client', true, `Created client: ${testClient1.id}`);

      // Test 3: Query clients - should only see current tenant's data
      const allClients = await base44.entities.Client.list();
      const wrongTenantClients = allClients.filter(c => c.business_id !== user.business_id);
      
      if (wrongTenantClients.length > 0) {
        addResult('Client Isolation', false, `SECURITY ISSUE: Found ${wrongTenantClients.length} clients from other tenants!`);
      } else {
        addResult('Client Isolation', true, `All ${allClients.length} clients belong to current tenant`);
      }

      // Test 4: Verify RLS on Caregivers
      const testCaregiver = await base44.entities.Caregiver.create({
        business_id: user.business_id,
        name: `TEST_ISOLATION_CAREGIVER_${Date.now()}`,
        phone: '555-0002',
        email: `test_${Date.now()}@test.com`,
        status: 'active'
      });
      addResult('Create Test Caregiver', true, `Created caregiver: ${testCaregiver.id}`);

      const allCaregivers = await base44.entities.Caregiver.list();
      const wrongTenantCaregivers = allCaregivers.filter(c => c.business_id !== user.business_id);
      
      if (wrongTenantCaregivers.length > 0) {
        addResult('Caregiver Isolation', false, `SECURITY ISSUE: Found ${wrongTenantCaregivers.length} caregivers from other tenants!`);
      } else {
        addResult('Caregiver Isolation', true, `All ${allCaregivers.length} caregivers belong to current tenant`);
      }

      // Test 5: Verify RLS on Shifts
      const shifts = await base44.entities.Shift.list();
      const wrongTenantShifts = shifts.filter(s => {
        // Check if shift's client or caregiver belongs to different tenant
        const clientMatch = allClients.find(c => c.id === s.client_id);
        const caregiverMatch = allCaregivers.find(cg => cg.id === s.caregiver_id);
        return !clientMatch || !caregiverMatch;
      });

      if (wrongTenantShifts.length > 0) {
        addResult('Shift Isolation', false, `SECURITY ISSUE: Found ${wrongTenantShifts.length} shifts with cross-tenant references!`);
      } else {
        addResult('Shift Isolation', true, `All ${shifts.length} shifts properly isolated`);
      }

      // Test 6: Verify RLS on Visits
      const visits = await base44.entities.Visit.list();
      const wrongTenantVisits = visits.filter(v => v.business_id !== user.business_id);
      
      if (wrongTenantVisits.length > 0) {
        addResult('Visit Isolation', false, `SECURITY ISSUE: Found ${wrongTenantVisits.length} visits from other tenants!`);
      } else {
        addResult('Visit Isolation', true, `All ${visits.length} visits belong to current tenant`);
      }

      // Test 7: Verify Payments isolation
      const payments = await base44.entities.Payment.list();
      const wrongTenantPayments = payments.filter(p => {
        const clientMatch = allClients.find(c => c.id === p.client_id);
        return !clientMatch;
      });

      if (wrongTenantPayments.length > 0) {
        addResult('Payment Isolation', false, `SECURITY ISSUE: Found ${wrongTenantPayments.length} payments with cross-tenant references!`);
      } else {
        addResult('Payment Isolation', true, `All ${payments.length} payments properly isolated`);
      }

      // Test 8: Cleanup - delete test data
      await base44.entities.Client.delete(testClient1.id);
      await base44.entities.Caregiver.delete(testCaregiver.id);
      addResult('Cleanup', true, 'Test data cleaned up successfully');

      // Calculate summary
      const passed = results.filter(r => r.passed).length + 1; // +1 for cleanup
      const failed = results.filter(r => !r.passed).length;
      const total = passed + failed;

      setSummary({
        total,
        passed,
        failed,
        passRate: ((passed / total) * 100).toFixed(1)
      });

      if (failed === 0) {
        toast.success('All tenant isolation tests passed!');
      } else {
        toast.error(`${failed} test(s) failed - security issues detected!`);
      }

    } catch (error) {
      addResult('Test Suite', false, `Error: ${error.message}`);
      toast.error('Test suite failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-teal-600" />
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Tenant Isolation Testing</h1>
        </div>
        <p className="text-slate-500">
          Verify that data from different businesses is properly isolated and secure
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Admin Only:</strong> This page tests Row-Level Security (RLS) policies to ensure no cross-tenant data leakage.
          Tests will create and delete temporary data.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Test Suite</h2>
          <Button 
            onClick={runTests}
            disabled={testing}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>

        {summary && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Tests</p>
                <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Passed</p>
                <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Pass Rate</p>
                <p className="text-2xl font-bold text-slate-900">{summary.passRate}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {results.length === 0 && !testing && (
            <div className="text-center py-12 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Click "Run Tests" to start tenant isolation verification</p>
            </div>
          )}

          {results.map((result, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                result.passed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {result.passed ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-slate-900">{result.test}</h3>
                  <Badge className={result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {result.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
                <p className={`text-sm ${result.passed ? 'text-slate-600' : 'text-red-700 font-medium'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-3">What This Tests</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <span><strong>Client Isolation:</strong> Verifies clients from other businesses are not visible</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <span><strong>Caregiver Isolation:</strong> Ensures caregiver data is properly scoped to business</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <span><strong>Shift Isolation:</strong> Checks shifts don't reference cross-tenant clients/caregivers</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <span><strong>Visit Isolation:</strong> Validates visit records are business-scoped</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <span><strong>Payment Isolation:</strong> Ensures payment data doesn't leak across tenants</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}