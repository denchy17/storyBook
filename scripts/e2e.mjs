// End-to-end pipeline test against the running dev server.
// Run: node scripts/e2e.mjs

const base = "http://localhost:3000";
let cookie = "";

function saveCookie(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) cookie = c.split(";")[0];
}

async function main() {
  const email = `test_${Date.now()}@example.com`;

  let res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email, password: "password123" }),
  });
  saveCookie(res);
  console.log("register:", res.status, "cookie:", cookie ? "yes" : "no");
  if (!res.ok) return console.log(await res.text());

  const payload = {
    bookType: "kids",
    language: "English",
    title: "The Night We Flew",
    dedication: "For Mia.",
    styleHint: "Soft Storybook Watercolor",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    characters: [
      { role: "child", name: "Mia", age: "6", gender: "girl", description: "Curly brown hair, gap-toothed smile, loves dinosaurs." },
      { role: "parent", name: "Daniel", age: "35", gender: "man", description: "Short dark beard, kind eyes, wears a green jacket." },
    ],
    details: [
      { question: "What do these two love doing together?", answer: "Stargazing from the rooftop." },
    ],
  };
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));

  res = await fetch(`${base}/api/books`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const created = await res.json();
  console.log("create:", res.status, created);
  if (!res.ok) return;
  const id = created.id;

  const start = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`${base}/api/books/${id}`, { headers: { cookie } });
    const { book } = await r.json();
    const mins = ((Date.now() - start) / 60000).toFixed(1);
    console.log(`[${mins}m] ${book.status} ${book.progress}% - ${book.stage}`);
    if (book.status === "READY") {
      const pagesWithImg = book.pages.filter((p) => p.imageUrl).length;
      const pagesWithAudio = book.pages.filter((p) => p.audioUrl).length;
      console.log(`DONE: ${book.pages.length} pages, ${pagesWithImg} images, ${pagesWithAudio} audio, cover=${!!book.coverUrl}`);
      const pdf = await fetch(`${base}/api/books/${id}/pdf`, { headers: { cookie } });
      console.log("pdf:", pdf.status, pdf.headers.get("content-type"), pdf.headers.get("content-length"));
      break;
    }
    if (book.status === "FAILED") {
      console.log("FAILED:", book.errorMessage);
      break;
    }
    if (Date.now() - start > 12 * 60000) {
      console.log("timeout");
      break;
    }
  }
}

main().catch((e) => console.error(e));
