export const DEFAULT_TEMPLATES = [
  {
    name: "Property review check-in",
    body: "Hi {{leadName}}, just checking if you had a chance to review the property details I shared.",
    channel: "whatsapp" as const,
  },
  {
    name: "Call availability",
    body: "Hi {{leadName}}, are you available for a quick call today to discuss properties in {{preferredLocation}}?",
    channel: "whatsapp" as const,
  },
  {
    name: "New options",
    body: "Hi {{leadName}}, we have a few new options matching your budget. Should I share them?",
    channel: "whatsapp" as const,
  },
];
