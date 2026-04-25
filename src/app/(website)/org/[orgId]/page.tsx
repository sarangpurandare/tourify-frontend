import { getTemplate, DEFAULT_TEMPLATE_ID } from "@/lib/templates";
import { BoardingPassTemplate } from "@/components/website/template-shell";

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // TODO: fetch org's chosen template + custom config from API
  // For now, render the default template with dummy data
  const template = getTemplate(DEFAULT_TEMPLATE_ID);
  if (!template) return <div>Template not found</div>;

  return <BoardingPassTemplate config={template.defaults} />;
}
