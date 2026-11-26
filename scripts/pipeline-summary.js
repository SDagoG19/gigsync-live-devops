#!/usr/bin/env node
/**
 * Genera un resumen en Markdown de los controles del pipeline CI/CD.
 * Se publica en el resumen de la ejecución:
 *   - Azure Pipelines: ##vso[task.uploadsummary]
 *   - GitHub Actions:  $GITHUB_STEP_SUMMARY
 *
 * Uso:
 *   node scripts/pipeline-summary.js --dc <dependency-check-report.json> [--threshold 7]
 *   node scripts/pipeline-summary.js --gitleaks <gitleaks-report.json>
 *   node scripts/pipeline-summary.js --semgrep <semgrep-report.json>
 *   node scripts/pipeline-summary.js --coverage <coverage-summary.json> [--threshold 80]
 */

const fs = require('node:fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

function readJson(path) {
  if (!path || !fs.existsSync(path)) return null;
  const content = fs.readFileSync(path, 'utf8').trim();
  return content ? JSON.parse(content) : [];
}

// Puntaje aproximado cuando la fuente (p. ej. npm audit) no trae CVSS, igual que Dependency-Check.
const UNSCORED_SEVERITY = { CRITICAL: 10, HIGH: 8.9, MODERATE: 6.9, MEDIUM: 6.9, LOW: 3.9 };

function scoreOf(vulnerability) {
  const score =
    vulnerability.cvssv4?.baseScore ||
    vulnerability.cvssv3?.baseScore ||
    vulnerability.cvssv2?.score;
  if (score) return { value: Math.round(score * 10) / 10, estimated: false };
  const severity = String(vulnerability.severity || '').toUpperCase();
  return { value: UNSCORED_SEVERITY[severity] || 0, estimated: true };
}

function dependencyCheckSummary(report, threshold) {
  if (!report) return '### OWASP Dependency-Check\n\nNo se generó el reporte (revisar el log del paso).\n';

  const dependencies = report.dependencies || [];
  const findings = [];
  for (const dependency of dependencies) {
    for (const vulnerability of dependency.vulnerabilities || []) {
      findings.push({
        dependency: dependency.fileName,
        id: vulnerability.name,
        severity: String(vulnerability.severity || 'unknown').toUpperCase(),
        score: scoreOf(vulnerability)
      });
    }
  }

  const blocking = findings.filter((f) => f.score.value >= threshold);
  const lines = [
    '### OWASP Dependency-Check',
    '',
    '| Métrica | Valor |',
    '|---|---|',
    `| Dependencias analizadas | ${dependencies.length} |`,
    `| Vulnerabilidades encontradas | ${findings.length} |`,
    `| Bloqueantes (CVSS >= ${threshold}) | ${blocking.length} |`,
    `| Resultado del control | ${blocking.length === 0 ? 'APROBADO' : 'FALLIDO'} |`,
    ''
  ];

  if (findings.length > 0) {
    lines.push('| Dependencia | Vulnerabilidad | Severidad | CVSS |', '|---|---|---|---|');
    for (const f of findings.sort((a, b) => b.score.value - a.score.value)) {
      const score = f.score.estimated ? `${f.score.value} (estimado)` : f.score.value;
      lines.push(`| ${f.dependency} | ${f.id} | ${f.severity} | ${score} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function gitleaksSummary(report) {
  if (!report) return '### Gitleaks\n\nNo se generó el reporte (revisar el log del paso).\n';

  const lines = [
    '### Gitleaks',
    '',
    '| Métrica | Valor |',
    '|---|---|',
    `| Secretos detectados | ${report.length} |`,
    `| Resultado del control | ${report.length === 0 ? 'APROBADO' : 'FALLIDO'} |`,
    ''
  ];

  if (report.length > 0) {
    lines.push('| Regla | Archivo | Línea | Commit |', '|---|---|---|---|');
    for (const leak of report) {
      lines.push(`| ${leak.RuleID} | ${leak.File} | ${leak.StartLine} | ${String(leak.Commit || '').slice(0, 8)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function semgrepSummary(report) {
  if (!report) return '### SAST (Semgrep)\n\nNo se generó el reporte (revisar el log del paso).\n';

  const results = report.results || [];
  const errors = report.errors || [];
  const lines = [
    '### SAST (Semgrep: OWASP Top 10, Express y reglas propias)',
    '',
    '| Métrica | Valor |',
    '|---|---|',
    `| Hallazgos | ${results.length} |`,
    `| Errores de análisis | ${errors.length} |`,
    `| Resultado del control | ${results.length === 0 ? 'APROBADO' : 'FALLIDO'} |`,
    ''
  ];

  if (results.length > 0) {
    lines.push('| Regla | Severidad | Archivo | Línea |', '|---|---|---|---|');
    for (const r of results) {
      const rule = String(r.check_id || '').split('.').pop();
      lines.push(`| ${rule} | ${r.extra?.severity || ''} | ${r.path} | ${r.start?.line ?? ''} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function coverageSummary(summary, threshold) {
  if (!summary) return '### Pruebas unitarias y cobertura (Jest)\n\nNo se generó coverage-summary.json.\n';

  const metrics = [
    ['Líneas', summary.total.lines.pct],
    ['Sentencias', summary.total.statements.pct],
    ['Funciones', summary.total.functions.pct],
    ['Ramas', summary.total.branches.pct]
  ];
  const lines = [
    '### Pruebas unitarias y cobertura (Jest)',
    '',
    '| Métrica | Cobertura | Umbral | Estado |',
    '|---|---|---|---|'
  ];
  for (const [name, pct] of metrics) {
    lines.push(`| ${name} | ${pct}% | ${threshold}% | ${pct >= threshold ? 'APROBADO' : 'FALLIDO'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));
const sections = [];
if ('dc' in args) sections.push(dependencyCheckSummary(readJson(args.dc), Number(args.threshold || 7)));
if ('gitleaks' in args) sections.push(gitleaksSummary(readJson(args.gitleaks)));
if ('semgrep' in args) sections.push(semgrepSummary(readJson(args.semgrep)));
if ('coverage' in args) sections.push(coverageSummary(readJson(args.coverage), Number(args.threshold || 80)));
process.stdout.write(`${sections.join('\n')}\n`);
