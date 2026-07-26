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
  console.error(error);
  const message =
    error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
