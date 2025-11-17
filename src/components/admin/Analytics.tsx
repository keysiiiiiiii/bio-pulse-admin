import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeAnalytics } from "./charts/TimeAnalytics";
import { TrendAnalytics } from "./charts/TrendAnalytics";
import { SeasonalAnalytics } from "./charts/SeasonalAnalytics";
import { PredictiveAnalytics } from "./charts/PredictiveAnalytics";
import { OvertimeUndertimeAnalytics } from "./charts/OvertimeUndertimeAnalytics";

export function Analytics() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isRangeMode, setIsRangeMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            Detailed insights and predictive analytics for attendance patterns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={!isRangeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRangeMode(false)}
          >
            Single Date
          </Button>
          <Button
            variant={isRangeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRangeMode(true)}
          >
            Date Range
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {isRangeMode && dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {isRangeMode ? (
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(date) => setDateRange(date as { from: Date; to: Date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date as Date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Group 1: Seasonal Trends - MOVED TO TOP */}
      <div className="space-y-6">
        <div className="border-l-4 border-orange-500 pl-4">
          <h3 className="text-xl font-semibold">Seasonal Trends</h3>
          <p className="text-sm text-muted-foreground">Analyze attendance patterns across different seasons</p>
        </div>
        <SeasonalAnalytics selectedDate={selectedDate} dateRange={dateRange} />
      </div>

      {/* Group 2: Predictive Analytics */}
      <div className="space-y-6">
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-xl font-semibold">Predictive Analytics</h3>
          <p className="text-sm text-muted-foreground">Forecast future trends and identify high-risk patterns (Note: Top Employees moved to Dashboard)</p>
        </div>
        <PredictiveAnalytics selectedDate={selectedDate} dateRange={dateRange} />
      </div>

      {/* Group 3: Overtime & Undertime Analytics */}
      <div className="space-y-6">
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-xl font-semibold">Overtime & Undertime Analytics</h3>
          <p className="text-sm text-muted-foreground">Monitor work hours and overtime patterns</p>
        </div>
        <div className="grid gap-6">
          <OvertimeUndertimeAnalytics selectedDate={selectedDate} dateRange={dateRange} />
          <TrendAnalytics selectedDate={selectedDate} dateRange={dateRange} />
        </div>
      </div>

      {/* Group 4: Time & Lateness Analytics */}
      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-4">
          <h3 className="text-xl font-semibold">Time & Lateness Analytics</h3>
          <p className="text-sm text-muted-foreground">Track punctuality patterns and time management (Note: Average Minutes Late moved to Seasonal Trends)</p>
        </div>
        <TimeAnalytics selectedDate={selectedDate} dateRange={dateRange} />
      </div>
    </div>
  );
}
