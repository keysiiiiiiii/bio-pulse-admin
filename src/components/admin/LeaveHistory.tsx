import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText } from "lucide-react";
import { leaveApi } from "@/services/api/leaveApi";
import { toast } from "@/hooks/use-toast";

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
}

const mockHistory: LeaveRecord[] = [
  { 
    id: "1", 
    staffId: "50-2025-0035", 
    name: "Adrienne Colline M. Mauleon", 
    date: "2024-10-15", 
    reason: "Annual vacation", 
    type: "Vacation Leave", 
    status: "approved" 
  },
  { 
    id: "2", 
    staffId: "15-2025-0026", 
    name: "Aira Magno", 
    date: "2024-10-10", 
    reason: "Flu symptoms", 
    type: "Sick Leave", 
    status: "approved" 
  },
  { 
    id: "3", 
    staffId: "12-2025-0021", 
    name: "Allan Valdez", 
    date: "2024-09-25", 
    reason: "Personal matters", 
    type: "Emergency Leave", 
    status: "disapproved",
    remarks: "Insufficient supporting documents provided" 
  },
];

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
      // Fetch leave requests from backend
      const response = await fetch('/api/leaves');
      const result = await response.json();
      
      if (!result.ok || !result.data) {
        throw new Error('Failed to fetch leave history');
      }
      
      // Filter only approved and denied requests
      const filtered = result.data.filter((req: any) => 
        req.status === 'approved' || req.status === 'denied'
      );
      
      const formatted: LeaveRecord[] = filtered.map((req: any) => ({
        id: String(req.id),
        staffId: req.staff_id || '',
        name: req.staff_name,
        date: req.date,
        reason: req.reason || '',
        type: req.fields?.leave_type || 'Leave Request',
        status: req.status === 'approved' ? 'approved' as const : 'disapproved' as const,
        remarks: req.admin_remarks || req.remarks,
        attachment: req.file_url
      }));
      
      setHistory(formatted);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave history",
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

      {/* History List */}
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
        <div className="grid gap-4">
          {filteredHistory.map((record) => (
          <Card key={record.id} className="shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{record.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Staff ID: {record.staffId}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary-light text-primary">
                    {record.type}
                  </Badge>
                  <Badge 
                    variant={record.status === "approved" ? "default" : "destructive"}
                    className={record.status === "approved" ? "bg-success text-success-foreground" : ""}
                  >
                    {record.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Date</p>
                  <p className="text-base">{new Date(record.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p className="text-base">{record.reason}</p>
                </div>
                {record.remarks && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Admin Remarks</p>
                    <p className="text-base italic text-destructive">{record.remarks}</p>
                  </div>
                )}
                {record.attachment && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    View Attachment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}
