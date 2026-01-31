/**
 * Safe math expression evaluator for the calculator feature.
 * Only allows numbers, basic operators, and whitelisted Math functions.
 */

const MATH_FUNCTIONS = [
  'sqrt',
  'sin',
  'cos',
  'tan',
  'abs',
  'round',
  'floor',
  'ceil',
  'log',
  'log10',
  'exp',
  'min',
  'max'
] as const

type Token =
  | { type: 'number'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '%' | '**' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'func'; name: string }
  | { type: 'comma' }

function tokenize(input: string): Token[] {
  const s = input.replace(/\s+/g, '').replace(/\^/g, '**')
  const tokens: Token[] = []
  let i = 0

  while (i < s.length) {
    if (/[0-9.]/.test(s[i])) {
      let num = ''
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i++]
      }
      const n = parseFloat(num)
      if (Number.isNaN(n)) return []
      tokens.push({ type: 'number', value: n })
      continue
    }

    if (s.slice(i, i + 2) === '**') {
      tokens.push({ type: 'op', value: '**' })
      i += 2
      continue
    }

    if ('+-*/%'.includes(s[i])) {
      tokens.push({
        type: 'op',
        value: s[i] as Token extends { type: 'op'; value: infer V } ? V : never
      })
      i++
      continue
    }

    if (s[i] === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (s[i] === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if (s[i] === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }

    if (/[a-zA-Z]/.test(s[i])) {
      let name = ''
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        name += s[i++]
      }
      const lower = name.toLowerCase()
      if (lower === 'pi') {
        tokens.push({ type: 'number', value: Math.PI })
      } else if (lower === 'e') {
        tokens.push({ type: 'number', value: Math.E })
      } else if (MATH_FUNCTIONS.includes(lower as (typeof MATH_FUNCTIONS)[number])) {
        tokens.push({ type: 'func', name: lower })
      } else {
        return []
      }
      continue
    }

    return []
  }

  return tokens
}

let pos = 0
let tokens: Token[] = []

function peek(): Token | undefined {
  return tokens[pos]
}

function consume(): Token | undefined {
  return tokens[pos++]
}

function parseExpr(): number | null {
  let left = parseTerm()
  if (left === null) return null
  while (true) {
    const t = peek()
    if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
      consume()
      const right = parseTerm()
      if (right === null) return null
      left = t.value === '+' ? left + right : left - right
    } else {
      break
    }
  }
  return left
}

function parseTerm(): number | null {
  let left = parseFactor()
  if (left === null) return null
  while (true) {
    const t = peek()
    if (t?.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
      consume()
      const right = parseFactor()
      if (right === null) return null
      if (t.value === '*') left *= right
      else if (t.value === '/') left = right === 0 ? NaN : left / right
      else left = right === 0 ? NaN : left % right
    } else {
      break
    }
  }
  return left
}

function parseFactor(): number | null {
  const base = parsePower()
  if (base === null) return null
  const t = peek()
  if (t?.type === 'op' && t.value === '**') {
    consume()
    const exp = parseFactor()
    if (exp === null) return null
    return Math.pow(base, exp)
  }
  return base
}

function parsePower(): number | null {
  const t = peek()
  if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
    consume()
    const val = parsePower()
    if (val === null) return null
    return t.value === '-' ? -val : val
  }
  return parseAtom()
}

function parseAtom(): number | null {
  const t = consume()
  if (!t) return null
  if (t.type === 'number') return t.value
  if (t.type === 'lparen') {
    const val = parseExpr()
    if (val === null) return null
    if (peek()?.type !== 'rparen') return null
    consume()
    return val
  }
  if (t.type === 'func') {
    if (peek()?.type !== 'lparen') return null
    consume()
    const args: number[] = []
    if (peek()?.type !== 'rparen') {
      const first = parseExpr()
      if (first === null) return null
      args.push(first)
      while (peek()?.type === 'comma') {
        consume()
        const next = parseExpr()
        if (next === null) return null
        args.push(next)
      }
    }
    if (peek()?.type !== 'rparen') return null
    consume()
    return callMathFunc(t.name, args)
  }
  return null
}

function callMathFunc(name: string, args: number[]): number {
  const rad = (x: number) => (x * Math.PI) / 180
  switch (name) {
    case 'sqrt':
      return Math.sqrt(args[0])
    case 'sin':
      return Math.sin(rad(args[0]))
    case 'cos':
      return Math.cos(rad(args[0]))
    case 'tan':
      return Math.tan(rad(args[0]))
    case 'abs':
      return Math.abs(args[0])
    case 'round':
      return Math.round(args[0])
    case 'floor':
      return Math.floor(args[0])
    case 'ceil':
      return Math.ceil(args[0])
    case 'log':
      return Math.log(args[0])
    case 'log10':
      return Math.log10(args[0])
    case 'exp':
      return Math.exp(args[0])
    case 'min':
      return Math.min(...args)
    case 'max':
      return Math.max(...args)
    default:
      return NaN
  }
}

/**
 * Evaluates a safe math expression. Returns the result or null if invalid.
 */
export function evaluateMathExpression(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  tokens = tokenize(trimmed)
  if (tokens.length === 0) return null
  pos = 0
  const result = parseExpr()
  if (result === null || pos !== tokens.length) return null
  if (Number.isNaN(result) || !Number.isFinite(result)) return null
  return result
}

/**
 * Heuristic: does the input look like a math expression (starts with digit or operator, contains operators)?
 */
export function looksLikeMathExpression(input: string): boolean {
  const s = input.trim()
  if (s.length < 2) return false
  const hasDigit = /\d/.test(s)
  const hasOp =
    /[+\-*\/%\^]|\.\d|\d\./.test(s) ||
    /\b(sqrt|sin|cos|tan|abs|round|floor|ceil|log|exp|min|max|pi|e)\b/i.test(s)
  const startsReasonable =
    /^[\d.(+\-]|^sqrt|^sin|^cos|^tan|^abs|^round|^floor|^ceil|^log|^exp|^min|^max|^pi|^e/i.test(s)
  return hasDigit && hasOp && startsReasonable
}
