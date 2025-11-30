import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle } from "lucide-react";
import { scheduleApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function StaffSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdBy, setCreatedBy] = useState<any>(null);

  useEffect(() => {
    fetchSchedule();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          My Work Schedule
        </CardTitle>
        <CardDescription>Your assigned work schedule set by ICTO</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DAYS.map((dayName, index) => {
            const daySchedule = getScheduleForDay(index);
            const isScheduled = !!daySchedule;

            return (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-28 font-medium">{dayName}</div>
                  {isScheduled ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(daySchedule.time_in)} - {formatTime(daySchedule.time_out)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">-</div>
                  )}
                </div>
                <Badge variant={isScheduled ? "default" : "secondary"} className="gap-1">
                  {isScheduled ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Scheduled
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Rest Day
                    </>
                  )}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-info/10 border border-info/20 rounded-lg text-sm">
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
  );
}