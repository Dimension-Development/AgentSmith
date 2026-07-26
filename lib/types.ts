export const TICKET_STATUSES = [
  "backlog",
  "open",
  "in_progress",
  "pr_review",
  "complete",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TYPES = ["feature", "bug"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "Backlog",
  open: "Open",
  in_progress: "In Progress",
  pr_review: "PR Review",
  complete: "Complete",
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  github_owner: string | null;
  github_repo: string | null;
  default_branch: string;
  created_at: string;
};

export type Ticket = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  assigned_to: string | null;
  claimed_at: string | null;
  agent_name: string | null;
  agent_run_id: string | null;
  harness_name: string | null;
  branch_name: string | null;
  github_pr_number: number | null;
  github_pr_url: string | null;
  github_pr_state: string | null;
  github_head_sha: string | null;
  github_merge_commit_sha: string | null;
  merged_at: string | null;
  checklist: ChecklistItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  comment_count?: number;
};

export type Comment = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_system: boolean;
  created_at: string;
};

export type Activity = {
  id: string;
  ticket_id: string;
  project_id: string;
  actor_id: string | null;
  activity_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TicketDetail = Ticket & {
  comments: Comment[];
  activity: Activity[];
};

export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
