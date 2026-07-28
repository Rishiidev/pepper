import { PepperTab } from '../core/types/session';
import { PepperSettings } from '../core/types/settings';

export interface TemplateContext {
  tabs: PepperTab[];
  projectName?: string;
  customName?: string;
}

export class SessionNamingSkill {
  renderTemplate(template: string, ctx: TemplateContext): string {
    if (ctx.customName && ctx.customName.trim()) {
      return ctx.customName.trim();
    }

    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const dateStr = `${month} ${day}`;

    const timeStr = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const weekdayStr = now.toLocaleString('en-US', { weekday: 'long' });
    const tabCountStr = `${ctx.tabs.length} Tab${ctx.tabs.length !== 1 ? 's' : ''}`;
    const projectStr = ctx.projectName || this.inferProjectFromTabs(ctx.tabs);

    let result = template || '{{date}} — {{time}}';
    result = result.replace(/\{\{\s*date\s*\}\}/g, dateStr);
    result = result.replace(/\{\{\s*time\s*\}\}/g, timeStr);
    result = result.replace(/\{\{\s*weekday\s*\}\}/g, weekdayStr);
    result = result.replace(/\{\{\s*tab_count\s*\}\}/g, tabCountStr);
    result = result.replace(/\{\{\s*project\s*\}\}/g, projectStr);

    return result;
  }

  private inferProjectFromTabs(tabs: PepperTab[]): string {
    if (!tabs || tabs.length === 0) return 'General';
    try {
      const firstUrl = new URL(tabs[0].url);
      const host = firstUrl.hostname.replace(/^www\./, '');
      const parts = host.split('.');
      if (parts.length >= 2) {
        const domainName = parts[parts.length - 2];
        return domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
      return host;
    } catch {
      return 'General';
    }
  }

  generateDefaultName(settings: PepperSettings, tabs: PepperTab[], customInput?: string): string {
    if (settings.namingMode === 'ask' && customInput) {
      return customInput.trim();
    }
    return this.renderTemplate(settings.nameTemplate, {
      tabs,
      projectName: settings.defaultProjectName,
      customName: customInput,
    });
  }
}

export const sessionNamingSkill = new SessionNamingSkill();
