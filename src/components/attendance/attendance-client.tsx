"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInAction, checkOutAction } from "@/lib/actions";
import { MobileHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import type { Attendance } from "@/lib/types";

export function AttendanceClient({
  todayRecord,
  history,
  checkedInUsers,
}: {
  todayRecord: Attendance | null;
  history: Attendance[];
  checkedInUsers: Attendance[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  function getLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err)
      );
    });
  }

  async function handleCheckIn() {
    setLoading(true);
    setError("");
    try {
      const loc = await getLocation();
      setLocation(loc);
      await checkInAction(loc.lat, loc.lng);
      router.refresh();
    } catch {
      setError("Could not get location. Please enable GPS.");
    }
    setLoading(false);
  }

  async function handleCheckOut() {
    setLoading(true);
    try {
      const loc = await getLocation();
      await checkOutAction(loc.lat, loc.lng);
      router.refresh();
    } catch {
      setError("Could not get location.");
    }
    setLoading(false);
  }

  const isCheckedIn = todayRecord?.check_in_time && !todayRecord?.check_out_time;

  return (
    <div>
      <MobileHeader title="Attendance" />
      <div className="hidden md:block border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Attendance</h1>
      </div>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {!isCheckedIn ? (
                <Button size="lg" className="w-full max-w-xs h-14 text-lg" onClick={handleCheckIn} disabled={loading}>
                  <LogIn className="mr-2 h-5 w-5" />
                  {loading ? "Checking in..." : "Check In"}
                </Button>
              ) : (
                <Button size="lg" variant="destructive" className="w-full max-w-xs h-14 text-lg" onClick={handleCheckOut} disabled={loading}>
                  <LogOut className="mr-2 h-5 w-5" />
                  {loading ? "Checking out..." : "Check Out"}
                </Button>
              )}
              {todayRecord?.check_in_time && (
                <p className="text-sm text-muted-foreground">
                  Checked in at {format(new Date(todayRecord.check_in_time), "h:mm a")}
                  {todayRecord.check_out_time && ` · Out at ${format(new Date(todayRecord.check_out_time), "h:mm a")}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Currently Checked In ({checkedInUsers.length})</CardTitle></CardHeader>
          <CardContent>
            {checkedInUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one checked in</p>
            ) : (
              <div className="space-y-2">
                {checkedInUsers.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <span className="text-sm">{a.user?.full_name}</span>
                    <Badge variant="outline" className="text-green-700">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{a.user?.full_name || "You"}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <Badge className="capitalize">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
