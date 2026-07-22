import { getSessionUser } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await getSessionUser();
    return json({ user });
  } catch (err) {
    return handleError(err);
  }
}
