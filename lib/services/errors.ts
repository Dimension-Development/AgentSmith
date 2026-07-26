import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/types";
import { ZodError } from "zod";

export function errorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    const message =
      error.issues.map((i) => i.message).join("; ") || "Validation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  // Unexpected errors: log details server-side, never echo them to clients
  // (raw Postgres/driver messages can leak schema and internals).
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
