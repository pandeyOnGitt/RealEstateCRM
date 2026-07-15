import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPropertyById } from "@/lib/db/queries";
import { formatCurrency, getAppUrl } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const property = await getPropertyById(id, user.organization_id);
  if (!property) notFound();

  const shareLink = `${getAppUrl()}/share/${property.share_token}`;

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/properties"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{property.title}</h1>
      </div>
      {property.property_images?.[0] && (
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-2xl">
          <Image src={property.property_images[0].url} alt={property.title} fill className="object-cover" />
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <Badge className="capitalize">{property.availability}</Badge>
        <Badge variant="outline">{PROPERTY_TYPE_LABELS[property.property_type as PropertyType]}</Badge>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p className="text-2xl font-bold text-primary">{formatCurrency(property.price)}</p>
          <p><span className="text-muted-foreground">Location:</span> {property.location}</p>
          {property.address && <p><span className="text-muted-foreground">Address:</span> {property.address}</p>}
          {property.bedrooms && <p><span className="text-muted-foreground">Bedrooms:</span> {property.bedrooms}</p>}
          {property.size_sqft && <p><span className="text-muted-foreground">Size:</span> {property.size_sqft} sqft</p>}
          {property.description && <p className="pt-2">{property.description}</p>}
          <p className="pt-2 text-xs text-muted-foreground break-all">Share link: {shareLink}</p>
        </CardContent>
      </Card>
    </div>
  );
}
