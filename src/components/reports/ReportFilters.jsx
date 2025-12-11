import React from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

export default function ReportFilters({ 
  filters, 
  onFilterChange, 
  clients = [], 
  caregivers = [],
  onGenerate 
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-teal-600" />
        <h3 className="font-semibold text-slate-900">Report Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={filters.clientId} onValueChange={(value) => onFilterChange({ ...filters, clientId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Caregiver</Label>
          <Select value={filters.caregiverId} onValueChange={(value) => onFilterChange({ ...filters, caregiverId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Caregivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Caregivers</SelectItem>
              {caregivers.map((caregiver) => (
                <SelectItem key={caregiver.id} value={caregiver.id}>
                  {caregiver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => onFilterChange({
            startDate: '',
            endDate: '',
            clientId: 'all',
            caregiverId: 'all',
            serviceType: 'all'
          })}
        >
          Reset
        </Button>
        <Button onClick={onGenerate} className="bg-teal-600 hover:bg-teal-700">
          <Calendar className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>
    </div>
  );
}