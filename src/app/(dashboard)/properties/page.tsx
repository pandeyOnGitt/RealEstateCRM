import { requireUser } from "@/lib/auth";
import { getProperties } from "@/lib/db/queries";
import { MobileHeader } from "@/components/layout/sidebar";
import { EmptyState } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types";
import Image from "next/image";

function PropertyCard({ property }: { property: Property & { property_images?: { url: string; is_primary: boolean }[] } }) {
  const image = property.property_images?.find((i) => i.is_primary)?.url ||
    property.property_images?.[0]?.url ||
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400";

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="relative h-40 w-full bg-muted">
          <Image src={image} alt={property.title} fill className="object-cover" />
          <Badge className="absolute right-2 top-2 capitalize">{property.availability}</Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold">{property.title}</h3>
          <p className="text-sm text-muted-foreground">{property.location}</p>
          <p className="mt-1 font-bold text-primary">{formatCurrency(property.price)}</p>
          <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
            <span>{PROPERTY_TYPE_LABELS[property.property_type]}</span>
            {property.bedrooms && <span>{property.bedrooms} BHK</span>}
            {property.size_sqft && <span>{property.size_sqft} sqft</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const properties = await getProperties(user.organization_id, {
    search: params.search,
    type: params.type,
    status: params.status,
  });

  return (
    <div>
      <MobileHeader title="Properties" />
      <div className="hidden md:flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Button asChild><Link href="/properties/new"><Plus className="mr-2 h-4 w-4" />Add Property</Link></Button>
      </div>
      <div className="p-4">
        <div className="mb-4 flex justify-end md:hidden">
          <Button asChild size="sm"><Link href="/properties/new"><Plus className="mr-1 h-4 w-4" />Add</Link></Button>
        </div>
        {properties.length === 0 ? (
          <EmptyState title="No properties" description="Add your first property listing." action={<Button asChild><Link href="/properties/new">Add Property</Link></Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
