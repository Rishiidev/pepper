import { IntelligenceSkill } from '../skills/base-skill';
import { IntelligenceError } from '../interfaces/errors';

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills = new Map<string, IntelligenceSkill>();

  private constructor() {}

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
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
