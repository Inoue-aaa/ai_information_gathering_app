import { NextResponse } from "next/server";
import { summarizeArticle, SummarizeArticleError } from "@/lib/services/summarize-article";
import type { ArticleSummaryRequest, SummarizeApiResponse } from "@/lib/types/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: ArticleSummaryRequest;

  try {
    payload = (await request.json()) as ArticleSummaryRequest;
  } catch {
    return NextResponse.json<SummarizeApiResponse>(
      {
        ok: false,
        error: {
          code: "invalid_request",
          message: "要約リクエストの形式が不正です。",
        },
      },
      {
        status: 400,
      }
    );
  }

  const article = payload.article;

  if (!article?.id || (!article.title?.trim() && !article.url?.trim())) {
    return NextResponse.json<SummarizeApiResponse>(
      {
        ok: false,
        error: {
          code: "insufficient_data",
          message: "要約対象の情報が不足しています。",
        },
      },
      {
        status: 400,
      }
    );
  }

  try {
    const summary = await summarizeArticle(article);

    return NextResponse.json<SummarizeApiResponse>({
      ok: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof SummarizeArticleError) {
      return NextResponse.json<SummarizeApiResponse>(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        {
          status: error.status,
        }
      );
    }

    return NextResponse.json<SummarizeApiResponse>(
      {
        ok: false,
        error: {
          code: "generation_failed",
          message: "要約の生成に失敗しました。",
        },
      },
      {
        status: 500,
      }
    );
  }
}
