import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserCog } from "lucide-react";
import { PersonnelDetails } from "./PersonnelDetails";

interface Personnel {
  id: string;
  staffId: string;
  name: string;
  role: string;
  department: string;
  email: string;
}

const mockPersonnel: Personnel[] = [
  { id: "1", staffId: "23-2025-0001", name: "Cedrick Plupenio", role: "HR Head Admin", department: "HR Office", email: "cedrick.p@udm.edu.ph" },
  { id: "2", staffId: "01-2025-0042", name: "Temp Admin", role: "Admin", department: "HR Office", email: "temp@ad.co" },
  { id: "3", staffId: "15-2025-0026", name: "Aira Magno", role: "Faculty", department: "College of Arts & Sciences", email: "aira.magno@udm.edu.ph" },
  { id: "4", staffId: "22-2003-0111", name: "Adrienne Colline M. Mauleon", role: "Faculty", department: "College of Engineering", email: "adrienne.mauleon@udm.edu.ph" },
  { id: "5", staffId: "12-2025-0021", name: "Allan Valdez", role: "Faculty", department: "College of Business Admin", email: "allan.valdez@udm.edu.ph" },
];

export function PersonnelList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);

  const filteredPersonnel = mockPersonnel.filter(person => {
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
                {filteredPersonnel.map((person) => (
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
                ))}
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
