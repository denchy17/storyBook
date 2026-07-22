import type { Book, Character, Page } from "@prisma/client";

export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/files/${key}`;
}

export type BookDTO = ReturnType<typeof serializeBook>;

export function serializeBook(
  book: Book & { pages?: Page[]; characters?: Character[] },
) {
  return {
    id: book.id,
    title: book.title,
    dedication: book.dedication,
    bookType: book.bookType,
    language: book.language,
    styleName: book.styleName,
    status: book.status,
    stage: book.stage,
    progress: book.progress,
    errorMessage: book.errorMessage,
    coverUrl: fileUrl(book.coverImagePath),
    referenceUrl: fileUrl(book.referenceImagePath),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    characters: (book.characters ?? []).map((c) => ({
      id: c.id,
      role: c.role,
      name: c.name,
    })),
    pages: (book.pages ?? [])
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((p) => ({
        index: p.index,
        text: p.text,
        imageUrl: fileUrl(p.imagePath),
        audioUrl: fileUrl(p.audioPath),
        status: p.status,
      })),
  };
}
