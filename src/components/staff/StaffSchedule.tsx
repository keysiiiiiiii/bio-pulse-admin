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

  useEffect(() => { fetchSchedule(); }, [user]);

  const fetchSchedule = async () => {
    const userId = (user as any)?.id || (user as any)?.staff_user_id;
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await scheduleApi.getSchedule(Number(userId));
      setSchedule(response.schedules || []);
      if (response.schedules?.length > 0) setCreatedBy(response.schedules[0].created_by_staff_id);
    } catch (error: any) { toast({ title: "Failed to load schedule", description: error.message || "Please try again later", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const formatTime = (time: string) => { if (!time) return '-'; const [hour, minute] = time.split(':'); const h = parseInt(hour); return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${minute} ${h >= 12 ? 'PM' : 'AM'}`; };
  const getScheduleForDay = (dayOfWeek: number) => schedule.find(s => s.day_of_week === dayOfWeek);

  if (loading) return <Card><CardHeader className="p-4 md:p-6"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><CalendarIcon className="h-5 w-5" />My Work Schedule</CardTitle></CardHeader><CardContent className="p-4 pt-0 md:p-6 md:pt-0"><p className="text-muted-foreground">Loading schedule...</p></CardContent></Card>;
  if (schedule.length === 0) return <Card><CardHeader className="p-4 md:p-6"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><CalendarIcon className="h-5 w-5" />My Work Schedule</CardTitle><CardDescription className="text-xs md:text-sm">Your assigned work schedule</CardDescription></CardHeader><CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0"><div className="p-6 md:p-8 text-center border-2 border-dashed rounded-lg"><XCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4" /><p className="text-base md:text-lg font-medium text-muted-foreground">No work schedule set yet</p><p className="text-xs md:text-sm text-muted-foreground mt-2">Please contact your administrator to set up your work schedule.</p></div></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="p-4 md:p-6"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Clock className="h-5 w-5" />My Work Schedule</CardTitle><CardDescription className="text-xs md:text-sm">Your assigned work schedule set by ICTO</CardDescription></CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
        <div className="space-y-2 md:space-y-3">
          {DAYS.map((dayName, index) => { const daySchedule = getScheduleForDay(index); const isScheduled = !!daySchedule; return (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-2 sm:gap-4">
              <div className="flex items-center gap-3 md:gap-4"><div className="w-20 md:w-28 font-medium text-sm md:text-base">{dayName}</div>{isScheduled ? (<div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="h-4 w-4" /><span>{formatTime(daySchedule.time_in)} - {formatTime(daySchedule.time_out)}</span></div>) : (<div className="text-muted-foreground text-sm">-</div>)}</div>
              <Badge variant={isScheduled ? "default" : "secondary"} className="gap-1 w-fit text-xs">{isScheduled ? (<><CheckCircle2 className="h-3 w-3" />Scheduled</>) : (<><XCircle className="h-3 w-3" />Rest Day</>)}</Badge>
            </div>
          ); })}
        </div>
        <div className="p-3 md:p-4 bg-info/10 border border-info/20 rounded-lg text-xs md:text-sm"><p className="text-info-foreground">ℹ️ <strong>Note:</strong> You can only record attendance on scheduled days during your assigned hours.</p></div>
        {createdBy && <p className="text-xs text-muted-foreground text-center">Last updated by Admin</p>}
      </CardContent>
    </Card>
  );
}
