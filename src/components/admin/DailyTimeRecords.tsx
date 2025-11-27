//src/components/admin/DailyTimeRecords.tsx
// =================================================================
// IMPROVED DTR ADMIN SOLUTION
// Generate on-demand → Store in Supabase → Download anytime
// =================================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/services/api/config";
import { dtrApi } from "@/services/api/dtrApi";

interface DTRRecord {
  staff_user_id: number;
  staff_id: string;
  name: string;
  role: string;
  department: string;
  filename: string | null;
  path: string | null;
  has_file: boolean;
  month: number;
  year: number;
}

const monthNames = [
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
];

export function DailyTimeRecords() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentDate.getMonth().toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentDate.getFullYear().toString()
  );
  const [filterType, setFilterType] = useState<
    "all" | "colleges" | "departments"
  >("all");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(
    new Set()
  );
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const colleges = [
    "CCS - College of Computing Studies",
    "CHS - College of Health Sciences",
    "CCJ - College of Criminal Justice",
    "CED - College of Education",
    "NSTP - National Service Training Program",
    "Gen Ed - General Education",
    "CBPM - College of Business and Public Management",
    "CL - College of Law",
    "CAS - College of Arts and Sciences",
  ];

  const departments = [
    "Clinic",
    "Security",
    "Canteen",
    "Library",
    "Cleaning Services",
    "Human Resource (HR)",
    "Registrar",
    "HR Office",
  ];

  useEffect(() => {
    fetchDTRRecords();
  }, [selectedMonth, selectedYear, filterType, filterValue]);

  const fetchDTRRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      });

      if (filterType === "colleges" && filterValue !== "all") {
        params.append("department", filterValue);
      } else if (filterType === "departments" && filterValue !== "all") {
        params.append("department", filterValue);
      }

      const response = await fetch(`${API_BASE_URL}/dtr/list?${params}`);

      if (!response.ok) throw new Error("Failed to fetch DTR records");

      const data = await response.json();
      let records = data.rows || [];

      if (filterType === "colleges") {
        records = records.filter((r: DTRRecord) => r.role === "Faculty");
      } else if (filterType === "departments") {
        records = records.filter((r: DTRRecord) => r.role === "Staff");
      }

      setDtrRecords(records);
    } catch (error) {
      console.error("Error fetching DTR records:", error);
      toast({
        title: "Error",
        description: "Failed to fetch DTR records",
        variant: "destructive",
      });
      setDtrRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const canDownload = (record: DTRRecord) => {
    const monthNum = parseInt(selectedMonth);
    const yearNum = parseInt(selectedYear);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Can't download future months
    if (yearNum > currentYear) return false;
    if (yearNum === currentYear && monthNum > currentMonth) return false;

    return true; // ✅ Changed: Allow download even if not generated yet
  };

  const filteredRecords = dtrRecords.filter((record) => {
    if (filterType === "colleges" && filterValue !== "all") {
      return record.role === "Faculty" && record.department === filterValue;
    }
    if (filterType === "departments" && filterValue !== "all") {
      return record.role === "Staff" && record.department === filterValue;
    }
    return true;
  });

  // ✅ DOWNLOAD PDF - Single file download
  const handleDownloadSingle = async (staffId: string) => {
    try {
      const monthNum = parseInt(selectedMonth) + 1; // Convert to 1-12
      const yearNum = parseInt(selectedYear);

      await dtrApi.downloadPDF(staffId, yearNum, monthNum);

      toast({
        title: "📥 Downloading",
        description: `PDF DTR for ${staffId}`,
      });
    } catch (error) {
      console.error("Error downloading DTR:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF DTR",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedRecords.size === 0) return;

    setDownloading(true);

    try {
      const staff_ids = Array.from(selectedRecords);
      const monthNum = parseInt(selectedMonth) + 1; // Convert to 1-12
      const yearNum = parseInt(selectedYear);

      const result = await dtrApi.downloadPDFBatch(
        staff_ids,
        yearNum,
        monthNum
      );

      toast({
        title: "📥 PDF Files Downloaded",
        description: `${result.success} file(s) downloaded successfully${
          result.failed > 0 ? `, ${result.failed} failed` : ""
        }`,
      });

      setSelectedRecords(new Set());
    } catch (error) {
      console.error("Error downloading PDF files:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF files",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map((r) => r.staff_id)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Daily Time Records
        </h1>
        <p className="text-muted-foreground">
          Generate and download employee DTR files
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Filter & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterType}
              onValueChange={(val: any) => {
                setFilterType(val);
                setFilterValue("all");
              }}
            >
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
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
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
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadSelected}
              disabled={selectedRecords.size === 0 || downloading}
              className="ml-auto"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF ({selectedRecords.size})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DTR Records Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Personnel List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedRecords.size > 0 &&
                        selectedRecords.size === filteredRecords.length &&
                        filteredRecords.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {loading
                        ? "Loading DTR records..."
                        : "No personnel found for the selected criteria"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.staff_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.has(record.staff_id)}
                          onCheckedChange={() =>
                            handleSelectRecord(record.staff_id)
                          }
                          disabled={!canDownload(record)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.staff_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell>{record.role}</TableCell>
                      <TableCell className="text-sm">
                        {record.department}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadSingle(record.staff_id)}
                          disabled={!canDownload(record)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </TableCell>
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
}
