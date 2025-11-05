import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data - will be replaced with API
const mockUsers = [
  { id: "50-2025-0035", name: "Adrienne Colline M. Mauleon", role: "Faculty" },
  { id: "22-2003-0111", name: "ADRIENNE COLLINE M. MAULEON", role: "Faculty" },
  { id: "15-2025-0026", name: "Aira Magno", role: "Faculty" },
  { id: "12-2025-0021", name: "Allan Valdez", role: "Faculty" },
  { id: "23-2025-0001", name: "Cedrick Plupenio", role: "HR Head Admin" },
  { id: "08-2024-0015", name: "Maria Santos", role: "Staff" },
  { id: "16-2023-0089", name: "John Reyes", role: "Staff" },
  { id: "45-2025-0042", name: "Lisa Chen", role: "Faculty" },
];

interface UserListProps {
  selectedUser: any;
  onSelectUser: (user: any) => void;
}

export function UserList({ selectedUser, onSelectUser }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.includes(searchQuery) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="text-lg">Current Employees</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1 p-4 pt-0">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors ${
                  selectedUser?.id === user.id ? "bg-accent" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role} • {user.id}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
