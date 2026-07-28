import { PepperSession } from '../types/session';

export interface WorkspaceHealth {
  score: number; // 0-100
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  color: string;
  checks: Array<{ label: string; passed: boolean }>;
  recommendations: string[];
}

export class HealthEngine {
  calculateHealth(session: PepperSession): WorkspaceHealth {
    const checks = [
      {
        label: 'Named Workspace',
        passed: !!session.name && !session.name.toLowerCase().startsWith('saved window'),
      },
      {
        label: 'Assigned Project',
        passed: !!session.projectName && session.projectName !== 'General',
      },
      {
        label: 'AI Tags Generated',
        passed: !!(session.tags && session.tags.length > 0),
      },
      {
        label: 'Executive Summary',
        passed: !!session.summary,
      },
      {
        label: 'Multi-Tab Context',
        passed: session.tabCount >= 2,
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    let status: WorkspaceHealth['status'] = 'NEEDS_ATTENTION';
    let color = '#EF4444'; // Red

    if (score >= 80) {
      status = 'EXCELLENT';
      color = '#10B981'; // Green
    } else if (score >= 60) {
      status = 'GOOD';
      color = '#F59E0B'; // Amber
    }

    const recommendations: string[] = [];
    if (!checks[0].passed) recommendations.push('Generate AI title');
    if (!checks[1].passed) recommendations.push('Assign to a Project');
    if (!checks[2].passed) recommendations.push('Generate AI tags');
    if (!checks[3].passed) recommendations.push('Generate AI summary');

    return {
      score,
      status,
      color,
      checks,
      recommendations,
    };
  }
}

export const healthEngine = new HealthEngine();
