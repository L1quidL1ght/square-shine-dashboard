import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CategorySalesData {
  kickstarters?: number;
  beer?: number;
  drinks?: number;
  merch?: number;
  desserts?: number;
  spirits?: number;
}

interface CategorySalesChartProps {
  data: CategorySalesData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const CategorySalesChart: React.FC<CategorySalesChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Kickstarters', value: data.kickstarters || 0, amount: data.kickstarters || 0 },
    { name: 'Beer', value: data.beer || 0, amount: data.beer || 0 },
    { name: 'Drinks', value: data.drinks || 0, amount: data.drinks || 0 },
    { name: 'Merch', value: data.merch || 0, amount: data.merch || 0 },
    { name: 'Desserts', value: data.desserts || 0, amount: data.desserts || 0 },
    { name: 'Spirits', value: data.spirits || 0, amount: data.spirits || 0 },
  ].filter(item => item.value > 0); // Only show categories with sales

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            Sales: <span className="font-semibold">${payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">
            Sales: <span className="font-semibold">${data.amount.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Category Sales Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No category sales data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};