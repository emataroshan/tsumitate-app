// app/page.tsx

import type { Metadata } from "next";
import CompareApp from "@/components/CompareApp";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item.length > 0) query.append(key, item);
      }
    }
  }

  return query.toString();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const queryString = toQueryString(resolvedSearchParams);

  const ogImageUrl = queryString ? `/api/og?${queryString}` : "/api/og";
  const pageUrl = queryString ? `/?${queryString}` : "/";

  return {
    openGraph: {
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "つみたて比較アプリ",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

export default function Home() {
  return (
    <main className="mx-auto min-w-0 max-w-7xl px-4 py-6">
      <CompareApp />
    </main>
  );
}