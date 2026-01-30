import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Loads all available shell commands from PATH
 * Uses compgen -c to get all available commands
 */
export const loadCommandCache = async (): Promise<Set<string>> => {
  try {
    console.log('Loading command cache...')
    // Get all commands from PATH using compgen (must run via bash)
    const { stdout } = await execAsync('bash -c "compgen -c"')
    const commands = new Set(stdout.split('\n').filter(Boolean))
    console.log(`Loaded ${commands.size} commands from compgen -c`)

    // Also get aliases
    try {
      const { stdout: aliasStdout } = await execAsync('bash -c "compgen -a"')
      aliasStdout
        .split('\n')
        .filter(Boolean)
        .forEach((cmd) => commands.add(cmd))
      console.log(`Added aliases, total: ${commands.size} commands`)
    } catch {
      // Aliases might not be available, ignore
    }

    // Also get functions
    try {
      const { stdout: funcStdout } = await execAsync('bash -c "compgen -A function"')
      funcStdout
        .split('\n')
        .filter(Boolean)
        .forEach((cmd) => commands.add(cmd))
      console.log(`Added functions, total: ${commands.size} commands`)
    } catch {
      // Functions might not be available, ignore
    }

    return commands
  } catch (error) {
    console.error('Failed to load command cache:', error)
    // Return a basic set of common commands as fallback
    return new Set([
      'cd',
      'ls',
      'pwd',
      'cat',
      'echo',
      'mkdir',
      'rm',
      'cp',
      'mv',
      'touch',
      'chmod',
      'chown',
      'sudo',
      'apt',
      'git',
      'npm',
      'node',
      'python',
      'pip',
      'docker',
      'kubectl',
      'vim',
      'nano',
      'curl',
      'wget',
      'ssh',
      'scp',
      'tar',
      'gzip',
      'grep',
      'find',
      'awk',
      'sed',
      'head',
      'tail',
      'less',
      'more',
      'ps',
      'top',
      'htop',
      'kill',
      'killall',
      'df',
      'du',
      'free',
      'uptime',
      'whoami',
      'who',
      'w',
      'last',
      'history',
      'clear',
      'exit',
      'source',
      'export',
      'alias',
      'unalias',
      'which',
      'whereis',
      'type',
      'help',
      'man',
      'info',
      'whatis',
      'apropos',
      'updatedb',
      'locate',
      'xargs',
      'tee',
      'sort',
      'uniq',
      'cut',
      'paste',
      'join',
      'tr',
      'wc',
      'diff',
      'patch',
      'comm',
      'cmp',
      'shasum',
      'md5sum',
      'sha256sum',
      'base64',
      'uuencode',
      'uudecode',
      'gzip',
      'gunzip',
      'zcat',
      'bzcat',
      'xzcat',
      'lzcat',
      'zip',
      'unzip',
      'tar',
      'cpio',
      'dd',
      'mkfs',
      'fsck',
      'mount',
      'umount',
      'fdisk',
      'parted',
      'lsblk',
      'blkid',
      'df',
      'du',
      'stat',
      'file',
      'readlink',
      'realpath',
      'dirname',
      'basename',
      'mktemp',
      'tempfile',
      'mkfifo',
      'mknod',
      'ln',
      'link',
      'unlink',
      'rename',
      'renice',
      'nice',
      'nohup',
      'disown',
      'wait',
      'fg',
      'bg',
      'jobs',
      'time',
      'times',
      'ulimit',
      'umask',
      'trap',
      'eval',
      'exec',
      'command',
      'builtin',
      'enable',
      'disable',
      'shopt',
      'complete',
      'compgen',
      'compopt',
      'bind',
      'mapfile',
      'readarray',
      'read',
      'printf',
      'test',
      '[',
      '[[',
      ']]',
      'true',
      'false',
      ':',
      '.',
      'break',
      'continue',
      'return',
      'shift',
      'getopts',
      'hash',
      'dirs',
      'pushd',
      'popd',
      'suspend',
      'logout',
      'exit'
    ])
  }
}

/**
 * Checks if the first token of input is a known command
 * Fast O(1) lookup from cache
 */
export const isKnownCommand = (input: string, commandCache: Set<string>): boolean => {
  const firstToken = input.trim().split(/\s+/)[0]
  if (!firstToken) return false
  return commandCache.has(firstToken)
}
