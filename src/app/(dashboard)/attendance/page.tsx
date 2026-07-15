import { requireUser } from "@/lib/auth";
import {
  getAttendanceHistory,
  getCurrentlyCheckedIn,
} from "@/lib/services/attendanceService";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/attendance-client";

export default async function AttendancePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: todayRecord } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  const [history, checkedInUsers] = await Promise.all([
    getAttendanceHistory(user.organization_id, undefined, 14),
    getCurrentlyCheckedIn(user.organization_id),
  ]);

  return (
    <AttendanceClient
      todayRecord={todayRecord}
      history={history}
      checkedInUsers={checkedInUsers}
    />
  );
}
