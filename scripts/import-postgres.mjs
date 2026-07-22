// Imports dumped SQLite data into Supabase PostgreSQL.
// Run AFTER: prisma generate + prisma db push
// Usage: node scripts/import-postgres.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const dump = JSON.parse(readFileSync("scripts/db-dump.json", "utf8"));
const p = new PrismaClient();

console.log("Importing users...");
for (const u of dump.users) {
  await p.user.upsert({
    where: { id: u.id },
    update: {},
    create: {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      createdAt: new Date(u.createdAt),
    },
  });
}
console.log(`  ✓ ${dump.users.length} users`);

console.log("Importing books...");
for (const b of dump.books) {
  await p.book.upsert({
    where: { id: b.id },
    update: {},
    create: {
      id: b.id,
      userId: b.userId,
      title: b.title,
      dedication: b.dedication,
      bookType: b.bookType,
      language: b.language,
      inputJson: b.inputJson,
      styleName: b.styleName,
      stylePrompt: b.stylePrompt,
      status: b.status,
      stage: b.stage,
      progress: b.progress,
      errorMessage: b.errorMessage,
      referenceImagePath: b.referenceImagePath,
      coverImagePath: b.coverImagePath,
      voiceId: b.voiceId,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    },
  });
}
console.log(`  ✓ ${dump.books.length} books`);

console.log("Importing characters...");
for (const c of dump.characters) {
  await p.character.upsert({
    where: { id: c.id },
    update: {},
    create: {
      id: c.id,
      bookId: c.bookId,
      role: c.role,
      name: c.name,
      age: c.age,
      gender: c.gender,
      description: c.description,
      photoPath: c.photoPath,
      createdAt: new Date(c.createdAt),
    },
  });
}
console.log(`  ✓ ${dump.characters.length} characters`);

console.log("Importing pages...");
for (const pg of dump.pages) {
  await p.page.upsert({
    where: { id: pg.id },
    update: {},
    create: {
      id: pg.id,
      bookId: pg.bookId,
      index: pg.index,
      text: pg.text,
      imagePrompt: pg.imagePrompt,
      imagePath: pg.imagePath,
      audioPath: pg.audioPath,
      status: pg.status,
      createdAt: new Date(pg.createdAt),
    },
  });
}
console.log(`  ✓ ${dump.pages.length} pages`);

await p.$disconnect();
console.log("\n✅ All data imported to Supabase PostgreSQL.");
