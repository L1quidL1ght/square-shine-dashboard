import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Custom Range", value: "custom" }
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
    <>
      <div className="flex-1">
        <label className="text-sm font-medium mb-2 block text-foreground">Date Range</label>
        <Select value={selectedPreset} onValueChange={applyPreset}>
          <SelectTrigger className="h-10 text-sm">
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
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block text-foreground">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block text-foreground">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </>
      )}
    </>
  );
}