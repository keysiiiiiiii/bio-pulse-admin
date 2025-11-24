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
import {
  Download,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Package,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const [downloadingRow, setDownloadingRow] = useState<string | null>(null);

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

  // 🆕 GENERATE FOR SELECTED MONTH - Creates PDF in storage
  const handleGenerateMonth = async () => {
    setGenerating(true);
    setGenerationProgress(0);

    try {
      const response = await fetch(`${API_BASE_URL}/dtr/ensure-month`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          dept:
            filterType !== "all" && filterValue !== "all"
              ? filterValue
              : undefined,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const result = await response.json();
      const successCount = result.items?.filter((i: any) => i.ok).length || 0;
      const totalCount = result.items?.length || 0;

      setGenerationProgress(100);

      toast({
        title: "✅ DTRs Generated Successfully",
        description: `${successCount}/${totalCount} DTR files saved to storage`,
      });

      // Refresh list to show updated status
      await fetchDTRRecords();
    } catch (error) {
      console.error("Error generating DTRs:", error);
      toast({
        title: "Error",
        description: "Failed to generate DTR files",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  // 🆕 BATCH GENERATE - January 2025 to current month
  const handleBatchGenerateAll = async () => {
    const confirmed = confirm(
      "Generate all DTRs from January 2025 to current month?\n\n" +
        "This will take several minutes. Continue?"
    );

    if (!confirmed) return;

    setGenerating(true);
    setGenerationProgress(0);

    try {
      const startYear = 2025;
      const endYear = currentYear;
      const endMonth = currentDate.getMonth() + 1; // 1-12

      const monthsToGenerate = [];

      for (let year = startYear; year <= endYear; year++) {
        const startMonth = year === startYear ? 1 : 1;
        const lastMonth = year === endYear ? endMonth : 12;

        for (let month = startMonth; month <= lastMonth; month++) {
          monthsToGenerate.push({ year, month });
        }
      }

      let completed = 0;
      const total = monthsToGenerate.length;

      for (const { year, month } of monthsToGenerate) {
        try {
          const response = await fetch(`${API_BASE_URL}/dtr/ensure-month`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month,
              year,
              dept:
                filterType !== "all" && filterValue !== "all"
                  ? filterValue
                  : undefined,
            }),
          });

          if (response.ok) {
            completed++;
            setGenerationProgress(Math.round((completed / total) * 100));
          }
        } catch (err) {
          console.error(`Failed for ${year}-${month}:`, err);
        }
      }

      toast({
        title: "✅ Batch Generation Complete",
        description: `Generated DTRs for ${completed}/${total} months`,
      });

      await fetchDTRRecords();
    } catch (error) {
      console.error("Error in batch generation:", error);
      toast({
        title: "Error",
        description: "Batch generation failed",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  // ✅ DOWNLOAD - Will auto-generate if not in storage
  const handleDownloadSingle = async (staffId: string) => {
    try {
      const items = [{ staff_id: staffId }];

      const response = await fetch(`${API_BASE_URL}/dtr/ensure-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      });

      if (!response.ok) throw new Error("Failed to get download URL");

      const result = await response.json();
      const item = result.items?.[0];

      if (item?.url) {
        window.open(item.url, "_blank");
        toast({
          title: "📥 Downloading",
          description: `DTR for ${staffId}`,
        });

        // Refresh to update status
        await fetchDTRRecords();
      } else {
        throw new Error(item?.error || "No URL returned");
      }
    } catch (error) {
      console.error("Error downloading DTR:", error);
      toast({
        title: "Error",
        description: "Failed to download DTR",
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

      const result = await dtrApi.downloadExcelBatch(
        staff_ids,
        yearNum,
        monthNum
      );

      toast({
        title: "📥 Excel Files Downloaded",
        description: `${result.success} file(s) downloaded successfully${
          result.failed > 0 ? `, ${result.failed} failed` : ""
        }`,
      });

      setSelectedRecords(new Set());
    } catch (error) {
      console.error("Error downloading Excel files:", error);
      toast({
        title: "Error",
        description: "Failed to download Excel files",
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

  const missingCount = filteredRecords.filter((r) => !r.has_file).length;
  const readyCount = filteredRecords.filter((r) => r.has_file).length;

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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Generate This Month */}
            <Button
              onClick={handleGenerateMonth}
              variant="default"
              disabled={generating || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating && generationProgress < 100 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating... {generationProgress}%
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate This Month
                </>
              )}
            </Button>

            {/* Batch Generate All */}
            <Button
              onClick={handleBatchGenerateAll}
              variant="outline"
              disabled={generating || loading}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generationProgress}%
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Generate All (Jan 2025 - Now)
                </>
              )}
            </Button>

            {/* Download Excel Selected */}
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
                  Download Excel ({selectedRecords.size})
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {generating && generationProgress > 0 && (
            <div className="mt-4">
              <Progress value={generationProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Generating DTR files... {generationProgress}% complete
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm">
            <span className="text-muted-foreground">
              Total:{" "}
              <strong className="text-foreground">
                {filteredRecords.length}
              </strong>
            </span>
            <span className="text-green-600">
              In Storage: <strong>{readyCount}</strong>
            </span>
            <span className="text-amber-600">
              Not Yet Generated: <strong>{missingCount}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const isSelected = selectedRecords.has(record.staff_id);
                    const downloadable = canDownload(record);

                    return (
                      <TableRow
                        key={record.staff_id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isSelected ? "bg-muted" : ""
                        }`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button"))
                            return;
                          handleSelectRecord(record.staff_id);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSelectRecord(record.staff_id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.staff_id}
                        </TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.role}</TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              !downloadable ||
                              downloadingRow === record.staff_id
                            }
                            className="gap-2"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDownloadingRow(record.staff_id); // 🔁 start animation

                              try {
                                await dtrApi.downloadExcel(
                                  record.staff_id,
                                  parseInt(selectedYear),
                                  parseInt(selectedMonth) + 1
                                );

                                toast({
                                  title: "📥 Downloading Excel",
                                  description: `DTR for ${record.name}`,
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to download Excel",
                                  variant: "destructive",
                                });
                              } finally {
                                setDownloadingRow(null); // 🔁 stop animation
                              }
                            }}
                          >
                            {downloadingRow === record.staff_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
