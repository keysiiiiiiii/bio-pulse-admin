import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, TrendingUp, Activity, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeasonalAnalytics } from "./charts/SeasonalAnalytics";
import { PredictiveAnalytics } from "./charts/PredictiveAnalytics";
import { DepartmentInsights } from "./charts/DepartmentInsights";
import { EmployeePerformance } from "./charts/EmployeePerformance";

export function Analytics() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [activeTab, setActiveTab] = useState("seasonal");

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

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Seasonal Trends</span>
            <span className="sm:hidden">Seasonal</span>
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Predictive Analytics</span>
            <span className="sm:hidden">Predictive</span>
          </TabsTrigger>
          <TabsTrigger value="department" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Department Insights</span>
            <span className="sm:hidden">Department</span>
          </TabsTrigger>
          <TabsTrigger value="employee" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Employee Performance</span>
            <span className="sm:hidden">Employee</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="seasonal" className="space-y-6 m-0 animate-in fade-in-50 duration-300">
            <SeasonalAnalytics selectedDate={selectedDate} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6 m-0 animate-in fade-in-50 duration-300">
            <PredictiveAnalytics selectedDate={selectedDate} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="department" className="space-y-6 m-0 animate-in fade-in-50 duration-300">
            <DepartmentInsights selectedDate={selectedDate} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="employee" className="space-y-6 m-0 animate-in fade-in-50 duration-300">
            <EmployeePerformance selectedDate={selectedDate} dateRange={dateRange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
