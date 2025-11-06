import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserCog } from "lucide-react";
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
}

export function PersonnelList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoading(true);
        const staffData = await staffApi.getAll();
        
        // Transform backend data to match Personnel interface
        const transformedData = staffData.map((staff) => ({
          id: staff.id.toString(),
          staffId: staff.staff_id,
          name: staff.name,
          role: staff.role,
          department: staff.department,
          email: staff.email || "",
        }));
        
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

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.staffId.includes(searchTerm);
    const matchesRole = filterRole === "all" || person.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Personnel List</h1>
        <p className="text-muted-foreground">Manage system users and their information</p>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or Staff ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="HR Head Admin">HR Head Admin</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="ICTO">ICTO</SelectItem>
                <SelectItem value="Faculty">Faculty</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Personnel Table */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No personnel found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((person) => (
                    <tr 
                      key={person.id} 
                      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPersonnel(person)}
                    >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPersonnel(person);
                          }}
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
    </div>
  );
}
