interface AnsiSegment {
  text: string
  fgColor: string | null
  bgColor: string | null
  bold: boolean
  italic: boolean
  underline: boolean
}

/**
 * Converts ANSI escape codes to HTML with Tailwind classes
 * Supports basic color codes (30-37, 40-47) and bright colors (90-97, 100-107)
 */
export const parseAnsi = (input: string): AnsiSegment[] => {
  const segments: AnsiSegment[] = []
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[(\d+(?:;\d+)*)m/g

  let lastIndex = 0
  let currentSegment: AnsiSegment = {
    text: '',
    fgColor: null,
    bgColor: null,
    bold: false,
    italic: false,
    underline: false
  }

  let match
  while ((match = ansiRegex.exec(input)) !== null) {
    // Add text before this ANSI code
    if (match.index > lastIndex) {
      currentSegment.text = input.slice(lastIndex, match.index)
      segments.push({ ...currentSegment })
    }

    // Parse ANSI codes
    const codes = match[1].split(';').map(Number)

    for (const code of codes) {
      switch (code) {
        case 0: // Reset
          currentSegment = {
            text: '',
            fgColor: null,
            bgColor: null,
            bold: false,
            italic: false,
            underline: false
          }
          break
        case 1: // Bold
          currentSegment.bold = true
          break
        case 3: // Italic
          currentSegment.italic = true
          break
        case 4: // Underline
          currentSegment.underline = true
          break
        // Standard foreground colors (30-37)
        case 30:
          currentSegment.fgColor = 'text-black'
          break
        case 31:
          currentSegment.fgColor = 'text-red-500'
          break
        case 32:
          currentSegment.fgColor = 'text-green-500'
          break
        case 33:
          currentSegment.fgColor = 'text-yellow-500'
          break
        case 34:
          currentSegment.fgColor = 'text-blue-500'
          break
        case 35:
          currentSegment.fgColor = 'text-purple-500'
          break
        case 36:
          currentSegment.fgColor = 'text-cyan-500'
          break
        case 37:
          currentSegment.fgColor = 'text-white'
          break
        // Standard background colors (40-47)
        case 40:
          currentSegment.bgColor = 'bg-black'
          break
        case 41:
          currentSegment.bgColor = 'bg-red-500'
          break
        case 42:
          currentSegment.bgColor = 'bg-green-500'
          break
        case 43:
          currentSegment.bgColor = 'bg-yellow-500'
          break
        case 44:
          currentSegment.bgColor = 'bg-blue-500'
          break
        case 45:
          currentSegment.bgColor = 'bg-purple-500'
          break
        case 46:
          currentSegment.bgColor = 'bg-cyan-500'
          break
        case 47:
          currentSegment.bgColor = 'bg-white'
          break
        // Bright foreground colors (90-97)
        case 90:
          currentSegment.fgColor = 'text-gray-500'
          break
        case 91:
          currentSegment.fgColor = 'text-red-400'
          break
        case 92:
          currentSegment.fgColor = 'text-green-400'
          break
        case 93:
          currentSegment.fgColor = 'text-yellow-400'
          break
        case 94:
          currentSegment.fgColor = 'text-blue-400'
          break
        case 95:
          currentSegment.fgColor = 'text-purple-400'
          break
        case 96:
          currentSegment.fgColor = 'text-cyan-400'
          break
        case 97:
          currentSegment.fgColor = 'text-gray-100'
          break
        // Bright background colors (100-107)
        case 100:
          currentSegment.bgColor = 'bg-gray-500'
          break
        case 101:
          currentSegment.bgColor = 'bg-red-400'
          break
        case 102:
          currentSegment.bgColor = 'bg-green-400'
          break
        case 103:
          currentSegment.bgColor = 'bg-yellow-400'
          break
        case 104:
          currentSegment.bgColor = 'bg-blue-400'
          break
        case 105:
          currentSegment.bgColor = 'bg-purple-400'
          break
        case 106:
          currentSegment.bgColor = 'bg-cyan-400'
          break
        case 107:
          currentSegment.bgColor = 'bg-gray-100'
          break
      }
    }

    lastIndex = ansiRegex.lastIndex
  }

  // Add remaining text
  if (lastIndex < input.length) {
    currentSegment.text = input.slice(lastIndex)
    segments.push({ ...currentSegment })
  }

  return segments.filter((seg) => seg.text.length > 0)
}

/**
 * Renders ANSI segments to React elements
 */
export const renderAnsiSegments = (segments: AnsiSegment[]): JSX.Element[] => {
  return segments.map((segment, index) => {
    const classes = [
      segment.fgColor,
      segment.bgColor,
      segment.bold ? 'font-bold' : '',
      segment.italic ? 'italic' : '',
      segment.underline ? 'underline' : ''
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <span key={index} className={classes || undefined}>
        {segment.text}
      </span>
    )
  })
}

/**
 * Strips ANSI codes from string (for plain text display)
 */
export const stripAnsi = (input: string): string => {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[\d+(?:;\d+)*m/g, '')
}
