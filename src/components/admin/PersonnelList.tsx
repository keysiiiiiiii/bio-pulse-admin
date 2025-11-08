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
import { staffApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Personnel {
  id: string;
  staffId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar_url?: string;
  employee_type: string;
}

const COLLEGES = [
  "College of Computing Studies",
  "College of Health Sciences",
  "College of Criminal Justice",
  "College of Education",
  "National Service Training Program",
  "General Education",
  "College of Business and Public Management",
  "College of Law",
  "College of Arts and Sciences"
];

const DEPARTMENTS = [
  "clinic",
  "security",
  "canteen",
  "library",
  "cleaning service",
  "human resource (HR)"
];

export function PersonnelList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterYearHired, setFilterYearHired] = useState("all");
  const [filterAgencyNumber, setFilterAgencyNumber] = useState("all");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoading(true);
        const staffData = await staffApi.getAll();
        
        // Transform and sort by last 4 digits of Staff ID
        const transformedData = staffData
          .map((staff) => ({
            id: staff.id.toString(),
            staffId: staff.staff_id,
            name: staff.name,
            role: staff.role,
            department: staff.department,
            email: staff.email || "",
            avatar_url: staff.avatar_url,
            employee_type: staff.employee_type,
          }))
          .sort((a, b) => {
            const lastFourA = parseInt(a.staffId.slice(-4));
            const lastFourB = parseInt(b.staffId.slice(-4));
            return lastFourA - lastFourB;
          });
        
        setPersonnel(transformedData);
      } catch (error) {
        console.error('Failed to fetch personnel:', error);
        toast({
          title: "Error loading personnel",
          description: error instanceof Error ? error.message : "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPersonnel();
  }, [toast]);

  const getYearFromStaffId = (staffId: string) => {
    const parts = staffId.split('-');
    return parts.length >= 2 ? parts[1] : '';
  };

  const getAgencyFromStaffId = (staffId: string) => {
    const parts = staffId.split('-');
    return parts.length >= 1 ? parts[0] : '';
  };

  const uniqueYears = Array.from(new Set(personnel.map(p => getYearFromStaffId(p.staffId)))).filter(Boolean);
  const uniqueAgencies = Array.from(new Set(personnel.map(p => getAgencyFromStaffId(p.staffId)))).filter(Boolean);

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.staffId.includes(searchTerm);
    const matchesRole = filterRole === "all" || person.role === filterRole;
    const matchesCollege = filterCollege === "all" || (person.role === "Faculty" && person.department === filterCollege);
    const matchesDepartment = filterDepartment === "all" || (person.role === "Staff" && person.department === filterDepartment);
    const matchesYear = filterYearHired === "all" || getYearFromStaffId(person.staffId) === filterYearHired;
    const matchesAgency = filterAgencyNumber === "all" || getAgencyFromStaffId(person.staffId) === filterAgencyNumber;
    
    return matchesSearch && matchesRole && matchesCollege && matchesDepartment && matchesYear && matchesAgency;
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

    // TODO: Verify password and add leave credits via API
    toast({
      title: "Leave Credits Added",
      description: `Added 1.25 VL and 1.25 SL to ${selectedIds.size} employee(s)`,
    });

    setPasswordDialog(false);
    setAdminPassword("");
    setSelectedIds(new Set());
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Personnel List</h1>
        <p className="text-muted-foreground">Manage system users and their information</p>
      </div>

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
                  {uniqueYears.sort().map(year => (
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
                    <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                  ))}
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
                Add Monthly Credits (1.25 VL/SL)
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
                      No personnel found matching your search criteria
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
                          <AvatarImage src={person.avatar_url} alt={person.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="p-3 font-mono text-sm">{person.staffId}</td>
                      <td className="p-3 font-medium">{person.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="bg-primary-light text-primary">
                          {person.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{person.department}</td>
                      <td className="p-3 text-sm text-muted-foreground">{person.email}</td>
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
          {selectedPersonnel && <PersonnelDetails personnel={selectedPersonnel} />}
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Leave Credits Addition</DialogTitle>
            <DialogDescription>
              Please enter your HR Admin password to add 1.25 VL and 1.25 SL to {selectedIds.size} employee(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="adminPassword">HR Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialog(false);
              setAdminPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmAddLeaveCredits}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
