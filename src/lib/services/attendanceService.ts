import { createServiceClient } from "@/lib/supabase/service";
import type { AttendanceStatus } from "@/lib/types";

export interface CheckInParams {
  organizationId: string;
  userId: string;
  latitude: number;
  longitude: number;
  notes?: string;
  selfieUrl?: string;
}

export async function checkIn(params: CheckInParams) {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const isLate = now.getHours() >= 10;

  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      {
        organization_id: params.organizationId,
        user_id: params.userId,
        date: today,
        check_in_time: now.toISOString(),
        check_in_latitude: params.latitude,
        check_in_longitude: params.longitude,
        check_in_selfie_url: params.selfieUrl,
        status: (isLate ? "late" : "present") as AttendanceStatus,
        notes: params.notes,
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) throw error;

  await supabase.from("activities").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    type: "attendance_checkin",
    title: "Checked in",
    description: `Location: ${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`,
    metadata: { attendance_id: data.id, status: data.status },
  });

  return data;
}

export async function checkOut(
  organizationId: string,
  userId: string,
  latitude: number,
  longitude: number
) {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("attendance")
    .update({
      check_out_time: new Date().toISOString(),
      check_out_latitude: latitude,
      check_out_longitude: longitude,
    })
    .eq("user_id", userId)
    .eq("date", today)
    .select()
    .single();

  if (error) throw error;

  await supabase.from("activities").insert({
    organization_id: organizationId,
    user_id: userId,
    type: "attendance_checkout",
    title: "Checked out",
    metadata: { attendance_id: data.id },
  });

  return data;
}

export async function getTodayAttendance(organizationId: string) {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("attendance")
    .select("*, user:profiles(*)")
    .eq("organization_id", organizationId)
    .eq("date", today)
    .order("check_in_time", { ascending: false });

  return data || [];
}

export async function getCurrentlyCheckedIn(organizationId: string) {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("attendance")
    .select("*, user:profiles(*)")
    .eq("organization_id", organizationId)
    .eq("date", today)
    .not("check_in_time", "is", null)
    .is("check_out_time", null);

  return data || [];
}

export async function getAttendanceHistory(
  organizationId: string,
  userId?: string,
  limit = 30
) {
  const supabase = createServiceClient();
  let query = supabase
    .from("attendance")
    .select("*, user:profiles(*)")
    .eq("organization_id", organizationId)
    .order("date", { ascending: false })
    .limit(limit);

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  return data || [];
}
