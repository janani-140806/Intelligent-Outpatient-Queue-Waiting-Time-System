import React from 'react';
import { Check, Clock, UserCheck, Stethoscope, CheckCircle2 } from 'lucide-react';

export default function QueueProgress({ status, queuePosition }) {
  // Steps:
  // 1: Booked
  // 2: Waiting in Queue
  // 3: Up Next (position <= 2)
  // 4: In Consultation
  // 5: Completed

  let currentStep = 2;
  if (status === 'in_consultation') {
    currentStep = 4;
  } else if (status === 'completed') {
    currentStep = 5;
  } else if (status === 'waiting') {
    if (queuePosition === 1 || queuePosition === 2) {
      currentStep = 3;
    } else {
      currentStep = 2;
    }
  } else if (status === 'cancelled' || status === 'skipped') {
    currentStep = 0;
  }

  const steps = [
    { id: 1, name: "Token Issued", desc: "Registered in OPD" },
    { id: 2, name: "In Queue", desc: queuePosition > 2 ? `#${queuePosition} waiting` : "In waiting hall" },
    { id: 3, name: "Up Next", desc: "Near doctor room" },
    { id: 4, name: "Consulting", desc: "In examination" },
    { id: 5, name: "Completed", desc: "Prescription ready" }
  ];

  if (currentStep === 0) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
        This queue token is marked as {status.toUpperCase()}. If you need assistance, please consult the hospital reception desk.
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-sky-600 z-0 transition-all duration-500" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                  isDone 
                    ? 'bg-sky-600 text-white' 
                    : isCurrent 
                      ? 'bg-sky-600 text-white ring-4 ring-sky-100 animate-pulse' 
                      : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" /> : step.id}
              </div>
              <div className="text-center mt-2">
                <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-sky-700' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.name}
                </p>
                <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
