// Dumps all SQLite data to scripts/db-dump.json before schema migration.
// Run with: node scripts/dump-sqlite.mjs
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const p = new PrismaClient();

const users = await p.user.findMany();
const books = await p.book.findMany();
const characters = await p.character.findMany();
const pages = await p.page.findMany();

await p.$disconnect();

const dump = { users, books, characters, pages };
writeFileSync("scripts/db-dump.json", JSON.stringify(dump, null, 2));

console.log(`Dumped: ${users.length} users, ${books.length} books, ${characters.length} chars, ${pages.length} pages`);
console.log("Saved to scripts/db-dump.json");
