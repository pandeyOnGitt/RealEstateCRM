/**
 * EstateVoxa CRM Seed Script
 * Run: npm run db:seed
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEMO_PASSWORD = "demo123456";

async function seed() {
  console.log("🌱 Seeding EstateVoxa CRM...\n");

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert({ name: "Demo Realty Pvt Ltd", slug: "demo-realty" }, { onConflict: "slug" })
    .select()
    .single();

  if (orgErr) {
    console.error("Org error:", orgErr);
    return;
  }

  const orgId = org.id;
  console.log("✓ Organization:", org.name);

  const users = [
    { email: "admin@estatevoxa.demo", name: "Rajesh Kumar", role: "admin", phone: "+919876543210" },
    { email: "agent1@estatevoxa.demo", name: "Priya Sharma", role: "sales_agent", phone: "+919876543211" },
    { email: "agent2@estatevoxa.demo", name: "Amit Singh", role: "sales_agent", phone: "+919876543212" },
    { email: "field@estatevoxa.demo", name: "Suresh Patel", role: "field_executive", phone: "+919876543213" },
    { email: "social@estatevoxa.demo", name: "Neha Gupta", role: "social_media_manager", phone: "+919876543214" },
  ];

  const profileIds: Record<string, string> = {};

  for (const u of users) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);

    let userId = found?.id;
    if (!userId) {
      const { data: authUser, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        console.warn(`  ⚠ User ${u.email}:`, error.message);
        continue;
      }
      userId = authUser.user.id;
    }

    await supabase.from("profiles").upsert({
      id: userId,
      organization_id: orgId,
      email: u.email,
      full_name: u.name,
      phone: u.phone,
      role: u.role,
      is_active: true,
    });
    profileIds[u.role === "sales_agent" ? (u.email.includes("agent1") ? "agent1" : "agent2") : u.role] = userId!;
    console.log(`✓ User: ${u.name} (${u.role})`);
  }

  const webhookSecret = randomBytes(32).toString("hex");
  await supabase.from("integration_settings").upsert({
    organization_id: orgId,
    assignment_mode: "round_robin",
    webhook_secret: webhookSecret,
  });
  console.log("✓ Integration settings (webhook secret:", webhookSecret.slice(0, 8) + "...)");

  const templates = [
    { name: "Property review", body: "Hi {{leadName}}, just checking if you had a chance to review the property details I shared.", channel: "whatsapp" },
    { name: "Call availability", body: "Hi {{leadName}}, are you available for a quick call today to discuss properties in {{preferredLocation}}?", channel: "whatsapp" },
    { name: "New options", body: "Hi {{leadName}}, we have a few new options matching your budget. Should I share them?", channel: "whatsapp" },
  ];
  for (const t of templates) {
    await supabase.from("followup_templates").upsert({ organization_id: orgId, ...t, is_default: true });
  }

  const sources = ["36_acre", "magicbricks", "housing", "facebook", "website", "manual"];
  const statuses = ["new", "contacted", "interested", "site_visit_scheduled", "negotiation"];
  const names = ["Rahul Sharma", "Anita Desai", "Vikram Mehta", "Sneha Reddy", "Arjun Nair", "Kavita Joshi", "Deepak Verma", "Meera Iyer", "Rohan Kapoor", "Pooja Malhotra", "Sanjay Gupta", "Lakshmi Rao", "Karan Malhotra", "Divya Chopra", "Manish Agarwal", "Ritu Saxena", "Harsh Patel", "Nisha Khanna", "Gaurav Bansal", "Shweta Sinha"];
  const locations = ["Gurgaon", "Noida", "Delhi", "Mumbai", "Bangalore", "Pune"];
  const agentIds = [profileIds.agent1, profileIds.agent2].filter(Boolean);

  const leadIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const { data: lead } = await supabase.from("leads").insert({
      organization_id: orgId,
      full_name: names[i],
      phone: `+919${String(800000000 + i).slice(1)}`,
      email: `${names[i].split(" ")[0].toLowerCase()}@example.com`,
      source: sources[i % sources.length],
      property_type: ["apartment", "villa", "plot"][i % 3],
      budget_min: 5000000 + i * 500000,
      budget_max: 10000000 + i * 500000,
      preferred_location: locations[i % locations.length],
      status: statuses[i % statuses.length],
      temperature: i < 3 ? "hot" : i < 8 ? "warm" : "cold",
      assigned_agent_id: agentIds[i % agentIds.length],
      notes: i % 4 === 0 ? "Interested in 3BHK near metro" : null,
    }).select().single();
    if (lead) leadIds.push(lead.id);
  }
  console.log(`✓ ${leadIds.length} leads`);

  const propertyTitles = [
    "Skyline Residency 3BHK", "Green Valley Villa", "Metro Heights Apartment",
    "Palm Grove Plot", "Royal Enclave 4BHK", "Sunrise Towers 2BHK",
    "Lake View Villa", "City Center Commercial", "Garden Estate Plot",
    "Premium Heights 3BHK",
  ];
  const images = [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
  ];

  for (let i = 0; i < 10; i++) {
    const { data: prop } = await supabase.from("properties").insert({
      organization_id: orgId,
      title: propertyTitles[i],
      location: locations[i % locations.length],
      property_type: ["apartment", "villa", "plot", "commercial"][i % 4],
      price: 7500000 + i * 1500000,
      size_sqft: 1200 + i * 200,
      bedrooms: 2 + (i % 3),
      bathrooms: 2 + (i % 2),
      availability: i < 8 ? "available" : "sold",
      description: `Beautiful ${propertyTitles[i]} with modern amenities.`,
      amenities: ["Parking", "Gym", "Swimming Pool", "Security"].slice(0, 2 + (i % 3)),
    }).select().single();

    if (prop) {
      await supabase.from("property_images").insert({
        property_id: prop.id,
        organization_id: orgId,
        url: images[i % images.length],
        is_primary: true,
        sort_order: 0,
      });
    }
  }
  console.log("✓ 10 properties with images");

  for (let i = 0; i < 5; i++) {
    await supabase.from("calls").insert({
      organization_id: orgId,
      lead_id: leadIds[i],
      agent_id: agentIds[i % agentIds.length],
      status: "completed",
      outcome: i < 4 ? "connected" : "no_answer",
      duration_seconds: 30 + i * 15,
      started_at: new Date(Date.now() - i * 86400000).toISOString(),
      ended_at: new Date(Date.now() - i * 86400000 + 60000).toISOString(),
      metadata: { dry_run: true },
    });
  }
  console.log("✓ Sample calls");

  for (let i = 0; i < 8; i++) {
    await supabase.from("followups").insert({
      organization_id: orgId,
      lead_id: leadIds[i + 2],
      assigned_to: agentIds[i % agentIds.length],
      type: "whatsapp",
      status: i < 5 ? "pending" : "completed",
      scheduled_at: new Date(Date.now() + (i - 3) * 3600000).toISOString(),
      message_body: templates[i % 3].body.replace("{{leadName}}", names[i + 2]).replace("{{preferredLocation}}", locations[i % locations.length]),
    });
  }
  console.log("✓ Sample follow-ups");

  const today = new Date().toISOString().split("T")[0];
  for (const [key, id] of Object.entries(profileIds)) {
    if (["agent1", "agent2", "field_executive", "admin"].includes(key)) {
      await supabase.from("attendance").upsert({
        organization_id: orgId,
        user_id: id,
        date: today,
        check_in_time: new Date().toISOString(),
        check_in_latitude: 28.4595 + Math.random() * 0.01,
        check_in_longitude: 77.0266 + Math.random() * 0.01,
        status: key === "agent2" ? "late" : "present",
      }, { onConflict: "user_id,date" });
    }
  }
  console.log("✓ Sample attendance");

  const postTypes = ["instagram_post", "instagram_reel", "facebook_post", "linkedin_post", "story"];
  for (let i = 0; i < 5; i++) {
    await supabase.from("social_posts").insert({
      organization_id: orgId,
      title: `Property showcase ${i + 1}`,
      post_type: postTypes[i],
      caption: `🏠 Check out our latest listing in ${locations[i]}! #RealEstate`,
      status: ["idea", "draft", "scheduled", "published", "draft"][i],
      scheduled_at: new Date(Date.now() + i * 86400000).toISOString(),
      assigned_to: profileIds.social_media_manager || profileIds.admin,
    });
  }
  console.log("✓ Sample social posts");

  for (let i = 0; i < 10; i++) {
    await supabase.from("activities").insert({
      organization_id: orgId,
      lead_id: leadIds[i],
      user_id: agentIds[i % agentIds.length],
      type: ["lead_created", "call_made", "note_added", "property_shared"][i % 4],
      title: ["Lead created", "Call completed", "Note added", "Property shared"][i % 4],
      description: `Activity for ${names[i]}`,
    });
  }
  console.log("✓ Sample activities");

  console.log("\n✅ Seed complete!\n");
  console.log("Demo accounts (password: demo123456):");
  users.forEach((u) => console.log(`  ${u.email} — ${u.role}`));
  console.log(`\nWebhook secret: ${webhookSecret}`);
}

seed().catch(console.error);
