import React from 'react';
import { Activity, ShieldCheck, Heart } from 'lucide-react';
import SafetyDisclaimer from './SafetyDisclaimer';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/80 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <SafetyDisclaimer />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
              +
            </div>
            <span className="font-semibold text-slate-700">AI Hospital Queue & Waiting-Time Prediction System</span>
            <span>• Final-Year CSE Healthcare Capstone Project</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Powered by Scikit-Learn Regression & FastAPI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
