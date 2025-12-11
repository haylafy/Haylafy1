import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Clients from "./Clients";

import Caregivers from "./Caregivers";

import Scheduling from "./Scheduling";

import Payments from "./Payments";

import VisitNotes from "./VisitNotes";

import Messages from "./Messages";

import Reports from "./Reports";

import Onboarding from "./Onboarding";

import Settings from "./Settings";

import InfoCenter from "./InfoCenter";

import Services from "./Services";

import EVV from "./EVV";

import Claims from "./Claims";

import Referrals from "./Referrals";

import ClaimExport from "./ClaimExport";

import ClinicalDocumentation from "./ClinicalDocumentation";

import BusinessManagement from "./BusinessManagement";

import UserManagement from "./UserManagement";

import VisitTracking from "./VisitTracking";

import BillingAutomation from "./BillingAutomation";

import PatientOnboarding from "./PatientOnboarding";

import CaregiverDashboard from "./CaregiverDashboard";

import CaregiverOnboarding from "./CaregiverOnboarding";

import Welcome from "./Welcome";

import TenantIsolationTest from "./TenantIsolationTest";

import TenantOnboarding from "./TenantOnboarding";

import ClientPortal from "./ClientPortal";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Clients: Clients,
    
    Caregivers: Caregivers,
    
    Scheduling: Scheduling,
    
    Payments: Payments,
    
    VisitNotes: VisitNotes,
    
    Messages: Messages,
    
    Reports: Reports,
    
    Onboarding: Onboarding,
    
    Settings: Settings,
    
    InfoCenter: InfoCenter,
    
    Services: Services,
    
    EVV: EVV,
    
    Claims: Claims,
    
    Referrals: Referrals,
    
    ClaimExport: ClaimExport,
    
    ClinicalDocumentation: ClinicalDocumentation,
    
    BusinessManagement: BusinessManagement,
    
    UserManagement: UserManagement,
    
    VisitTracking: VisitTracking,
    
    BillingAutomation: BillingAutomation,
    
    PatientOnboarding: PatientOnboarding,
    
    CaregiverDashboard: CaregiverDashboard,
    
    CaregiverOnboarding: CaregiverOnboarding,
    
    Welcome: Welcome,
    
    TenantIsolationTest: TenantIsolationTest,
    
    TenantOnboarding: TenantOnboarding,
    
    ClientPortal: ClientPortal,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Caregivers" element={<Caregivers />} />
                
                <Route path="/Scheduling" element={<Scheduling />} />
                
                <Route path="/Payments" element={<Payments />} />
                
                <Route path="/VisitNotes" element={<VisitNotes />} />
                
                <Route path="/Messages" element={<Messages />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/InfoCenter" element={<InfoCenter />} />
                
                <Route path="/Services" element={<Services />} />
                
                <Route path="/EVV" element={<EVV />} />
                
                <Route path="/Claims" element={<Claims />} />
                
                <Route path="/Referrals" element={<Referrals />} />
                
                <Route path="/ClaimExport" element={<ClaimExport />} />
                
                <Route path="/ClinicalDocumentation" element={<ClinicalDocumentation />} />
                
                <Route path="/BusinessManagement" element={<BusinessManagement />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/VisitTracking" element={<VisitTracking />} />
                
                <Route path="/BillingAutomation" element={<BillingAutomation />} />
                
                <Route path="/PatientOnboarding" element={<PatientOnboarding />} />
                
                <Route path="/CaregiverDashboard" element={<CaregiverDashboard />} />
                
                <Route path="/CaregiverOnboarding" element={<CaregiverOnboarding />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/TenantIsolationTest" element={<TenantIsolationTest />} />
                
                <Route path="/TenantOnboarding" element={<TenantOnboarding />} />
                
                <Route path="/ClientPortal" element={<ClientPortal />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}