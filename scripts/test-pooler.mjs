// Test the project-specific pooler URL (port 6543 on the same db host)
import { PrismaClient } from "@prisma/client";

const poolerUrl = "postgresql://postgres:PXyJVgFI4kfcsjhB@db.uyrfcalhxdycufhrmeyh.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1";

const p = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

try {
  const count = await p.user.count();
  console.log("✅ Pooler works! User count:", count);
} catch (e) {
  console.log("❌ Pooler failed:", e.message.split("\n")[0]);
} finally {
  await p.$disconnect();
}
