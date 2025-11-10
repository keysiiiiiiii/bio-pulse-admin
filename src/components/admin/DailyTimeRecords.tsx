import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { dtrApi } from "@/services/api/dtrApi";
import { staffApi } from "@/services/api/staffApi";

interface DTRRecord {
  id: string;
  staffId: string;
  name: string;
  role: "Faculty" | "Staff";
  department: string;
  status: "Ready" | "Will Generate";
}

const mockDTRRecords: DTRRecord[] = [
  { id: "1", staffId: "11-2025-0023", name: "Rafael Aquino", role: "Faculty", department: "College of Education", status: "Ready" },
  { id: "2", staffId: "11-2025-0024", name: "Ivy Perez", role: "Faculty", department: "College of Education", status: "Ready" },
  { id: "3", staffId: "23-2025-0001", name: "Cedrick Plupenio", role: "Staff", department: "human resource (HR)", status: "Ready" },
  { id: "4", staffId: "01-2025-0042", name: "Temp Admin", role: "Staff", department: "human resource (HR)", status: "Will Generate" },
];

const colleges = ["College of Computing Studies", "College of Health Sciences", "College of Criminal Justice", "College of Education", "National Service Training Program", "General Education", "College of Business and Public Management", "College of Law", "College of Arts and Sciences"];
const departments = ["clinic", "security", "canteen", "library", "cleaning service", "human resource (HR)"];

export function DailyTimeRecords() {
  const [selectedMonth, setSelectedMonth] = useState<string>("10");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [filterType, setFilterType] = useState<"all" | "colleges" | "departments">("all");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchDTRRecords();
  }, [selectedMonth, selectedYear]);
  
  const fetchDTRRecords = async () => {
    setLoading(true);
    try {
      const users = await staffApi.getAllStaff();
      const records = users.map((user: any) => ({
        id: user.staff_id,
        staffId: user.staff_id,
        name: user.name,
        role: user.role === "Faculty" ? "Faculty" : "Staff",
        department: user.department || "",
        status: "Ready"
      }));
      setDtrRecords(records);
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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const canDownload = (record: DTRRecord) => {
    const monthNum = parseInt(selectedMonth);
    const yearNum = parseInt(selectedYear);
    if (yearNum > currentYear) return false;
    if (yearNum === currentYear && monthNum >= currentMonth) return false;
    return record.status === "Ready";
  };

  const filteredRecords = dtrRecords.filter((record) => {
    if (filterType === "colleges" && filterValue !== "all") return record.role === "Faculty" && record.department === filterValue;
    if (filterType === "departments" && filterValue !== "all") return record.role === "Staff" && record.department === filterValue;
    return true;
  });
  
  const handleDownloadSelected = async () => {
    if (selectedRecords.size === 0) return;
    
    try {
      const downloadPromises = Array.from(selectedRecords).map(async (staffId) => {
        const url = await dtrApi.downloadPDF(staffId, parseInt(selectedYear), parseInt(selectedMonth));
        window.open(url, '_blank');
      });
      await Promise.all(downloadPromises);
      toast({
        title: "Downloading",
        description: `${selectedRecords.size} DTR files are being downloaded`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download DTR files",
        variant: "destructive"
      });
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRecords(newSelected);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Daily Time Records</h1>
        <p className="text-muted-foreground">Download and manage employee DTR files</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(val: any) => { setFilterType(val); setFilterValue("all"); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personnel</SelectItem>
                <SelectItem value="colleges">Colleges (Faculty)</SelectItem>
                <SelectItem value="departments">Departments (Staff)</SelectItem>
              </SelectContent>
            </Select>
            {filterType === "colleges" && (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {filterType === "departments" && (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleDownloadSelected} disabled={selectedRecords.size === 0 || loading}>
              <Download className="h-4 w-4 mr-2" />
              Download Selected ({selectedRecords.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const isSelected = selectedRecords.has(record.id);
                const downloadable = canDownload(record);
                return (
                  <TableRow key={record.id} className={`cursor-pointer ${isSelected ? "bg-muted" : ""}`} onClick={() => handleSelectRecord(record.id)}>
                    <TableCell><Checkbox checked={isSelected} /></TableCell>
                    <TableCell className="font-medium">{record.staffId}</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>{record.role}</TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell><span className={record.status === "Ready" ? "text-success" : "text-muted-foreground"}>{record.status}</span></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={isSelected && downloadable ? "default" : "outline"} disabled={!downloadable} className="gap-2">
                        {isSelected && downloadable && <CheckCircle2 className="h-4 w-4" />}
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
