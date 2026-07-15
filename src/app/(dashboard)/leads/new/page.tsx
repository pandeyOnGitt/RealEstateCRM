"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeadAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      full_name: form.get("full_name") as string,
      phone: form.get("phone") as string,
      email: form.get("email") as string,
      source: form.get("source") as string,
      property_type: form.get("property_type") as string,
      budget_min: form.get("budget_min") as string,
      budget_max: form.get("budget_max") as string,
      preferred_location: form.get("preferred_location") as string,
      temperature: form.get("temperature") as string,
      notes: form.get("notes") as string,
    };

    const result = await createLeadAction(data);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/leads/${result.lead?.id}`);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/leads" className="tap-target flex items-center text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Add Lead</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" type="tel" required placeholder="+919999999999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select name="source" defaultValue="manual">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="36_acre">36 Acre</SelectItem>
                    <SelectItem value="magicbricks">MagicBricks</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select name="property_type">
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="plot">Plot</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Budget Min (₹)</Label>
                <Input id="budget_min" name="budget_min" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Budget Max (₹)</Label>
                <Input id="budget_max" name="budget_max" type="number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_location">Preferred Location</Label>
              <Input id="preferred_location" name="preferred_location" placeholder="Gurgaon" />
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Select name="temperature" defaultValue="cold">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating & calling agent..." : "Create Lead"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
