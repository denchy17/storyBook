// Creates (or resets) a test account so you can log straight into the app.
//
//   npm run seed
//   npm run seed -- someone@example.com "hunter2hunter2" "Some One"
//
// Idempotent: running it again just resets that user's password.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);

const email = (emailArg ?? process.env.SEED_USER_EMAIL ?? "test@fable.app")
  .trim()
  .toLowerCase();
const password =
  passwordArg ?? process.env.SEED_USER_PASSWORD ?? "fable1234";
const name = nameArg ?? process.env.SEED_USER_NAME ?? "Test Reader";

if (password.length < 8) {
  console.error("Password must be at least 8 characters (the app enforces it).");
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);

const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash, name },
  create: { email, name, passwordHash },
  select: { id: true, email: true, name: true, createdAt: true },
});

await prisma.$disconnect();

console.log("✅ User ready — sign in at /login\n");
console.log(`   email:    ${user.email}`);
console.log(`   password: ${password}`);
console.log(`   name:     ${user.name}`);
console.log(`   id:       ${user.id}`);
