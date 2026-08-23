/** Builds a wa.me link from an Israeli local number (05XXXXXXXX, possibly
 * with spaces/dashes) plus a pre-filled message. Returns null for an empty
 * or unusable number rather than producing a dead link. */
export function whatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
