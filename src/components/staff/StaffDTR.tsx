import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { dtrApi } from "@/services/api/dtrApi";

const mockDTRData = [
  {
    day: 1,
    amArrival: "8:00 AM",
    pmDeparture: "5:00 PM",
    tardiness: "0h 0m",
    undertime: "0h 0m",
  },
  {
    day: 2,
    amArrival: "8:15 AM",
    pmDeparture: "5:00 PM",
    tardiness: "0h 15m",
    undertime: "0h 0m",
  },
  {
    day: 3,
    amArrival: "8:00 AM",
    pmDeparture: "4:45 PM",
    tardiness: "0h 0m",
    undertime: "0h 15m",
  },
  {
    day: 4,
    amArrival: "8:05 AM",
    pmDeparture: "5:00 PM",
    tardiness: "0h 5m",
    undertime: "0h 0m",
  },
  { day: 5, amArrival: "", pmDeparture: "", tardiness: "", undertime: "" },
];

export const StaffDTR = () => {
  const [selectedMonth, setSelectedMonth] = useState("November");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [dtrData, setDtrData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.staff_id) {
      fetchDTRData();
    }
  }, [selectedMonth, selectedYear, user]);

  const fetchDTRData = async () => {
    if (!user?.staff_id) return;

    setLoading(true);
    try {
      const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(selectedMonth);
      const records = await dtrApi.getRecords(
        user.staff_id,
        parseInt(selectedYear),
        monthIndex + 1
      );
      setDtrData(records);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch DTR records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user?.staff_id) return;

    try {
      const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(selectedMonth);

      await dtrApi.downloadExcel(
        user.staff_id,
        parseInt(selectedYear),
        monthIndex + 1
      );

      toast({
        title: "Downloading DTR",
        description: `DTR Excel for ${selectedMonth} ${selectedYear} is being downloaded...`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download DTR Excel",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    fetchDTRData();
    toast({
      title: "Refreshing",
      description: "Attendance records updated",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Daily Time Record
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            View and download your attendance records
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="min-h-[44px]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Month:</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Year:</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px] min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2025"].map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[60px]">Day</TableHead>
                  <TableHead className="min-w-[100px]">A.M. Arrival</TableHead>
                  <TableHead className="min-w-[100px]">P.M. Departure</TableHead>
                  <TableHead className="min-w-[80px]">Tardiness</TableHead>
                  <TableHead className="min-w-[80px]">Work Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : dtrData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  dtrData.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium sticky left-0 bg-background">
                        {record.date}
                      </TableCell>
                      <TableCell className="text-sm">{record.time_in || "-"}</TableCell>
                      <TableCell className="text-sm">{record.time_out || "-"}</TableCell>
                      <TableCell className="text-sm">{record.tardiness}</TableCell>
                      <TableCell className="text-sm">{record.undertime}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
