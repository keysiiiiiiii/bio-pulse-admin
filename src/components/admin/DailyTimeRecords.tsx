import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DTRRecord {
  id: string;
  staffId: string;
  name: string;
  role: string;
  department: string;
  hasFile: boolean;
}

const mockDTRRecords: DTRRecord[] = [
  { id: "1", staffId: "23-2025-0001", name: "Cedrick Plupenio", role: "HR Head Admin", department: "HR Office", hasFile: true },
  { id: "2", staffId: "15-2025-0026", name: "Aira Magno", role: "Faculty", department: "College of Arts & Sciences", hasFile: true },
  { id: "3", staffId: "22-2003-0111", name: "Adrienne Colline M. Mauleon", role: "Faculty", department: "College of Engineering", hasFile: false },
  { id: "4", staffId: "12-2025-0021", name: "Allan Valdez", role: "Faculty", department: "College of Business Admin", hasFile: true },
];

export function DailyTimeRecords() {
  const [selectedMonth, setSelectedMonth] = useState("11");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" },
    { value: "3", label: "March" }, { value: "4", label: "April" },
    { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" },
    { value: "9", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const departments = [
    "All Departments",
    "HR Office",
    "College of Arts & Sciences",
    "College of Engineering",
    "College of Business Admin",
  ];

  const filteredRecords = mockDTRRecords.filter(record =>
    selectedDepartment === "all" || record.department === selectedDepartment
  );

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
    setSelectAll(newSelected.size === filteredRecords.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleDownloadSingle = (staffId: string, name: string) => {
    // TODO: Integrate with backend API to generate/download DTR PDF
    toast({
      title: "Downloading DTR",
      description: `Generating DTR for ${name} (${selectedMonth}/${selectedYear})...`,
    });
  };

  const handleBulkDownload = () => {
    if (selectedRecords.size === 0) {
      toast({
        title: "No Records Selected",
        description: "Please select at least one record to download",
        variant: "destructive",
      });
      return;
    }

    // TODO: Integrate with backend API for bulk download
    toast({
      title: "Bulk Download Started",
      description: `Downloading ${selectedRecords.size} DTR files...`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Daily Time Records</h1>
        <p className="text-muted-foreground">Download and manage staff DTR files</p>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.slice(1).map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleBulkDownload}
              className="bg-gradient-primary hover:opacity-90"
              disabled={selectedRecords.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Selected ({selectedRecords.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3">
                    <Checkbox 
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 font-semibold">Staff ID</th>
                  <th className="text-left p-3 font-semibold">Name</th>
                  <th className="text-left p-3 font-semibold">Role</th>
                  <th className="text-left p-3 font-semibold">Department</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-center p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3">
                      <Checkbox 
                        checked={selectedRecords.has(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                      />
                    </td>
                    <td className="p-3 font-mono text-sm">{record.staffId}</td>
                    <td className="p-3">{record.name}</td>
                    <td className="p-3 text-sm text-muted-foreground">{record.role}</td>
                    <td className="p-3 text-sm">{record.department}</td>
                    <td className="p-3">
                      {record.hasFile ? (
                        <span className="text-success flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Available
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Will Generate</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSingle(record.staffId, record.name)}
                        className="gap-2"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
