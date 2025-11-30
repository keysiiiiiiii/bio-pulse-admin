import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { scheduleApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface LeaveDetails {
  leave_type: string;
  start_date: string;
  end_date: string;
  duration: number;
  reason?: string;
}

export function StaffSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdBy, setCreatedBy] = useState<any>(null);
  const [approvedLeaveDays, setApprovedLeaveDays] = useState<Date[]>([]);
  const [leaveLookup, setLeaveLookup] = useState<Map<string, LeaveDetails>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<LeaveDetails | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  useEffect(() => {
    fetchSchedule();
    fetchApprovedLeaves();
  }, [user]);

  const fetchSchedule = async () => {
    const userId = (user as any)?.id || (user as any)?.staff_user_id;

    if (!userId) {
      console.error('No user ID available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await scheduleApi.getSchedule(Number(userId));
      setSchedule(response.schedules || []);
      if (response.schedules?.length > 0) {
        setCreatedBy(response.schedules[0].created_by_staff_id);
      }
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: "Failed to load schedule",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedLeaves = async () => {
    const userId = (user as any)?.id || (user as any)?.staff_user_id;

    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { staff_user_id: userId, status: 'approved' }
      });

      const leaveDays: Date[] = [];
      const lookup = new Map<string, LeaveDetails>();
      
      if (response.data?.data) {
        response.data.data.forEach((leave: any) => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          const leaveDetails: LeaveDetails = {
            leave_type: leave.leave_type || 'Leave',
            start_date: leave.start_date,
            end_date: leave.end_date,
            duration: leave.duration || 0,
            reason: leave.reason
          };
          
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            lookup.set(dateStr, leaveDetails);
            leaveDays.push(new Date(d));
          }
        });
      }

      setApprovedLeaveDays(leaveDays);
      setLeaveLookup(lookup);
    } catch (error: any) {
      console.error('Error fetching approved leaves:', error);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const leaveDetails = leaveLookup.get(dateStr);
    
    if (leaveDetails) {
      setSelectedLeaveDetails(leaveDetails);
      setSelectedDate(date);
      setShowLeaveDialog(true);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule.find(s => s.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            My Work Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading schedule...</p>
        </CardContent>
      </Card>
    );
  }

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            My Work Schedule
          </CardTitle>
          <CardDescription>Your assigned work schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-8 text-center border-2 border-dashed rounded-lg">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No work schedule set yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your administrator to set up your work schedule.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Leave Calendar */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CalendarIcon className="h-5 w-5" />
            My Leave Calendar
          </CardTitle>
          <CardDescription className="text-sm">
            Days with approved leave requests are highlighted in blue. Click a date to view details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-4 pt-0 md:p-6 md:pt-0 overflow-x-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateClick}
            className="rounded-md border pointer-events-auto"
            modifiers={{
              approved: approvedLeaveDays
            }}
            modifiersStyles={{
              approved: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                fontWeight: 'bold'
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Work Schedule */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Clock className="h-5 w-5" />
            My Work Schedule
          </CardTitle>
          <CardDescription className="text-sm">Your assigned work schedule set by ICTO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <div className="space-y-2 md:space-y-3">
            {DAYS.map((dayName, index) => {
              const daySchedule = getScheduleForDay(index);
              const isScheduled = !!daySchedule;

              return (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-20 md:w-28 font-medium text-sm md:text-base">{dayName}</div>
                    {isScheduled ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(daySchedule.time_in)} - {formatTime(daySchedule.time_out)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">-</div>
                    )}
                  </div>
                  <Badge variant={isScheduled ? "default" : "secondary"} className="gap-1 self-start sm:self-auto">
                    {isScheduled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="text-xs">Scheduled</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span className="text-xs">Rest Day</span>
                      </>
                    )}
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="p-3 md:p-4 bg-info/10 border border-info/20 rounded-lg text-xs md:text-sm">
            <p className="text-info-foreground">
              ℹ️ <strong>Note:</strong> You can only record attendance on scheduled days during your assigned hours.
            </p>
          </div>

          {createdBy && (
            <p className="text-xs text-muted-foreground text-center">
               Last updated by Admin
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leave Details Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Leave Details
            </DialogTitle>
            <DialogDescription>
              {selectedDate && `Information for ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLeaveDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Type</p>
                  <p className="text-base font-semibold capitalize">{selectedLeaveDetails.leave_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-base font-semibold">{selectedLeaveDetails.duration} day(s)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-base">{new Date(selectedLeaveDetails.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base">{new Date(selectedLeaveDetails.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedLeaveDetails.reason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p className="text-base">{selectedLeaveDetails.reason}</p>
                </div>
              )}

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success-foreground">
                  ✅ This leave has been approved
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}