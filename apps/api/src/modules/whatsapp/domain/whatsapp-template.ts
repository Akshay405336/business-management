import { templatePlaceholders, type TemplateParameter } from './whatsapp-policy.js';

export interface TemplateDescription {
  readonly headerText: string | null;
  readonly headerFormat: string | null;
  readonly bodyText: string;
  readonly footerText: string | null;
  readonly buttons: readonly { readonly type: string; readonly text: string }[];
  readonly parameters: readonly (TemplateParameter & { readonly buttonIndex: number | null })[];
  /** Text-only templates can be sent from Techwin; media headers need a media parameter we do not collect. */
  readonly supported: boolean;
}

export interface TemplateSendParameter {
  readonly component: 'HEADER' | 'BODY' | 'BUTTON';
  readonly value: string;
  /** Set for templates that use named placeholders such as {{customer_name}}. */
  readonly name: string | null;
  readonly buttonIndex: number | null;
}

type Json = Record<string, unknown>;

const isObj = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export function describeTemplate(components: unknown): TemplateDescription {
  const list = Array.isArray(components) ? components.filter(isObj) : [];
  let headerText: string | null = null;
  let headerFormat: string | null = null;
  let bodyText = '';
  let footerText: string | null = null;
  const buttons: { type: string; text: string }[] = [];
  const parameters: (TemplateParameter & { buttonIndex: number | null })[] = [];
  let supported = true;

  for (const component of list) {
    const type = text(component.type).toUpperCase();
    if (type === 'HEADER') {
      headerFormat = text(component.format).toUpperCase() || 'TEXT';
      if (headerFormat === 'TEXT') {
        headerText = text(component.text);
        templatePlaceholders(headerText).forEach((name, index) =>
          parameters.push({ component: 'HEADER', index: index + 1, name, buttonIndex: null }),
        );
      } else {
        supported = false;
      }
    } else if (type === 'BODY') {
      bodyText = text(component.text);
      templatePlaceholders(bodyText).forEach((name, index) =>
        parameters.push({ component: 'BODY', index: index + 1, name, buttonIndex: null }),
      );
    } else if (type === 'FOOTER') {
      footerText = text(component.text) || null;
    } else if (type === 'BUTTONS') {
      const rawButtons = Array.isArray(component.buttons) ? component.buttons.filter(isObj) : [];
      rawButtons.forEach((button, buttonIndex) => {
        const buttonType = text(button.type).toUpperCase();
        buttons.push({ type: buttonType, text: text(button.text) });
        if (buttonType === 'URL') {
          templatePlaceholders(text(button.url)).forEach((name, index) =>
            parameters.push({ component: 'BUTTON', index: index + 1, name, buttonIndex }),
          );
        }
        if (buttonType === 'COPY_CODE' || buttonType === 'OTP' || buttonType === 'FLOW')
          supported = false;
      });
    }
  }
  return { headerText, headerFormat, bodyText, footerText, buttons, parameters, supported };
}

/** Pairs variable values with the template's placeholders in display order (header, body, buttons). */
export function bindTemplateParameters(
  description: TemplateDescription,
  values: readonly string[],
): TemplateSendParameter[] | null {
  if (values.length !== description.parameters.length) return null;
  return description.parameters.map((parameter, index) => ({
    component: parameter.component,
    value: values[index] ?? '',
    name: /^\d+$/.test(parameter.name) ? null : parameter.name,
    buttonIndex: parameter.buttonIndex,
  }));
}

/** Text preview of the message the customer will receive. */
export function renderTemplatePreview(
  description: TemplateDescription,
  values: readonly string[],
): string {
  let cursor = 0;
  const fill = (source: string): string =>
    source.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, () => values[cursor++] ?? '');
  const header = description.headerText ? fill(description.headerText) : '';
  const body = fill(description.bodyText);
  return [header, body, description.footerText ?? '']
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}
