import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles,
  Users,
  Calendar,
  Heart,
  Wand2,
  CheckCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const tourSteps = [
  {
    id: 'welcome',
    title: '👋 Welcome to Haylafy!',
    description: 'Let us show you around your new home care management platform. This quick tour will help you get started.',
    icon: Sparkles,
    position: 'center',
    highlight: null,
  },
  {
    id: 'user-management',
    title: 'Manage Your Team',
    description: 'Invite team members, assign roles, and control permissions from the User Management page. Perfect for onboarding new staff.',
    icon: Users,
    position: 'bottom-left',
    highlight: '[href*="UserManagement"]',
    page: 'UserManagement'
  },
  {
    id: 'scheduling',
    title: 'Smart Scheduling',
    description: 'Create shifts, manage caregivers, and view your calendar. Color-coded by caregiver for easy tracking.',
    icon: Calendar,
    position: 'bottom-left',
    highlight: '[href*="Scheduling"]',
    page: 'Scheduling'
  },
  {
    id: 'ai-optimizer',
    title: '🤖 AI Schedule Optimizer',
    description: 'Use AI to automatically match caregivers to clients based on skills, availability, and proximity. Detects conflicts instantly!',
    icon: Wand2,
    position: 'top-right',
    highlight: 'button:has(svg.lucide-sparkles)',
    page: 'Scheduling'
  },
  {
    id: 'client-portal',
    title: 'Client Portal',
    description: 'Give families secure access to visit schedules, care notes, messaging, and billing information.',
    icon: Heart,
    position: 'bottom-left',
    highlight: '[href*="ClientPortal"]',
    page: 'ClientPortal'
  },
  {
    id: 'complete',
    title: '🎉 You\'re All Set!',
    description: 'You now know the key features. Explore at your own pace, and remember - we\'re here to help you deliver better care.',
    icon: CheckCircle,
    position: 'center',
    highlight: null,
  }
];

export default function PlatformTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (step.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        setHighlightedElement(element);
        const rect = element.getBoundingClientRect();
        
        // Calculate tooltip position based on step position preference
        let top, left;
        switch (step.position) {
          case 'top-right':
            top = rect.bottom + 10;
            left = rect.right - 350;
            break;
          case 'bottom-left':
            top = rect.bottom + 10;
            left = rect.left;
            break;
          case 'bottom-right':
            top = rect.bottom + 10;
            left = rect.right - 350;
            break;
          default:
            top = rect.bottom + 10;
            left = rect.left;
        }
        
        setTooltipPosition({ top, left });
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }
  }, [currentStep, step]);

  const handleNext = async () => {
    if (isLastStep) {
      try {
        await onComplete();
      } catch (error) {
        console.error('Error completing tour:', error);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    try {
      await onSkip();
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  };

  const Icon = step.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />

      {/* Highlight spotlight */}
      {highlightedElement && (
        <div
          className="fixed z-[101] pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 4,
            left: highlightedElement.getBoundingClientRect().left - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 0 4px rgba(20, 184, 166, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* Tour Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed z-[102] w-[350px]",
            step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
          )}
          style={step.position !== 'center' ? tooltipPosition : {}}
        >
          <Card className="p-6 shadow-2xl border-2 border-teal-500 bg-white">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
            <p className="text-slate-600 mb-6">{step.description}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-4">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentStep 
                      ? "w-8 bg-teal-600" 
                      : idx < currentStep
                      ? "w-2 bg-teal-300"
                      : "w-2 bg-slate-200"
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>

            <div className="text-center mt-3">
              <button
                onClick={handleSkip}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Skip tour
              </button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}