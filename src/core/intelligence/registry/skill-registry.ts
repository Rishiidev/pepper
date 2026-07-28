import { IntelligenceSkill } from '../skills/base-skill';
import { IntelligenceError } from '../interfaces/errors';
import { AutoTitleSkill } from '../skills/auto-title';
import { AutoTaggingSkill } from '../skills/auto-tagging';
import { WorkspaceSummarySkill } from '../skills/workspace-summary';
import { SemanticSearchSkill } from '../skills/semantic-search';
import { RelatedWorkspacesSkill } from '../skills/related-workspaces';

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills = new Map<string, IntelligenceSkill>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  private registerDefaults(): void {
    this.register(new AutoTitleSkill());
    this.register(new AutoTaggingSkill());
    this.register(new WorkspaceSummarySkill());
    this.register(new SemanticSearchSkill());
    this.register(new RelatedWorkspacesSkill());
  }

  register(skill: IntelligenceSkill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Overwriting skill: ${skill.id}`);
    }
    this.skills.set(skill.id, skill);
  }

  unregister(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  getSkill(skillId: string): IntelligenceSkill | undefined {
    return this.skills.get(skillId);
  }

  getRequiredSkill(skillId: string): IntelligenceSkill {
    const skill = this.getSkill(skillId);
    if (!skill) {
      throw new IntelligenceError('UNKNOWN', `Skill '${skillId}' is not registered in SkillRegistry`);
    }
    return skill;
  }

  getAllSkills(): IntelligenceSkill[] {
    return Array.from(this.skills.values());
  }

  clear(): void {
    this.skills.clear();
  }
}

export const skillRegistry = SkillRegistry.getInstance();
