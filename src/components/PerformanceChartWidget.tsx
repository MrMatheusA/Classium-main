import { PerformanceData } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartWidgetProps {
  data: PerformanceData[];
}

export function PerformanceChartWidget({ data }: PerformanceChartWidgetProps) {
  // Transform data for recharts
  const chartData = [
    { name: '1º Bim', ...data.reduce((acc, curr) => ({ ...acc, [curr.subject]: curr.b1 }), {}) },
    { name: '2º Bim', ...data.reduce((acc, curr) => ({ ...acc, [curr.subject]: curr.b2 }), {}) },
    { name: '3º Bim', ...data.reduce((acc, curr) => ({ ...acc, [curr.subject]: curr.b3 || curr.b2 }), {}) },
  ];

  return (
    <div className="bg-ice/5 rounded-2xl border border-gold/10 p-6 flex flex-col h-[340px] shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-gold font-serif">Evolução Acadêmica</h4>
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 px-5 py-2 rounded-full hover:bg-gold/10 transition-colors shadow-sm">
          Ver Boletim
        </button>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A51C30" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#A51C30" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(248, 249, 250, 0.6)', textTransform: 'uppercase' }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(248, 249, 250, 0.6)' }}
              domain={[0, 10]}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(212, 175, 55, 0.1)" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#08142d', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}
              itemStyle={{ fontSize: '12px', color: '#F8F9FA' }}
              labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
            <Area 
              type="monotone" 
              dataKey="Matemática" 
              stroke="#D4AF37" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMath)" 
              activeDot={{ r: 5, fill: '#08142d', stroke: '#D4AF37', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="Português" 
              stroke="#A51C30" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPort)" 
              activeDot={{ r: 5, fill: '#08142d', stroke: '#A51C30', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
