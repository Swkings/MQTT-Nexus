import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { X, TrendingUp } from 'lucide-react';

interface ChartPanelProps {
  data: any[];
  path: string;
  onClose: () => void;
}

export function ChartPanel({ data, path, onClose }: ChartPanelProps) {
  // Determine if data is mostly numeric or categorical
  const isNumeric = useMemo(() => {
    const numericCount = data.filter(d => typeof d.value === 'number' && !isNaN(d.value)).length;
    return numericCount > data.length * 0.5; // If more than 50% is numeric
  }, [data]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      value: isNumeric ? (typeof d.value === 'number' ? d.value : parseFloat(d.value)) : d.value
    })).filter(d => isNumeric ? !isNaN(d.value) : true);
  }, [data, isNumeric]);

  return (
    <div className="h-64 border-t border-slate-700/50 bg-slate-900/50 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Monitoring: <span className="text-cyan-300 font-mono">{path}</span></span>
          <span className="text-xs text-slate-500 ml-2">({chartData.length} data points)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 p-4 min-h-0">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No valid data points found for this field.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {isNumeric ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickMargin={10}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(val) => typeof val === 'number' ? val.toLocaleString() : val}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.375rem', fontSize: '12px' }}
                  itemStyle={{ color: '#22d3ee' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22d3ee" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#22d3ee', stroke: '#0f172a' }}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickMargin={10}
                  minTickGap={30}
                />
                <YAxis 
                  dataKey="value" 
                  type="category" 
                  stroke="#64748b" 
                  fontSize={10}
                  width={100}
                />
                <ZAxis range={[50, 50]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.375rem', fontSize: '12px' }}
                  itemStyle={{ color: '#22d3ee' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Scatter data={chartData} fill="#22d3ee" isAnimationActive={false} />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
