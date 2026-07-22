import { clearSession } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function POST() {
  try {
    await clearSession();
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
