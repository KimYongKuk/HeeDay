import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what = '항목') => new ApiError(404, 'NOT_FOUND', `${what}을(를) 찾을 수 없습니다.`);

type Params = Record<string, string | string[] | undefined>;
type Ctx<P extends Params> = { params: Promise<P> };
type Handler<P extends Params> = (req: Request, ctx: Ctx<P>) => Promise<Response>;

export function route<P extends Params = Params>(fn: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: 'VALIDATION', message: '입력값이 올바르지 않습니다.', issues: err.issues } },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json(
        { error: { code: 'INTERNAL', message: '서버 오류가 발생했습니다.' } },
        { status: 500 },
      );
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, 'BAD_JSON', '요청 본문이 JSON이 아닙니다.');
  }
  return schema.parse(raw);
}

export async function idParam<P extends Params>(ctx: Ctx<P>, key: keyof P & string = 'id'): Promise<number> {
  const params = await ctx.params;
  const n = Number(params[key]);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, 'BAD_ID', '잘못된 ID입니다.');
  return n;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function noContent() {
  return new Response(null, { status: 204 });
}
