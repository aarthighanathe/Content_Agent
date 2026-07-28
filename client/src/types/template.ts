// Mirrors server/src/db/schema.ts's `templates` table row shape (see also
// server/src/schemas/templates.ts for createTemplateSchema, the POST /templates input).
export interface Template {
  id: string;
  name: string;
  platform: string;
  topic?: string | null;
  hookStyle?: string | null;
  structure?: string | null;
  ctaPattern?: string | null;
  contentSample?: string | null;
  createdAt: string;
}

export interface TemplateListResponse {
  templates: Template[];
}

export interface SaveTemplateInput {
  name: string;
  platform: string;
  topic?: string;
  hookStyle?: string;
  structure?: string;
  ctaPattern?: string;
  contentSample?: string | null;
}

export interface SaveTemplateResponse {
  template: Template;
}

export interface RenameTemplateResponse {
  template: Template;
}
