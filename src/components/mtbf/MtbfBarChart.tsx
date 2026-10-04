import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

interface ChartDataItem {
  name: string; // label on X axis (e.g. "2023", "Jan-26")
  value: number | null; // value
  formattedValue?: string;
  isFuture?: boolean;
}

interface MtbfBarChartProps {
  title: string;
  data: ChartDataItem[];
  unit?: string;
  decimalPlaces?: number;
  height?: number;
  barColor?: string;
}

// Custom data label on top of each bar
const renderCustomBarLabel = (props: any, decimalPlaces: number = 0) => {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || isNaN(value)) return null;

  const displayVal = decimalPlaces > 0
    ? Number(value).toFixed(decimalPlaces)
    : Math.round(Number(value)).toLocaleString();

  // If value is 0, still show '0' if it's not a future month
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#67e8f9"
      textAnchor="middle"
      fontSize={9.5}
      fontWeight={600}
      fontFamily="monospace"
    >
      {displayVal}
    </text>
  );
};

export const MtbfBarChart: React.FC<MtbfBarChartProps> = ({
  title,
  data,
  unit = '',
  decimalPlaces = 0,
  height = 240,
  barColor = '#00B0F0'
}) => {
  // Filter out future months with null values so they don't render empty phantom bars
  const plotData = data.map(d => ({
    ...d,
    plotValue: d.value !== null ? d.value : undefined
  }));

  return (
    <div className="bg-[#0b1325]/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
      {/* Chart Title */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00B0F0]" />
          {title}
        </h4>
        {unit && (
          <span className="text-[10px] text-slate-400 font-mono">({unit})</span>
        )}
      </div>

      {/* Chart Area */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={plotData}
            margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={40}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ChartDataItem;
                  if (item.value === null) return null;
                  const formatted = decimalPlaces > 0
                    ? Number(item.value).toFixed(decimalPlaces)
                    : Math.round(Number(item.value)).toLocaleString();
                  return (
                    <div className="bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 shadow-2xl text-xs z-50">
                      <p className="text-slate-400 font-medium">{item.name}</p>
                      <p className="text-cyan-300 font-bold font-mono text-sm mt-0.5">
                        {formatted} {unit}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="plotValue"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              label={(props) => renderCustomBarLabel(props, decimalPlaces)}
            >
              {plotData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name.includes('YTD') || entry.name === '2026' ? '#38bdf8' : barColor}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
