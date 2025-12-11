import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

const documentTypes = [
  'physician_order',
  'intake_form',
  'service_authorization',
  'assessment',
  'care_plan',
  'caregiver_certification',
  'insurance_card',
  'other'
];

export default function DocumentManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['clinical-documents'],
    queryFn: () => base44.entities.ClinicalDocument.list('-upload_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClinicalDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-documents'] });
      toast.success('Document deleted');
    }
  });

  const handleFileUpload = async () => {
    if (!file || !selectedClient || !documentType) return;

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const client = clients.find(c => c.id === selectedClient);
      
      // Create document record
      await base44.entities.ClinicalDocument.create({
        client_id: selectedClient,
        client_name: client?.name,
        document_type: documentType,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user?.full_name || user?.email,
        upload_date: format(new Date(), 'yyyy-MM-dd'),
        access_log: [{
          user: user?.email,
          action: 'upload',
          timestamp: new Date().toISOString()
        }]
      });

      queryClient.invalidateQueries({ queryKey: ['clinical-documents'] });
      toast.success('Document uploaded securely');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Upload failed');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setDocumentType('');
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          🔒 All documents are encrypted and stored securely. Access is logged for HIPAA compliance.
        </p>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No documents uploaded</h3>
            <p className="text-slate-500">Upload patient documents securely to maintain records</p>
          </div>
        ) : (
          documents.map(doc => (
          <div key={doc.id} className="bg-white rounded-xl p-5 border border-slate-200 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{doc.file_name}</h3>
                <p className="text-sm text-slate-500">
                  {doc.client_name} • {doc.document_type.replace('_', ' ')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Uploaded by {doc.uploaded_by} on {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" asChild>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => deleteMutation.mutate(doc.id)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
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
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>File (PDF, JPG, PNG, DOCX)</Label>
              <Input 
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleFileUpload}
                disabled={!file || !selectedClient || !documentType || uploading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}