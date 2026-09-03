import { NextResponse } from "next/server";
import { MissingKeyError } from "./ai";

export const NO_KEY_MESSAGE = "The grown-up needs to add the ANTHROPIC_API_KEY in Vercel before book search and quizzes can work.";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function route(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof MissingKeyError) {
        return NextResponse.json({ error: NO_KEY_MESSAGE, code: "no_key" }, { status: 503 });
      }
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      const msg = e instanceof Error ? e.message : "Something went wrong";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Bad request body");
  }
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function str(v: unknown, name: string, max = 200): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${name} is required`);
  return v.trim().slice(0, max);
}
