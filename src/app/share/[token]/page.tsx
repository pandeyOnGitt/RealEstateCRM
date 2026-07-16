import { getPropertyByShareToken } from "@/lib/db/queries";
import { formatCurrency } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import { notFound } from "next/navigation";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";

export default async function SharePropertyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const property = await getPropertyByShareToken(token);
  if (!property) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-lg">
        <div className="bg-brand px-4 py-6 text-white">
          <BrandLogo className="h-8 rounded-md" />
          <h1 className="text-2xl font-bold mt-3">{property.title}</h1>
          <p className="opacity-90">{property.location}</p>
        </div>
        {property.property_images?.[0] && (
          <div className="relative h-64 w-full">
            <Image src={property.property_images[0].url} alt={property.title} fill className="object-cover" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <p className="text-3xl font-bold text-brand">{formatCurrency(property.price)}</p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{PROPERTY_TYPE_LABELS[property.property_type as PropertyType]}</span>
            {property.bedrooms && <span>{property.bedrooms} BHK</span>}
            {property.size_sqft && <span>{property.size_sqft} sqft</span>}
          </div>
          {property.description && <p className="text-gray-700">{property.description}</p>}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a: string) => (
                  <span key={a} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{a}</span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl bg-brand/10 p-4 text-center">
            <p className="text-sm text-gray-600">Interested in this property?</p>
            <p className="font-semibold text-brand mt-1">Contact your agent for a site visit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
