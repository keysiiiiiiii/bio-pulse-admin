import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { leaveApi } from "@/services/api/leaveApi";

export const StaffLeaveForm = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [numDays, setNumDays] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }
    
    if (!startDate || !leaveType || !reason) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      if (file) {
        await leaveApi.createWithFile({
          staff_name: user.name,
          date: format(startDate, 'yyyy-MM-dd'),
          reason,
          file
        });
      } else {
        await leaveApi.create({
          staff_name: user.name,
          date: format(startDate, 'yyyy-MM-dd'),
          reason,
          status: 'pending-admin'
        });
      }
      
      toast({
        title: "Leave Request Submitted",
        description: "Your leave request has been sent for approval",
      });
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType("");
      setReason("");
      setNumDays("");
      setFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Leave Form</h2>
        <p className="text-muted-foreground">Submit your leave request</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Days</Label>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="Enter number of days"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea 
                placeholder="Provide the reason for your leave request" 
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Upload medical certificate or supporting documents</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
