import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TimeBasedData {
  lunch: number;
  happyHour: number;
  dinner: number;
}

interface TimeBasedChartProps {
  data: TimeBasedData;
}

const COLORS = {
  lunch: '#00C49F',
  happyHour: '#FFBB28', 
  dinner: '#0088FE'
};

export const TimeBasedChart: React.FC<TimeBasedChartProps> = ({ data }) => {
  const chartData = [
    { 
      name: 'Lunch', 
      value: data.lunch || 0,
      time: '11AM - 3PM',
      color: COLORS.lunch
    },
    { 
      name: 'Happy Hour', 
      value: data.happyHour || 0,
      time: '3PM - 6PM',
      color: COLORS.happyHour
    },
    { 
      name: 'Dinner', 
      value: data.dinner || 0,
      time: '6PM - Close',
      color: COLORS.dinner
    },
  ];

  const totalSales = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalSales > 0 ? ((data.value / totalSales) * 100).toFixed(1) : '0';
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.time}</p>
          <p className="text-primary">
            Sales: <span className="font-semibold">${data.value.toFixed(2)}</span>
          </p>
          <p className="text-primary">
            Share: <span className="font-semibold">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.name === label);
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{item?.time}</p>
          <p className="text-primary">
            Sales: <span className="font-semibold">${payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sales by Time Period</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {totalSales > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No time-based sales data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};