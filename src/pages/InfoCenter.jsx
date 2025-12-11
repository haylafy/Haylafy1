import React, { useState } from 'react';
import { FileText, Search, Upload, Download, Trash2, Eye, Calendar, User, FolderOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function InfoCenter() {
  const [search, setSearch] = useState('');

  const documents = [
    { id: 1, name: 'Agency Policies & Procedures', type: 'PDF', date: '2025-11-15', category: 'Policy', size: '2.4 MB' },
    { id: 2, name: 'Employee Handbook 2025', type: 'PDF', date: '2025-10-20', category: 'HR', size: '1.8 MB' },
    { id: 3, name: 'HIPAA Compliance Guide', type: 'PDF', date: '2025-09-10', category: 'Compliance', size: '3.1 MB' },
    { id: 4, name: 'Care Plan Templates', type: 'DOCX', date: '2025-08-05', category: 'Forms', size: '856 KB' },
    { id: 5, name: 'Training Materials Q4', type: 'PDF', date: '2025-12-01', category: 'Training', size: '5.2 MB' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Info Center</h1>
          <p className="text-slate-500 mt-1">Documents, forms, and company resources</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{doc.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {doc.date}
                    </span>
                    <Badge variant="secondary" className="text-xs">{doc.category}</Badge>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}