import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

const aggregators = [
  { value: 'sandata', label: 'Sandata' },
  { value: 'hhaexchange', label: 'HHAeXchange' },
  { value: 'carebridge', label: 'CareBridge' },
  { value: 'telus', label: 'Telus Health' },
  { value: 'generic', label: 'Generic CSV/JSON' }
];

export default function EVVExportDialog({ open, onOpenChange, shifts }) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [aggregator, setAggregator] = useState('generic');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      // Filter shifts
      let filteredShifts = shifts.filter(s => s.evv_status === 'verified');
      
      if (dateRange.start) {
        filteredShifts = filteredShifts.filter(s => 
          new Date(s.check_in_time) >= new Date(dateRange.start)
        );
      }
      if (dateRange.end) {
        filteredShifts = filteredShifts.filter(s => 
          new Date(s.check_out_time) <= new Date(dateRange.end)
        );
      }

      if (filteredShifts.length === 0) {
        toast.error('No EVV-verified visits in selected date range');
        setGenerating(false);
        return;
      }

      // Generate export based on format
      let fileContent = '';
      let fileName = '';
      let mimeType = 'text/plain';

      if (exportFormat === 'csv') {
        const headers = [
          'Visit ID', 'Patient ID', 'Patient Name', 'Caregiver ID', 'Caregiver Name',
          'Service Type', 'Check In Time', 'Check Out Time', 'Check In Latitude', 
          'Check In Longitude', 'Check Out Latitude', 'Check Out Longitude',
          'Duration Hours', 'EVV Status', 'Geofence Status', 'Verification Method'
        ].join(',');
        
        const rows = filteredShifts.map(s => [
          s.id,
          s.client_id,
          s.client_name,
          s.caregiver_id,
          s.caregiver_name,
          s.service_type || '',
          s.check_in_time,
          s.check_out_time,
          s.check_in_gps?.latitude || '',
          s.check_in_gps?.longitude || '',
          s.check_out_gps?.latitude || '',
          s.check_out_gps?.longitude || '',
          s.actual_hours || '',
          s.evv_status,
          s.geofence_status,
          s.verification_method || ''
        ].join(',')).join('\n');
        
        fileContent = `${headers}\n${rows}`;
        fileName = `EVV_Export_${aggregator}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (exportFormat === 'json') {
        const evvPayload = filteredShifts.map(s => ({
          visitId: s.id,
          patientId: s.client_id,
          patientName: s.client_name,
          caregiverId: s.caregiver_id,
          caregiverName: s.caregiver_name,
          serviceType: s.service_type,
          clockIn: {
            timestamp: s.check_in_time,
            gps: s.check_in_gps,
            verificationMethod: s.verification_method
          },
          clockOut: {
            timestamp: s.check_out_time,
            gps: s.check_out_gps
          },
          duration: {
            hours: s.actual_hours,
            authorized: s.authorized_hours
          },
          verification: {
            status: s.evv_status,
            geofenceStatus: s.geofence_status,
            exceptions: s.evv_exceptions || []
          }
        }));

        fileContent = JSON.stringify({
          aggregator: aggregator,
          exportDate: new Date().toISOString(),
          recordCount: evvPayload.length,
          visits: evvPayload
        }, null, 2);
        
        fileName = `EVV_Export_${aggregator}_${format(new Date(), 'yyyy-MM-dd')}.json`;
        mimeType = 'application/json';
      }

      // Download file
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      toast.success(`EVV export generated: ${fileName}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to generate export');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export EVV Data</DialogTitle>
          <DialogDescription>
            Export EVV-verified visits to state aggregators or billing partners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Aggregator/Partner</Label>
            <Select value={aggregator} onValueChange={setAggregator}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aggregators.map(agg => (
                  <SelectItem key={agg.value} value={agg.value}>
                    {agg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Privacy Notice</p>
                <p>Export includes EVV timestamps and GPS data only. No clinical notes or PHI beyond what's required for EVV compliance.</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            <p><strong>{shifts.filter(s => s.evv_status === 'verified').length}</strong> verified visits available for export</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={generating}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {generating ? (
              'Generating...'
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}