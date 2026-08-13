interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ElementType;
}

export function StatCard({ label, value, sublabel, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-300" />}
      </div>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}
