"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPropertyAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await createPropertyAction({
      title: form.get("title"),
      location: form.get("location"),
      address: form.get("address"),
      property_type: form.get("property_type"),
      price: form.get("price"),
      size_sqft: form.get("size_sqft"),
      bedrooms: form.get("bedrooms"),
      bathrooms: form.get("bathrooms"),
      description: form.get("description"),
      availability: "available",
    });
    setLoading(false);
    if (result.success) router.push("/properties");
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/properties"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">Add Property</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input name="title" required /></div>
            <div className="space-y-2"><Label>Location *</Label><Input name="location" required /></div>
            <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select name="property_type" defaultValue="apartment">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="plot">Plot</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Price (₹) *</Label><Input name="price" type="number" required /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Size (sqft)</Label><Input name="size_sqft" type="number" /></div>
              <div className="space-y-2"><Label>BHK</Label><Input name="bedrooms" type="number" /></div>
              <div className="space-y-2"><Label>Bathrooms</Label><Input name="bathrooms" type="number" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={3} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save Property"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
