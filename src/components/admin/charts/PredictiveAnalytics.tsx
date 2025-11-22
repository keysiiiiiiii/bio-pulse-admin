import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format } from "date-fns";

interface PredictiveAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function PredictiveAnalytics({ selectedDate, dateRange }: PredictiveAnalyticsProps) {
  const [topViewType, setTopViewType] = useState<"punctual" | "late">("late");
  const [topCount, setTopCount] = useState<number>(10);
  const [topData, setTopData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange, topViewType, topCount]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 
                    selectedDate ? format(new Date(selectedDate.getFullYear(), 0, 1), 'yyyy-MM-dd') : 
                    format(new Date(2025, 0, 1), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 
                  selectedDate ? format(new Date(selectedDate.getFullYear(), 11, 31), 'yyyy-MM-dd') : 
                  format(new Date(2025, 11, 31), 'yyyy-MM-dd');

      const res = await analyticsApi.getTopPunctualLate(start, end, topViewType, topCount);
      setTopData(res.rows || []);
    } catch (error) {
      console.error('Failed to fetch predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Empty - Ready for SARIMA model integration */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
          <CardDescription>
            SARIMA time-series forecasting model for attendance prediction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Ready for SARIMA model integration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
