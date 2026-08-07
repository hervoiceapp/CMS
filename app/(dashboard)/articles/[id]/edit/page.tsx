import { ArticleEditor } from "@/components/article-editor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Article",
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArticleEditor articleId={id} />;
}
