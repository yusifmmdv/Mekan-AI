import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { boundedBody, requireOrigin, rateLimit } from "@/lib/security";
import { AppError } from "@/lib/errors";
import {
  editorCatalog,
  getRoomDesign,
  listRoomDesigns,
  saveRoomDesign,
} from "@/lib/room-editor";
export const runtime = "nodejs";
function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: { code: "VALIDATION", message: error.issues[0]?.message } },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: { code: "JSON", message: "JSON formatı etibarsızdır." } },
      { status: 400 },
    );
  console.error(
    JSON.stringify({
      event: "room_editor_error",
      error: error instanceof Error ? error.message : "UNKNOWN",
    }),
  );
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Dizayn əməliyyatı alınmadı." } },
    { status: 500 },
  );
}
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await rateLimit(`room-editor-read:${user.id}`, 120);
    const params = new URL(request.url).searchParams;
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(params.get("page") || 1);
    const id = params.get("id");
    const data =
      params.get("catalog") === "1"
        ? await editorCatalog({
            page,
            categoryId: params.has("categoryId")
              ? z.string().min(1).max(100).parse(params.get("categoryId"))
              : undefined,
            search: params.has("search")
              ? z.string().max(180).parse(params.get("search"))
              : undefined,
          })
        : id
          ? await getRoomDesign(user.id, z.string().min(1).max(100).parse(id))
          : await listRoomDesigns(user.id, page);
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await requireUser();
    await rateLimit(`room-editor-save:${user.id}`, 30);
    const body = await boundedBody(request, 128 * 1024);
    return NextResponse.json(
      {
        data: await saveRoomDesign(user.id, JSON.parse(body.toString("utf8"))),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
