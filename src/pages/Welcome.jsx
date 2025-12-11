import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { HeartPulse, LogIn, Shield, Clock, FileText, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    base44.auth.me()
      .then(() => {
        // User is logged in, redirect to dashboard
        navigate(createPageUrl('Dashboard'));
      })
      .catch(() => {
        // User not logged in, show welcome page
        setChecking(false);
      });
  }, [navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('Dashboard'));
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 mx-auto mb-4 animate-pulse">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Haylafy</h1>
                <p className="text-xs text-slate-500">Home Care Software</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-teal-600 hover:bg-teal-700">
              <LogIn className="w-4 h-4 mr-2" />
              Log In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Simplify Home Care
              <span className="block text-teal-600 mt-2">Management</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8">
              Streamline your home care agency operations with our all-in-one platform. 
              From scheduling to billing, we've got you covered.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-teal-600 hover:bg-teal-700 text-lg px-8 py-6 h-auto"
            >
              Get Started
              <LogIn className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Everything You Need to Run Your Agency
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Patient Management</h3>
              <p className="text-slate-600">
                Comprehensive patient records, care plans, and documentation all in one place.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">EVV & Scheduling</h3>
              <p className="text-slate-600">
                Electronic visit verification and intelligent scheduling to optimize caregiver assignments.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Clinical Documentation</h3>
              <p className="text-slate-600">
                Create and manage care plans, assessments, and visit notes with ease.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Billing Automation</h3>
              <p className="text-slate-600">
                Automate invoicing and claims submission. Export to 837P format with one click.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Onboarding</h3>
              <p className="text-slate-600">
                Streamlined patient and caregiver onboarding with automated workflows.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">HR Management</h3>
              <p className="text-slate-600">
                Manage caregiver certifications, training, and compliance all in one system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-12 text-center shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Home Care Agency?
          </h2>
          <p className="text-teal-100 text-lg mb-8">
            Join leading home care providers using Haylafy to streamline operations.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="bg-white text-teal-600 hover:bg-slate-50 text-lg px-8 py-6 h-auto"
          >
            Log In to Get Started
            <LogIn className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto text-center text-slate-500 text-sm">
          <p>© 2025 Haylafy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}