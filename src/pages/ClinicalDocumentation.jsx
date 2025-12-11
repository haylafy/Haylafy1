import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ClipboardList,
  FolderOpen,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CarePlanBuilder from '@/components/clinical/CarePlanBuilder';
import VisitDocumentationForm from '@/components/clinical/VisitDocumentationForm';
import AssessmentForm from '@/components/clinical/AssessmentForm';
import DocumentManager from '@/components/clinical/DocumentManager';
import DocumentationReport from '@/components/clinical/DocumentationReport';
import TaskAssignmentManager from '@/components/clinical/TaskAssignmentManager';

export default function ClinicalDocumentation() {
  const [activeTab, setActiveTab] = useState('careplans');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: carePlans = [], isLoading: loadingCarePlans } = useQuery({
    queryKey: ['care-plans', user?.business_id],
    queryFn: async () => {
      if (!user?.business_id) return [];
      return base44.entities.CarePlan.list('-created_date');
    },
    enabled: !!user,
  });

  const { data: visitDocs = [], isLoading: loadingVisitDocs } = useQuery({
    queryKey: ['visit-documentation', user?.business_id],
    queryFn: async () => {
      if (!user?.business_id) return [];
      return base44.entities.VisitDocumentation.list('-visit_date', 50);
    },
    enabled: !!user,
  });

  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ['assessments', user?.business_id],
    queryFn: async () => {
      if (!user?.business_id) return [];
      return base44.entities.Assessment.list('-assessment_date');
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['clinical-documents', user?.business_id],
    queryFn: async () => {
      if (!user?.business_id) return [];
      return base44.entities.ClinicalDocument.list('-upload_date');
    },
    enabled: !!user,
  });

  const isLoading = !user || loadingCarePlans || loadingVisitDocs || loadingAssessments || loadingDocuments;

  // Stats
  const activeCarePlans = carePlans.filter(cp => cp.status === 'approved').length;
  const pendingApprovals = carePlans.filter(cp => cp.status === 'pending_approval').length;
  const incompleteVisitDocs = visitDocs.filter(vd => vd.documentation_status === 'incomplete').length;
  const totalDocuments = documents.length;

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
          Clinical Documentation
        </h1>
        <p className="text-slate-500 mt-1">Manage patient records, care plans, and visit documentation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Care Plans</p>
              <p className="text-2xl font-bold text-slate-900">{activeCarePlans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Approval</p>
              <p className="text-2xl font-bold text-slate-900">{pendingApprovals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Incomplete Visits</p>
              <p className="text-2xl font-bold text-slate-900">{incompleteVisitDocs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Documents</p>
              <p className="text-2xl font-bold text-slate-900">{totalDocuments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="careplans">Care Plans</TabsTrigger>
          <TabsTrigger value="tasks">Task Assignment</TabsTrigger>
          <TabsTrigger value="visitdocs">Visits</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="careplans">
          <CarePlanBuilder />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskAssignmentManager />
        </TabsContent>

        <TabsContent value="visitdocs">
          <VisitDocumentationForm />
        </TabsContent>

        <TabsContent value="assessments">
          <AssessmentForm />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManager />
        </TabsContent>

        <TabsContent value="reports">
          <DocumentationReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}