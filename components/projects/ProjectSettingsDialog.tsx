"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Project } from "@/lib/types";

export function ProjectSettingsDialog({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [githubOwner, setGithubOwner] = useState(project.github_owner ?? "");
  const [githubRepo, setGithubRepo] = useState(project.github_repo ?? "");
  const [defaultBranch, setDefaultBranch] = useState(project.default_branch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          github_owner: githubOwner || null,
          github_repo: githubRepo || null,
          default_branch: defaultBranch || "main",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update project");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-mute"
          aria-label="Project settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project settings</DialogTitle>
          <DialogDescription>
            Point this board at the GitHub repo where its code lives.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-description">Description</Label>
            <Textarea
              id="settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="settings-gh-owner">GitHub owner</Label>
              <Input
                id="settings-gh-owner"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                maxLength={100}
                placeholder="my-org"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-gh-repo">GitHub repo</Label>
              <Input
                id="settings-gh-repo"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                maxLength={100}
                placeholder="my-app"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-branch">Default branch</Label>
            <Input
              id="settings-branch"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              maxLength={100}
            />
          </div>
          {error && (
            <p className="micro text-alarm">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
