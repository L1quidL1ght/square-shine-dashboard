import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DatePresetSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const datePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" }, 
  { label: "This week", value: "thisWeek" },
  { label: "Last week", value: "lastWeek" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
  { label: "This year", value: "thisYear" },
  { label: "Custom", value: "custom" }
];

export function DatePresetSelector({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DatePresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState("custom");

  const applyPreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case "today":
        const todayStr = format(today, 'yyyy-MM-dd');
        onStartDateChange(todayStr);
        onEndDateChange(todayStr);
        break;
      case "yesterday":
        const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
        onStartDateChange(yesterdayStr);
        onEndDateChange(yesterdayStr);
        break;
      case "thisWeek":
        onStartDateChange(format(startOfWeek(today), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case "lastWeek":
        const lastWeekStart = startOfWeek(subDays(today, 7));
        const lastWeekEnd = endOfWeek(subDays(today, 7));
        onStartDateChange(format(lastWeekStart, 'yyyy-MM-dd'));
        onEndDateChange(format(lastWeekEnd, 'yyyy-MM-dd'));
        break;
      case "thisMonth":
        onStartDateChange(format(startOfMonth(today), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1);
        onStartDateChange(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case "thisYear":
        onStartDateChange(format(startOfYear(today), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfYear(today), 'yyyy-MM-dd'));
        break;
      default:
        // Custom - don't change dates
        break;
    }
    setSelectedPreset(preset);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-medium mb-1 block text-foreground">Date Range</label>
        <Select value={selectedPreset} onValueChange={applyPreset}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {datePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedPreset === "custom" && (
        <>
          <div>
            <label className="text-xs font-medium mb-1 block text-foreground">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block text-foreground">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}
      
      {selectedPreset !== "custom" && (
        <div className="col-span-2 flex items-end">
          <div className="text-xs text-muted-foreground">
            {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
          </div>
        </div>
      )}
    </div>
  );
}