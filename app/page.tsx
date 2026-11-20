import { Sparkles } from "lucide-react"

import { SiteHeader } from "@/components/home/site-header"
import { PromptComposer } from "@/components/home/prompt-composer"
import { ProjectGallerySection } from "@/components/home/project-gallery-section"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-sm font-medium text-indigo-700">
            <Sparkles className="size-3.5" />
            AI-powered mobile app builder
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Turn your ideas into{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              mobile apps
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Describe the app you want, attach a sketch or reference, and let AppForge
            generate a working mobile app in minutes.
          </p>

          <div className="mt-10">
            <PromptComposer />
          </div>
        </section>

        <ProjectGallerySection />
      </main>
    </div>
  )
}
