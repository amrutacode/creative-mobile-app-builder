"use client"

import { authClient } from "@/lib/auth-client"
import { ProjectGallery } from "@/components/home/project-gallery"

export function ProjectGallerySection() {
  const { data: session } = authClient.useSession()
  return <ProjectGallery isSignedIn={Boolean(session?.user)} />
}
