import { boardingPassTemplate } from "./boarding-pass";
import { premiumCliffsideTemplate } from "./premium-cliffside";
import type { WebsiteTemplate, TemplateInfo } from "@/types/website-template";

const TEMPLATES: Record<string, WebsiteTemplate> = {
  "boarding-pass": boardingPassTemplate,
  "premium-cliffside": premiumCliffsideTemplate,
};

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return TEMPLATES[id];
}

export function listTemplates(): TemplateInfo[] {
  return Object.values(TEMPLATES).map(({ defaults: _, ...info }) => info);
}

export const DEFAULT_TEMPLATE_ID = "boarding-pass";
