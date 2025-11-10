import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { dtrApi } from "@/services/api/dtrApi";

const mockDTRData = [
  { day: 1, amArrival: "8:00 AM", pmDeparture: "5:00 PM", tardiness: "0h 0m", undertime: "0h 0m" },
  { day: 2, amArrival: "8:15 AM", pmDeparture: "5:00 PM", tardiness: "0h 15m", undertime: "0h 0m" },
  { day: 3, amArrival: "8:00 AM", pmDeparture: "4:45 PM", tardiness: "0h 0m", undertime: "0h 15m" },
  { day: 4, amArrival: "8:05 AM", pmDeparture: "5:00 PM", tardiness: "0h 5m", undertime: "0h 0m" },
  { day: 5, amArrival: "", pmDeparture: "", tardiness: "", undertime: "" },
];

export const FacultyDTR = () => {
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
      const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(selectedMonth);
      const records = await dtrApi.getRecords(user.staff_id, parseInt(selectedYear), monthIndex + 1);
      setDtrData(records);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch DTR records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user?.staff_id) return;
    
    try {
      const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(selectedMonth);
      const url = await dtrApi.downloadPDF(user.staff_id, parseInt(selectedYear), monthIndex + 1);
      window.open(url, '_blank');
      toast({
        title: "Downloading DTR",
        description: `DTR for ${selectedMonth} ${selectedYear} is being downloaded...`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download DTR",
        variant: "destructive"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Daily Time Record</h2>
          <p className="text-muted-foreground">View and download your attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Month:</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2025"].map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>A.M. Arrival</TableHead>
                  <TableHead>P.M. Departure</TableHead>
                  <TableHead>Tardiness</TableHead>
                  <TableHead>Undertime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : dtrData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No records found</TableCell>
                  </TableRow>
                ) : (
                  dtrData.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{new Date(record.date).getDate()}</TableCell>
                      <TableCell>{record.time_in || "-"}</TableCell>
                      <TableCell>{record.time_out || "-"}</TableCell>
                      <TableCell>{record.tardiness ? `${record.tardiness}m` : "-"}</TableCell>
                      <TableCell>{record.undertime ? `${record.undertime}m` : "-"}</TableCell>
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
