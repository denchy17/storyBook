// Verify PDF export + authenticated file serving against an existing READY book.
// Run: node --env-file=.env scripts/test-pdf.mjs

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const base = "http://localhost:3000";

const book = await prisma.book.findFirst({
  where: { status: "READY" },
  orderBy: { updatedAt: "desc" },
});
if (!book) {
  console.log("No READY book found");
  process.exit(0);
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const token = await new SignJWT({ sub: book.userId })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
const cookie = `sb_session=${token}`;

// Book details -> asset URLs
let res = await fetch(`${base}/api/books/${book.id}`, { headers: { cookie } });
const { book: dto } = await res.json();
console.log("book:", res.status, dto.title, "pages:", dto.pages.length);

const cover = await fetch(base + dto.coverUrl, { headers: { cookie } });
console.log("cover:", cover.status, cover.headers.get("content-type"));

const img = await fetch(base + dto.pages[0].imageUrl, { headers: { cookie } });
console.log("page0 image:", img.status, img.headers.get("content-type"));

const audio = await fetch(base + dto.pages[0].audioUrl, { headers: { cookie } });
console.log("page0 audio:", audio.status, audio.headers.get("content-type"));

// Unauthorized check
const noauth = await fetch(base + dto.coverUrl);
console.log("cover (no auth):", noauth.status);

// PDF
const pdf = await fetch(`${base}/api/books/${book.id}/pdf`, { headers: { cookie } });
console.log("pdf:", pdf.status, pdf.headers.get("content-type"));
if (pdf.ok) {
  const buf = Buffer.from(await pdf.arrayBuffer());
  writeFileSync("storage/_test-export.pdf", buf);
  console.log("pdf saved:", Math.round(buf.length / 1024), "KB, header:", buf.slice(0, 5).toString());
}

await prisma.$disconnect();
