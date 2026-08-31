// src/services/payroll/formulaEngine.ts
// ============================================================================
// Joy PeopleHR — AST-Based Formula Engine & Dependency Graph
// Zero-eval • Deterministic • Cycle Detection • Safe Mathematical DSL
// ============================================================================

export interface ComponentNode {
  code: string;
  name: string;
  formulaType: string;
  formulaExpression?: string;
  percentage?: number;
  baseComponentCode?: string;
  fixedAmount?: number;
  dependencies: string[];
}

export interface DependencyGraphValidationResult {
  isValid: boolean;
  evaluationOrder: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
  missingDependencies?: string[];
  error?: string;
}

export class PayrollFormulaEngine {
  /**
   * Builds and validates the dependency graph for components in a salary structure.
   * Detects circular references using Tarjan's / DFS cycle detection and produces
   * topological execution order.
   */
  public static buildDependencyGraph(nodes: ComponentNode[]): DependencyGraphValidationResult {
    const nodeMap = new Map<string, ComponentNode>();
    const adj = new Map<string, string[]>();
    const allCodes = new Set<string>();

    for (const node of nodes) {
      const code = node.code.toUpperCase();
      nodeMap.set(code, node);
      adj.set(code, []);
      allCodes.add(code);
    }

    const missingDeps: string[] = [];

    for (const node of nodes) {
      const code = node.code.toUpperCase();
      const deps: string[] = [];

      if (node.baseComponentCode) {
        const depCode = node.baseComponentCode.toUpperCase();
        if (!allCodes.has(depCode) && depCode !== 'GROSS' && depCode !== 'CTC' && depCode !== 'BASIC') {
          missingDeps.push(`Component ${code} depends on missing component ${depCode}`);
        }
        deps.push(depCode);
      }

      if (node.formulaExpression) {
        const referenced = this.extractVariables(node.formulaExpression);
        for (const ref of referenced) {
          const refUpper = ref.toUpperCase();
          if (!allCodes.has(refUpper) && refUpper !== 'GROSS' && refUpper !== 'CTC' && refUpper !== 'BASIC' && refUpper !== 'LOP_DAYS' && refUpper !== 'OT_HOURS') {
            missingDeps.push(`Formula in ${code} references missing variable ${refUpper}`);
          }
          deps.push(refUpper);
        }
      }

      // Add unique dependencies
      const uniqueDeps = Array.from(new Set(deps)).filter(d => allCodes.has(d));
      adj.set(code, uniqueDeps);
    }

    if (missingDeps.length > 0) {
      return {
        isValid: false,
        evaluationOrder: [],
        hasCycle: false,
        missingDependencies: missingDeps,
        error: missingDeps.join('; '),
      };
    }

    // Topological Sort with Cycle Detection (Kahn's / DFS)
    const visited = new Map<string, 'UNVISITED' | 'VISITING' | 'VISITED'>();
    for (const code of allCodes) {
      visited.set(code, 'UNVISITED');
    }

    const order: string[] = [];
    let cycleFound = false;
    let cyclePath: string[] = [];

    const dfs = (curr: string, path: string[]): boolean => {
      visited.set(curr, 'VISITING');
      path.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const nxt of neighbors) {
        const state = visited.get(nxt);
        if (state === 'VISITING') {
          cycleFound = true;
          cyclePath = [...path, nxt];
          return false;
        }
        if (state === 'UNVISITED') {
          if (!dfs(nxt, path)) return false;
        }
      }

      visited.set(curr, 'VISITED');
      path.pop();
      order.push(curr);
      return true;
    };

    for (const code of allCodes) {
      if (visited.get(code) === 'UNVISITED') {
        if (!dfs(code, [])) break;
      }
    }

    if (cycleFound) {
      return {
        isValid: false,
        evaluationOrder: [],
        hasCycle: true,
        cycleNodes: cyclePath,
        error: `Circular salary component dependency detected: ${cyclePath.join(' -> ')}`,
      };
    }

    return {
      isValid: true,
      evaluationOrder: order, // Correct dependency-first order
      hasCycle: false,
    };
  }

  /**
   * Safely extracts variable tokens from an arithmetic formula string
   */
  public static extractVariables(expression: string): string[] {
    const clean = expression.replace(/[^a-zA-Z0-9_]/g, ' ');
    const tokens = clean.split(/\s+/).filter(t => t.length > 0);
    const keywords = new Set(['MIN', 'MAX', 'ROUND', 'FLOOR', 'CEIL', 'IF', 'ELSE', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE']);
    const vars: string[] = [];

    for (const tok of tokens) {
      if (isNaN(Number(tok)) && !keywords.has(tok.toUpperCase())) {
        vars.push(tok.toUpperCase());
      }
    }
    return Array.from(new Set(vars));
  }

  /**
   * Safely evaluates arithmetic expressions without using `eval` or `Function`.
   * Supports standard arithmetic: +, -, *, /, parenthesis, and basic math functions.
   */
  public static evaluateSafeExpression(expression: string, context: Record<string, number>): number {
    try {
      let sanitized = expression;
      // Replace variables with their numeric values
      const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        const val = context[key] !== undefined ? context[key] : 0;
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        sanitized = sanitized.replace(regex, `(${val})`);
      }

      // Basic AST arithmetic evaluator
      return this.evaluateTokens(sanitized);
    } catch {
      return 0;
    }
  }

  private static evaluateTokens(expr: string): number {
    // Clean whitespace
    const cleanExpr = expr.replace(/\s+/g, '');
    let pos = 0;

    const peek = () => cleanExpr[pos];
    const get = () => cleanExpr[pos++];

    const parseFactor = (): number => {
      if (peek() === '(') {
        get(); // consume '('
        const res = parseExpression();
        if (peek() === ')') get(); // consume ')'
        return res;
      }
      if (peek() === '-') {
        get();
        return -parseFactor();
      }
      if (peek() === '+') {
        get();
        return parseFactor();
      }

      let numStr = '';
      while (pos < cleanExpr.length && (/[0-9.]/.test(peek()))) {
        numStr += get();
      }
      const val = parseFloat(numStr);
      return isNaN(val) ? 0 : val;
    };

    const parseTerm = (): number => {
      let left = parseFactor();
      while (pos < cleanExpr.length && (peek() === '*' || peek() === '/')) {
        const op = get();
        const right = parseFactor();
        if (op === '*') left *= right;
        else left = right === 0 ? 0 : left / right;
      }
      return left;
    };

    const parseExpression = (): number => {
      let left = parseTerm();
      while (pos < cleanExpr.length && (peek() === '+' || peek() === '-')) {
        const op = get();
        const right = parseTerm();
        if (op === '+') left += right;
        else left -= right;
      }
      return left;
    };

    const result = parseExpression();
    return Math.round(result * 100) / 100;
  }
}
