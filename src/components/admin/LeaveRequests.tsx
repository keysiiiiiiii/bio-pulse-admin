import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, FileText, Pin, Download, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { leaveApi } from "@/services/api/leaveApi";

interface LeaveRequest {
  id: string;
  staffId: string;
  name: string;
  date: string;
  reason: string;
  type: string;
  status: "pending" | "pinned";
  attachment?: string;
  leaveForm?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  numDays?: number;
}

const mockRequests: LeaveRequest[] = [
  { id: "1", staffId: "15-2025-0026", name: "Aira Magno", date: "2024-11-15", reason: "Family emergency", type: "Emergency Leave", status: "pending" },
  { id: "2", staffId: "22-2003-0111", name: "Adrienne Colline M. Mauleon", date: "2024-11-20", reason: "Medical appointment", type: "Sick Leave", status: "pinned" },
  { id: "3", staffId: "12-2025-0021", name: "Allan Valdez", date: "2024-11-25", reason: "Vacation", type: "Vacation Leave", status: "pending" },
];

export function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [disapproveDialog, setDisapproveDialog] = useState<{ open: boolean; requestId: string | null }>({ 
    open: false, 
    requestId: null 
  });
  const [disapproveRemark, setDisapproveRemark] = useState("");
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; request: LeaveRequest | null }>({
    open: false,
    request: null
  });
  
  useEffect(() => {
    fetchLeaveRequests();
  }, []);
  
  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaves?status=pending');
      const result = await response.json();
      
      if (!result.ok || !result.data) {
        throw new Error('Failed to fetch leave requests');
      }
      
      const formatted = result.data.map((req: any) => ({
        id: String(req.id),
        staffId: req.staff_id || '',
        name: req.staff_name,
        date: req.date,
        reason: req.reason || '',
        type: req.fields?.leave_type || 'Leave Request',
        status: 'pending' as const,
        attachment: req.file_url,
        leaveForm: req.leave_form_url,
        leaveType: req.fields?.leave_type,
        startDate: req.fields?.start_date,
        endDate: req.fields?.end_date,
        numDays: req.fields?.num_days
      }));
      setRequests(formatted);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/leaves/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve');
      }
      
      toast({
        title: "Leave Request Approved",
        description: "The leave request has been approved and moved to history",
      });
      fetchLeaveRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve leave request",
        variant: "destructive"
      });
    }
  };

  const handleDisapprove = async () => {
    if (!disapproveRemark.trim()) {
      toast({
        title: "Remark Required",
        description: "Please provide a reason for disapproval",
        variant: "destructive",
      });
      return;
    }

    if (!disapproveDialog.requestId) return;
    
    try {
      const response = await fetch(`/api/leaves/${disapproveDialog.requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'denied', remarks: disapproveRemark })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to disapprove');
      }
      
      toast({
        title: "Leave Request Disapproved",
        description: "The leave request has been disapproved and moved to history",
      });
      fetchLeaveRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disapprove leave request",
        variant: "destructive"
      });
    }
    
    setDisapproveDialog({ open: false, requestId: null });
    setDisapproveRemark("");
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download Started",
        description: `Downloading ${filename}...`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the file",
        variant: "destructive"
      });
    }
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
        {loading ? (
          <div className="text-center p-8 text-muted-foreground">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No pending leave requests</div>
        ) : (
          filteredRequests.map((request) => (
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
                  {request.startDate && request.endDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Leave Period</p>
                      <p className="text-base">{request.startDate} to {request.endDate} ({request.numDays} days)</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reason</p>
                    <p className="text-base">{request.reason || 'No reason provided'}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setPreviewDialog({ open: true, request })}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {request.leaveForm && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleDownload(request.leaveForm!, `leave_form_${request.name}.xlsx`)}
                      >
                        <Download className="h-4 w-4" />
                        Download Form
                      </Button>
                    )}
                    {request.attachment && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleDownload(request.attachment!, `attachment_${request.name}`)}
                      >
                        <Download className="h-4 w-4" />
                        Download Attachment
                      </Button>
                    )}
                  </div>
                  
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
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, request: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Request Preview</DialogTitle>
            <DialogDescription>
              Review the details of this leave request
            </DialogDescription>
          </DialogHeader>
          {previewDialog.request && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Staff Name</p>
                  <p className="text-base font-semibold">{previewDialog.request.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Staff ID</p>
                  <p className="text-base font-semibold">{previewDialog.request.staffId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Type</p>
                  <p className="text-base">{previewDialog.request.leaveType || previewDialog.request.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Filing Date</p>
                  <p className="text-base">{new Date(previewDialog.request.date).toLocaleDateString()}</p>
                </div>
                {previewDialog.request.startDate && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                      <p className="text-base">{previewDialog.request.startDate}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">End Date</p>
                      <p className="text-base">{previewDialog.request.endDate}</p>
                    </div>
                  </>
                )}
                {previewDialog.request.numDays && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Number of Days</p>
                    <p className="text-base">{previewDialog.request.numDays} days</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reason</p>
                <p className="text-base mt-1">{previewDialog.request.reason || 'No reason provided'}</p>
              </div>
              
              {(previewDialog.request.leaveForm || previewDialog.request.attachment) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Attachments</p>
                  <div className="flex flex-col gap-2">
                    {previewDialog.request.leaveForm && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm">Leave Form (Excel)</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(previewDialog.request!.leaveForm!, `leave_form_${previewDialog.request!.name}.xlsx`)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                    {previewDialog.request.attachment && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-accent" />
                          <span className="text-sm">Supporting Document</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(previewDialog.request!.attachment!, `attachment_${previewDialog.request!.name}`)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false, request: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
