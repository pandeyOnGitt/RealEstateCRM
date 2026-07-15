"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

export function LeadsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      router.push(`/leads?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("search", search);
          }}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Select
          defaultValue={searchParams.get("status") || "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="site_visit_scheduled">Site Visit</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select
          defaultValue={searchParams.get("source") || "all"}
          onValueChange={(v) => updateFilter("source", v)}
        >
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="36_acre">36 Acre</SelectItem>
            <SelectItem value="magicbricks">MagicBricks</SelectItem>
            <SelectItem value="housing">Housing</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select
          defaultValue={searchParams.get("temperature") || "all"}
          onValueChange={(v) => updateFilter("temperature", v)}
        >
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue placeholder="Temp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
