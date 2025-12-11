import React from 'react';
import { Stethoscope, Heart, Home, Activity, Users, Clock, Shield, Utensils } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Services() {
  const services = [
    { 
      name: 'Personal Care', 
      icon: Heart, 
      description: 'Bathing, grooming, dressing, and toileting assistance',
      features: ['ADL Support', 'Hygiene Assistance', 'Mobility Help'],
      active: 45 
    },
    { 
      name: 'Companionship', 
      icon: Users, 
      description: 'Social interaction, emotional support, and engagement',
      features: ['Social Activities', 'Conversation', 'Recreation'],
      active: 32 
    },
    { 
      name: 'Homemaking', 
      icon: Home, 
      description: 'Light housekeeping, laundry, and home maintenance',
      features: ['Cleaning', 'Laundry', 'Organization'],
      active: 38 
    },
    { 
      name: 'Meal Preparation', 
      icon: Utensils, 
      description: 'Nutritious meal planning and preparation',
      features: ['Menu Planning', 'Cooking', 'Diet Management'],
      active: 28 
    },
    { 
      name: 'Respite Care', 
      icon: Clock, 
      description: 'Temporary relief for family caregivers',
      features: ['Flexible Hours', 'Trusted Care', 'Family Support'],
      active: 18 
    },
    { 
      name: 'Skilled Nursing', 
      icon: Shield, 
      description: 'Licensed nursing care and medical support',
      features: ['Wound Care', 'Medication Admin', 'Health Monitoring'],
      active: 22 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500 mt-1">Comprehensive home care services tailored to your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div 
            key={service.name} 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                <service.icon className="w-7 h-7 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-lg">{service.name}</h3>
                <p className="text-slate-600 text-sm mt-1">{service.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {service.features.map((feature) => (
                <span 
                  key={feature}
                  className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600"
                >
                  {feature}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-teal-600">{service.active}</span> active patients
              </p>
              <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                Learn More →
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}