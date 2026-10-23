import React from 'react';

export default function StatCard({ title, value, unit = "", subtitle, icon: Icon, color = "sky", badge }) {
  const colorMap = {
    sky: {
      bg: "bg-sky-50 text-sky-600 border-sky-100",
      accent: "text-sky-700"
    },
    teal: {
      bg: "bg-teal-50 text-teal-600 border-teal-100",
      accent: "text-teal-700"
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      accent: "text-amber-700"
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accent: "text-indigo-700"
    },
    rose: {
      bg: "bg-rose-50 text-rose-600 border-rose-100",
      accent: "text-rose-700"
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "text-emerald-700"
    }
  };

  const currentTheme = colorMap[color] || colorMap.sky;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
            {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${currentTheme.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {badge && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between">
          <span>{badge.label}</span>
          <span className="font-semibold text-slate-800">{badge.value}</span>
        </div>
      )}
    </div>
  );
}
