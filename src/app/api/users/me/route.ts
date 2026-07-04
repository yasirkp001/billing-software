import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";
import { signToken, setAuthCookie } from "@/lib/auth";

/** Max size of the stored data URL (~700 KB of base64 ≈ a small photo). */
const MAX_IMAGE_CHARS = 700_000;

/**
 * Update the currently signed-in user's own account — profile photo, name and
 * email. Any authenticated user (admin or staff) may update their own record;
 * there is no cross-user access here. When name/email change, the auth cookie
 * is re-issued so the session reflects the new values immediately.
 */
export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();

    const data: { image?: string; name?: string; email?: string } = {};

    // `image` may be a data URL to set, or "" to remove the photo.
    if ("image" in body) {
      const image = String(body.image ?? "");
      if (image !== "" && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(image)) {
        return fail("Image must be a PNG, JPEG, WebP or GIF file.");
      }
      if (image.length > MAX_IMAGE_CHARS) {
        return fail("Image is too large. Please choose a smaller photo.");
      }
      data.image = image;
    }

    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (!name) return fail("Name cannot be empty.");
      data.name = name;
    }

    if ("email" in body) {
      const email = String(body.email ?? "").toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail("Enter a valid email address.");
      }
      data.email = email;
    }

    if (Object.keys(data).length === 0) {
      return fail("Nothing to update.");
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, image: true },
    });

    // Keep the session cookie in sync when identity fields change.
    if ("name" in data || "email" in data) {
      const token = await signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "admin" | "staff",
      });
      await setAuthCookie(token);
    }

    return ok(user);
  } catch (err) {
    return handleError(err); // P2002 → email already in use
  }
}
