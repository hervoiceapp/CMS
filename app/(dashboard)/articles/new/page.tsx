import { ArticleEditor } from "@/components/article-editor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Article",
};

export default function NewArticlePage() {
  return <ArticleEditor />;
}
