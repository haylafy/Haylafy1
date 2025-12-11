import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, Upload, Download, Trash2, Eye, Loader2, CheckCircle, File } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const documentTypes = [
  { value: 'insurance_card', label: 'Insurance Card' },
  { value: 'physician_order', label: "Doctor's Notes/Orders" },
  { value: 'assessment', label: 'Assessment Form' },
  { value: 'service_authorization', label: 'Service Authorization' },
  { value: 'identification', label: 'ID Document' },
  { value: 'other', label: 'Other' }
];

export default function DocumentUpload({ clientId, clientName }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [deleteDoc, setDeleteDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => base44.entities.ClinicalDocument.list('-upload_date'),
    enabled: !!clientId,
    select: (data) => data.filter(doc => doc.client_id === clientId)
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }) => {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      return await base44.entities.ClinicalDocument.create({
        client_id: clientId,
        client_name: clientName,
        document_type: type,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: clientName,
        upload_date: new Date().toISOString(),
        tags: ['client_uploaded']
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      setSelectedFile(null);
      setDocumentType('');
      toast.success('Document uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.ClinicalDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      toast.success('Document deleted');
      setDeleteDoc(null);
    },
    onError: () => {
      toast.error('Failed to delete document');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast.error('Please select a file and document type');
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file: selectedFile, type: documentType });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('word') || fileType?.includes('doc')) return '📝';
    return '📎';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">Upload Document</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Choose File *</Label>
            <Input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1">
              Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
                <span className="text-xs text-slate-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentType || uploading}
            className="bg-teal-600 hover:bg-teal-700 w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Documents List */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Your Documents</h3>

        {documents.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Documents</h3>
            <p className="text-slate-500">Upload your documents to share them with your care team.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{getFileIcon(doc.file_type)}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{doc.file_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {doc.document_type?.replace('_', ' ')}
                        </Badge>
                        {doc.tags?.includes('client_uploaded') && (
                          <Badge className="bg-teal-100 text-teal-700 text-xs">
                            You uploaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Uploaded {format(new Date(doc.upload_date), 'MMM d, yyyy')} • 
                        {doc.file_size ? ` ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {doc.tags?.includes('client_uploaded') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteDoc(doc)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDoc.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}