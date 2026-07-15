"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSocialPostAction, generateCaptionAction, publishSocialPostAction } from "@/lib/actions";
import { MobileHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { SocialPost } from "@/lib/types";

export function SocialClient({ posts }: { posts: SocialPost[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await createSocialPostAction({
      title: form.get("title"),
      post_type: form.get("post_type"),
      caption,
      status: form.get("status") || "draft",
      scheduled_at: form.get("scheduled_at") || undefined,
    });
    setShowForm(false);
    setLoading(false);
    router.refresh();
  }

  async function handleAICaption() {
    const result = await generateCaptionAction("Luxury 3BHK Apartment", "Gurgaon", "instagram_post");
    if (result.caption) setCaption(result.caption);
  }

  return (
    <div>
      <MobileHeader title="Social Media" />
      <div className="hidden md:flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Social Media</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />New Post</Button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-end md:hidden">
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />New</Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Create Post</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input name="title" placeholder="Post title" required />
                <Select name="post_type" defaultValue="instagram_post">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram_reel">Instagram Reel</SelectItem>
                    <SelectItem value="instagram_post">Instagram Post</SelectItem>
                    <SelectItem value="facebook_post">Facebook Post</SelectItem>
                    <SelectItem value="linkedin_post">LinkedIn Post</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption..." rows={4} />
                  <Button type="button" size="sm" variant="ghost" className="absolute right-2 top-2" onClick={handleAICaption}>
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <Select name="status" defaultValue="draft">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="scheduled_at" type="datetime-local" />
                <Button type="submit" className="w-full" disabled={loading}>Save Post</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{post.title}</h3>
                  <Badge className="capitalize">{post.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-1">{post.post_type.replace(/_/g, " ")}</p>
                {post.caption && <p className="mt-2 text-sm line-clamp-3">{post.caption}</p>}
                {post.scheduled_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Scheduled: {format(new Date(post.scheduled_at), "MMM d, h:mm a")}
                  </p>
                )}
                {post.status === "scheduled" && (
                  <Button size="sm" className="mt-3" variant="outline" onClick={async () => {
                    await publishSocialPostAction(post.id);
                    router.refresh();
                  }}>Publish via Webhook</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
