import "server-only";

import { summaryConfig } from "@/lib/config/summary";
import type {
  ArticleSummary,
  SummaryErrorCode,
  SummaryModel,
  SummaryPromptArticle,
} from "@/lib/types/summary";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

type GeminiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export class SummarizeArticleError extends Error {
  code: SummaryErrorCode;
  status: number;

  constructor(code: SummaryErrorCode, message: string, status = 500) {
    super(message);
    this.name = "SummarizeArticleError";
    this.code = code;
    this.status = status;
  }
}

export async function summarizeArticle(
  article: SummaryPromptArticle,
  model: SummaryModel = summaryConfig.defaultModel
): Promise<ArticleSummary> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new SummarizeArticleError(
      "missing_api_key",
      "GEMINI_API_KEY が設定されていません。",
      500
    );
  }

  if (!article.id || (!article.title?.trim() && !article.url?.trim())) {
    throw new SummarizeArticleError(
      "insufficient_data",
      "要約対象の情報が不足しています。",
      400
    );
  }

  const response = await fetch(buildGeminiUrl(model, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text:
              "あなたはAI関連ニュースを日本語で短く要約するアシスタントです。2〜4文の自然文で簡潔にまとめてください。誇張や断定を避け、本文が十分でない場合は推測しすぎず、何についての記事か分かる程度に留めてください。箇条書きは使わないでください。",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildSummaryPrompt(article),
            },
          ],
        },
      ],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 220,
        temperature: 0.4,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = (await safeReadJson<GeminiErrorResponse>(response)) ?? {};
    throw mapGeminiError(response.status, errorPayload);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const summary = extractSummaryText(payload);

  if (!summary) {
    throw new SummarizeArticleError(
      "generation_failed",
      "要約の生成に失敗しました。",
      502
    );
  }

  return {
    articleId: article.id,
    summary,
    model,
    generatedAt: new Date().toISOString(),
  };
}

function buildGeminiUrl(model: SummaryModel, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function buildSummaryPrompt(article: SummaryPromptArticle) {
  const lines = [
    "以下の記事情報をもとに、日本語で短く要約してください。",
    "本文は取得していない前提です。タイトルやURLなどから分かる範囲だけで、断定しすぎないでください。",
    "",
    `記事ID: ${article.id}`,
    `種別: ${article.kind}`,
    `取得元: ${article.sourceLabel}`,
    `ソース識別子: ${article.source}`,
    `タイトル: ${article.title || "未取得"}`,
    `URL: ${article.url || "未取得"}`,
    `公開日時: ${article.publishedAt || "未取得"}`,
  ];

  if (article.hnMeta) {
    lines.push(`HNスコア: ${article.hnMeta.score}`);
    lines.push(`コメント数: ${article.hnMeta.commentsCount}`);
    lines.push(`投稿者: ${article.hnMeta.author || "未取得"}`);
  }

  return lines.join("\n");
}

function extractSummaryText(payload: GeminiGenerateContentResponse) {
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || "";
}

function mapGeminiError(status: number, payload: GeminiErrorResponse) {
  const message = payload.error?.message || "Gemini API の呼び出しに失敗しました。";
  const providerStatus = payload.error?.status;

  if (status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    return new SummarizeArticleError(
      "rate_limited",
      "現在は要約を利用できません。",
      429
    );
  }

  if (status === 503 || status === 502 || providerStatus === "UNAVAILABLE") {
    return new SummarizeArticleError(
      "provider_unavailable",
      "現在は要約を利用できません。",
      status
    );
  }

  if (status === 400) {
    return new SummarizeArticleError(
      "generation_failed",
      message,
      400
    );
  }

  return new SummarizeArticleError("generation_failed", message, status);
}

async function safeReadJson<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
