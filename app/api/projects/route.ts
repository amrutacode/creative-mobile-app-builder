import { NextRequest, NextResponse } from "next/server";
import { db, projects, projectAssets } from "@/db";
import { authenticateRequest } from "@/lib/server/cloudhike-auth";
import { uploadProjectAsset } from "@/lib/server/storage";
import { DEFAULT_PROJECT_NAME, generateProjectName } from "@/lib/project-name";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const prompt = (formData.get("prompt") as string | null)?.trim() ?? "";
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!prompt && files.length === 0) {
    return NextResponse.json({ error: "Prompt or at least one file is required" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can attach up to ${MAX_FILES} files` }, { status: 400 });
  }
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Each file must be 10MB or smaller" }, { status: 400 });
    }
  }

  const projectId = crypto.randomUUID();
  const name = prompt ? generateProjectName(prompt) : DEFAULT_PROJECT_NAME;

  const uploaded: { key: string; fileName: string; contentType: string; size: number }[] = [];
  try {
    for (const file of files) {
      const key = `projects/${user.id}/${projectId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadProjectAsset(key, buffer, file.type);
      uploaded.push({ key, fileName: file.name, contentType: file.type, size: file.size });
    }
  } catch {
    return NextResponse.json({ error: "Failed to upload assets" }, { status: 500 });
  }

  await db.transaction(async (tx) => {
    await tx.insert(projects).values({
      id: projectId,
      userId: user.id,
      name,
      prompt,
      status: "pending",
    });

    if (uploaded.length > 0) {
      await tx.insert(projectAssets).values(
        uploaded.map((asset) => ({
          id: crypto.randomUUID(),
          projectId,
          key: asset.key,
          fileName: asset.fileName,
          contentType: asset.contentType,
          size: asset.size,
        }))
      );
    }
  });

  return NextResponse.json({ projectId, name, status: "pending" });
}
