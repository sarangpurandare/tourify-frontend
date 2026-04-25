import { getTemplate } from "@/lib/templates";
import { BoardingPassTemplate } from "@/components/website/template-shell";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const template = getTemplate(templateId);

  if (!template) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontFamily: "var(--f-body)" }}>
        <h1>Template not found</h1>
        <p>No template exists with ID &ldquo;{templateId}&rdquo;</p>
      </div>
    );
  }

  return <BoardingPassTemplate config={template.defaults} />;
}
