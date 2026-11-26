import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projects, projectAssets } from "@/db";
import { authenticateRequest } from "@/lib/server/cloudhike-auth";
import { getAssetUrl } from "@/lib/server/storage";
import { generateProjectName } from "@/lib/project-name";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const { projectId } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assets = await db
    .select()
    .from(projectAssets)
    .where(eq(projectAssets.projectId, projectId));

  const resolvedAssets = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      url: await getAssetUrl(asset.key),
    }))
  );

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name ?? generateProjectName(project.prompt),
      prompt: project.prompt,
      status: project.status,
      createdAt: project.createdAt,
    },
    assets: resolvedAssets,
  });
}
