import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Helper function to format leave type display
const formatLeaveType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'vacation': 'Vacation Leave',
    'sick': 'Sick Leave',
    'emergency': 'Special Emergency (Calamity) Leave',
    'maternity': 'Maternity Leave',
    'paternity': 'Paternity Leave',
    'forced': 'Mandatory/Forced Leave',
    'privilege': 'Special Privilege Leave',
    'soloparent': 'Solo Parent Leave',
    'study': 'Study Leave',
    'vawc': '10-Day VAWC Leave',
    'rehab': 'Rehabilitation Privilege',
    'special': 'Special Leave Benefits for Women',
    'adoption': 'Adoption Leave',
  };
  return typeMap[type.toLowerCase()] || type;
};
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaveRecord {
  id: string;
  staffId: string;
  name: string;
  date: string;
  reason: string;
  type: string;
  status: "approved" | "disapproved";
  remarks?: string;
  attachment?: string;
  updatedAt?: string; // finalized date
}

export function LeaveHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [history, setHistory] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const fetchHistory = async () => {
    setLoading(true);
    try {
      console.log('📚 Fetching leave history...');
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/leaves', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Response data:', result);
      
      if (!result.ok || !result.data) {
        throw new Error('Invalid response format');
      }
      
      // Filter only approved and denied requests
      const filtered = result.data.filter((req: any) => 
        req.status === 'approved' || req.status === 'disapproved'
      );
      
      console.log(`📊 Filtered ${filtered.length} history records from ${result.data.length} total`);
      
      const formatted: LeaveRecord[] = filtered.map((req: any) => ({
        id: String(req.id),
        staffId: req.staff_id || '',
        name: req.staff_name,
        date: req.date,
        reason: req.reason || '',
        type: req.leave_type || req.fields?.leave_type || 'Leave Request',
        status: req.status === 'approved' ? 'approved' as const : 'disapproved' as const,
        remarks: req.admin_remarks || req.remarks,
        attachment: req.file_url,
        updatedAt: req.finalized_at || req.updated_at || req.date // finalized date
      }));
      
      // Sort by finalized date (newest first)
      formatted.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.date).getTime();
        const dateB = new Date(b.updatedAt || b.date).getTime();
        return dateB - dateA; // newest first
      });
      
      console.log(`✅ Formatted ${formatted.length} history records`);
      setHistory(formatted);
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch leave history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(record =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.staffId.includes(searchTerm) ||
    record.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leave History</h1>
        <p className="text-muted-foreground">View all approved and disapproved leave requests</p>
      </div>

      {/* Search */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      {loading ? (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No leave history found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Staff ID</TableHead>
                    <TableHead className="font-semibold">Leave Date</TableHead>
                    <TableHead className="font-semibold">Type of Leave</TableHead>
                    <TableHead className="font-semibold">Remarks</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell>{record.staffId}</TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatLeaveType(record.type)}</TableCell>
                      <TableCell>
                        {record.status === 'disapproved' && record.remarks ? (
                          <span className="text-destructive italic">{record.remarks}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.status === "approved" ? "default" : "destructive"}
                          className={record.status === "approved" ? "bg-success text-success-foreground" : ""}
                        >
                          {record.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
