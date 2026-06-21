import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Search, UserCog, PlusCircle } from "lucide-react";
import { PersonnelDetails } from "./PersonnelDetails";
import { staffApi } from "@/services/api/staffApi";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Personnel {
  id: string;
  staff_id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar_url?: string;
  photo_url?: string;
  employee_type: string;
  contact_number?: string;
  status?: string;
}

const COLLEGES = [
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

const DEPARTMENTS = [
  "Clinic",
  "Security",
  "Canteen",
  "Library",
  "Cleaning Service",
  "Human Resource (HR)",
  "Registrar"
];

export function PersonnelList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterYearHired, setFilterYearHired] = useState("all");
  const [filterAgencyNumber, setFilterAgencyNumber] = useState("all");
  const [filterScheduleStatus, setFilterScheduleStatus] = useState("all"); // "all", "scheduled", "unscheduled"
  const [filterAccountStatus, setFilterAccountStatus] = useState<"active" | "inactive">("active");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [unscheduledUsers, setUnscheduledUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
 
  const fetchPersonnel = async () => {
    try {
      setLoading(true);
 
      // Try the /users endpoint first (for Admin/ICTO)
      let staffData;
      try {
        staffData = await staffApi.getAll(filterAccountStatus);
      } catch (error) {
        // Fallback to /staff endpoint if /users fails
        console.log('Falling back to /staff endpoint');
        staffData = await staffApi.getAllStaff(filterAccountStatus);
      }
 
      if (!Array.isArray(staffData)) {
        throw new Error('Invalid data format received from API');
      }
 
      // Transform the data to match our Personnel interface
      const transformedData = staffData
        .map((staff) => {
          console.log('Raw staff data:', staff); // 👈 ADD THIS LINE
          return {
            id: staff.id?.toString() || '', // This should be "221", "204", etc.
            staff_id: staff.staff_id,         // This is "28-2025-0002", etc.
            name: staff.name,
            role: staff.role || staff.employee_type,
            department: staff.department || "",
            email: staff.email || "",
            avatar_url: staff.avatar_url || staff.photo_url || "",
            photo_url: staff.photo_url || staff.avatar_url || "",
            employee_type: staff.employee_type || staff.role,
            contact_number: staff.contact_no || staff.contact_number || "",
            status: staff.status || "active",
          };
          })
        .sort((a, b) => {
          // Sort by the last 4 digits of staff_id
          const getLastFour = (id: string) => {
            const parts = id.split('-');
            return parseInt(parts[parts.length - 1] || '0');
          };
          return getLastFour(a.staff_id) - getLastFour(b.staff_id);
        });
 
      setPersonnel(transformedData);
 
      // Fetch unscheduled users
      try {
        const { scheduleApi } = await import('@/services/api');
        const unscheduledResponse = await scheduleApi.getUnscheduledUsers();
        const unscheduledIds = new Set(unscheduledResponse.users.map((u: any) => u.id.toString()));
        setUnscheduledUsers(unscheduledIds);
      } catch (error) {
        console.error('Failed to fetch unscheduled users:', error);
      }
 
      if (transformedData.length === 0) {
        toast({
          title: "No personnel found",
          description: `No ${filterAccountStatus} personnel found.`,
        });
      }
    } catch (error) {
      console.error('Failed to fetch personnel:', error);
      toast({
        title: "Error loading personnel",
        description: error instanceof Error ? error.message : "Failed to fetch data. Please check your connection and try again.",
        variant: "destructive",
      });
      // Set empty array so the UI shows "No personnel found" instead of error
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchPersonnel();
  }, [toast, filterAccountStatus]);

  const getYearFromStaffId = (staffId: string) => {
    const parts = staffId.split('-');
    return parts.length >= 2 ? parts[1] : '';
  };

  const getAgencyFromStaffId = (staffId: string) => {
    const parts = staffId.split('-');
    return parts.length >= 1 ? parts[0] : '';
  };

  const uniqueYears = Array.from(new Set(personnel.map(p => getYearFromStaffId(p.staff_id)))).filter(Boolean);
  const uniqueAgencies = Array.from(new Set(personnel.map(p => getAgencyFromStaffId(p.staff_id)))).filter(Boolean);

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.staff_id.includes(searchTerm);
    const matchesRole = filterRole === "all" || person.role === filterRole;
    const matchesCollege = filterCollege === "all" || (person.role === "Faculty" && person.department === filterCollege);
    const matchesDepartment = filterDepartment === "all" || (person.role === "Staff" && person.department === filterDepartment);
    const matchesYear = filterYearHired === "all" || getYearFromStaffId(person.staff_id) === filterYearHired;
    const matchesAgency = filterAgencyNumber === "all" || getAgencyFromStaffId(person.staff_id) === filterAgencyNumber;
    const matchesSchedule = filterScheduleStatus === "all" ||
      (filterScheduleStatus === "unscheduled" && unscheduledUsers.has(person.id)) ||
      (filterScheduleStatus === "scheduled" && !unscheduledUsers.has(person.id));

    return matchesSearch && matchesRole && matchesCollege && matchesDepartment && matchesYear && matchesAgency && matchesSchedule;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredPersonnel.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAddLeaveCredits = () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }
    setPasswordDialog(true);
  };

  const confirmAddLeaveCredits = async () => {
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password",
        variant: "destructive",
      });
      return;
    }

    try {
      // Activate leave for each selected employee
      const selectedPersonnel = personnel.filter(p => selectedIds.has(p.id));

      for (const person of selectedPersonnel) {
        try {
          await staffApi.activateLeave(person.staff_id, adminPassword);
        } catch (error) {
          console.error(`Failed to activate leave for ${person.name}:`, error);
        }
      }

      toast({
        title: "Leave Credits Activated",
        description: `Leave credits system activated for ${selectedIds.size} employee(s)`,
      });

      setPasswordDialog(false);
      setAdminPassword("");
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add leave credits",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Personnel List</h1>
        <p className="text-muted-foreground">Manage system users and their information</p>
      </div>

      <Tabs defaultValue="active" value={filterAccountStatus} onValueChange={(val) => setFilterAccountStatus(val as "active" | "inactive")} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="active">Active Accounts</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Accounts</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or Staff ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={(value) => {
                setFilterRole(value);
                setFilterCollege("all");
                setFilterDepartment("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="ICTO">ICTO</SelectItem>
                  <SelectItem value="Faculty">Faculty</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              {filterRole === "Faculty" && (
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by college" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Colleges</SelectItem>
                    {COLLEGES.map(college => (
                      <SelectItem key={college} value={college}>{college}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterRole === "Staff" && (
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={filterYearHired} onValueChange={setFilterYearHired}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year hired" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.sort().reverse().map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAgencyNumber} onValueChange={setFilterAgencyNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by agency number" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Agencies</SelectItem>
                  {uniqueAgencies.sort().map(agency => (
                    <SelectItem key={agency} value={agency}>Agency {agency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterScheduleStatus} onValueChange={setFilterScheduleStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Schedule Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="unscheduled">🟡 Unscheduled Users</SelectItem>
                  <SelectItem value="scheduled">✅ Scheduled Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="shadow-md border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} employee(s) selected
              </p>
              <Button onClick={handleAddLeaveCredits} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Activate Leave Credits System
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personnel Table */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-center p-3 font-semibold w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredPersonnel.length && filteredPersonnel.length > 0}
                      onCheckedChange={handleSelectAll}
                      disabled={filteredPersonnel.length === 0}
                    />
                  </th>
                  <th className="text-left p-3 font-semibold">Picture</th>
                  <th className="text-left p-3 font-semibold">Staff ID</th>
                  <th className="text-left p-3 font-semibold">Name</th>
                  <th className="text-left p-3 font-semibold">Role</th>
                  <th className="text-left p-3 font-semibold">Department</th>
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-center p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b">
                      <td className="p-3"><Skeleton className="h-4 w-4 mx-auto" /></td>
                      <td className="p-3"><Skeleton className="h-10 w-10 rounded-full" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="p-3 text-center"><Skeleton className="h-8 w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {personnel.length === 0
                        ? "No personnel records found in the database. Please add users first."
                        : "No personnel found matching your search criteria"
                      }
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((person) => (
                    <tr
                      key={person.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={selectedIds.has(person.id)}
                          onCheckedChange={(checked) => handleSelectOne(person.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={person.avatar_url || person.photo_url} alt={person.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="p-3 font-mono text-sm">{person.staff_id}</td>
                      <td className="p-3 font-medium">{person.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {person.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{person.department || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{person.email || "—"}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPersonnel(person)}
                          className="gap-2"
                        >
                          <UserCog className="h-3 w-3" />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Results count */}
          {!loading && filteredPersonnel.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {filteredPersonnel.length} of {personnel.length} personnel
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personnel Details Dialog */}
      <Dialog open={!!selectedPersonnel} onOpenChange={() => setSelectedPersonnel(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personnel Management</DialogTitle>
            <DialogDescription>
              View and manage personnel information, leave credits, and settings
            </DialogDescription>
          </DialogHeader>
          {selectedPersonnel && (
            <PersonnelDetails
              personnel={{ ...selectedPersonnel, staffId: selectedPersonnel.staff_id }}
              onScheduleUpdate={fetchPersonnel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Leave Credits System</DialogTitle>
            <DialogDescription>
              Enter your HR Admin password to activate the leave credits system for {selectedIds.size} employee(s).
              This will enable monthly accrual of 2.5 days (1.25 VL + 1.25 SL) per month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminPassword">HR Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmAddLeaveCredits();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialog(false);
              setAdminPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmAddLeaveCredits} disabled={!adminPassword}>
              Confirm & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}