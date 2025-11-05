import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, FileText, Pin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeaveRequest {
  id: string;
  staffId: string;
  name: string;
  date: string;
  reason: string;
  type: string;
  status: "pending" | "pinned";
  attachment?: string;
}

const mockRequests: LeaveRequest[] = [
  { id: "1", staffId: "15-2025-0026", name: "Aira Magno", date: "2024-11-15", reason: "Family emergency", type: "Emergency Leave", status: "pending" },
  { id: "2", staffId: "22-2003-0111", name: "Adrienne Colline M. Mauleon", date: "2024-11-20", reason: "Medical appointment", type: "Sick Leave", status: "pinned" },
  { id: "3", staffId: "12-2025-0021", name: "Allan Valdez", date: "2024-11-25", reason: "Vacation", type: "Vacation Leave", status: "pending" },
];

export function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>(mockRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [disapproveDialog, setDisapproveDialog] = useState<{ open: boolean; requestId: string | null }>({ 
    open: false, 
    requestId: null 
  });
  const [disapproveRemark, setDisapproveRemark] = useState("");

  const handleApprove = (id: string) => {
    // TODO: Integrate with backend API
    toast({
      title: "Leave Request Approved",
      description: "The leave request has been approved successfully",
    });
    setRequests(requests.filter(r => r.id !== id));
  };

  const handleDisapprove = () => {
    if (!disapproveRemark.trim()) {
      toast({
        title: "Remark Required",
        description: "Please provide a reason for disapproval",
        variant: "destructive",
      });
      return;
    }

    // TODO: Integrate with backend API
    toast({
      title: "Leave Request Disapproved",
      description: "The leave request has been disapproved with remarks",
    });
    
    if (disapproveDialog.requestId) {
      setRequests(requests.filter(r => r.id !== disapproveDialog.requestId));
    }
    
    setDisapproveDialog({ open: false, requestId: null });
    setDisapproveRemark("");
  };

  const filteredRequests = requests
    .filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.staffId.includes(searchTerm) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leave Requests</h1>
        <p className="text-muted-foreground">Manage and approve staff leave requests</p>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{request.name}</CardTitle>
                    {request.status === "pinned" && <Pin className="h-4 w-4 text-accent" />}
                  </div>
                  <p className="text-sm text-muted-foreground">Staff ID: {request.staffId}</p>
                </div>
                <Badge variant="outline" className="bg-primary-light text-primary">
                  {request.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Date</p>
                  <p className="text-base">{new Date(request.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p className="text-base">{request.reason}</p>
                </div>
                {request.attachment && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    View Attachment
                  </Button>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(request.id)}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setDisapproveDialog({ open: true, requestId: request.id })}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Disapprove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disapprove Dialog */}
      <Dialog open={disapproveDialog.open} onOpenChange={(open) => setDisapproveDialog({ open, requestId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disapprove Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for disapproving this leave request
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your remarks..."
            value={disapproveRemark}
            onChange={(e) => setDisapproveRemark(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisapproveDialog({ open: false, requestId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisapprove}>
              Confirm Disapproval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
