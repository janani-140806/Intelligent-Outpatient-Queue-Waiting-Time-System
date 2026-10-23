import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function SafetyDisclaimer({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-xl text-sky-900 text-xs md:text-sm font-medium shadow-sm ${className}`}>
      <AlertCircle className="w-5 h-5 text-sky-600 flex-shrink-0" />
      <div>
        <span className="font-semibold text-sky-800">Healthcare Operational Notice: </span>
        Estimated waiting time is for informational purposes only and may change depending on hospital conditions, emergency arrivals, and clinical consultation requirements.
      </div>
    </div>
  );
}
