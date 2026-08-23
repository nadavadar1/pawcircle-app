/** The one primary trust signal shown for a walker: community-verified
 * outranks ID-verified, which outranks nothing. Deliberately its own visual
 * weight (solid fill, not just a checkmark in body text) since trust is the
 * product's central promise, not one signal among several equal ones. */
export function TrustBadge({
  isCommunityVerified,
  badgeArea,
  idVerified,
}: {
  isCommunityVerified?: boolean;
  badgeArea?: string | null;
  idVerified?: boolean;
}) {
  if (isCommunityVerified) {
    return (
      <p className="inline-flex w-fit items-center gap-1 rounded-full border border-brass bg-brass px-2.5 py-1 text-xs font-bold text-ink">
        ✓ מאומת קהילתית{badgeArea ? ` · ${badgeArea}` : ""}
      </p>
    );
  }
  if (idVerified) {
    return (
      <p className="inline-flex w-fit items-center gap-1 rounded-full border border-sage bg-sage/15 px-2.5 py-1 text-xs font-bold text-pine">
        ✓ זהות מאומתת
      </p>
    );
  }
  return null;
}
