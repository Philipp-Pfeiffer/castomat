import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'

export class TerminalSession {
  private ptyProcess: pty.IPty | null = null
  private onDataCallback: ((data: string) => void) | null = null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_window: BrowserWindow) {
    // Window reference stored for potential future use (e.g., window-specific sessions)
  }

  /**
   * Starts a new bash session
   */
  start(): void {
    if (this.ptyProcess) {
      this.stop()
    }

    this.ptyProcess = pty.spawn('/bin/bash', ['-l'], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/',
      env: process.env as { [key: string]: string }
    })

    this.ptyProcess.onData((data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data)
      }
    })

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal exited with code ${exitCode}, signal ${signal}`)
      this.ptyProcess = null
    })
  }

  /**
   * Stops the current bash session
   */
  stop(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill()
      this.ptyProcess = null
    }
  }

  /**
   * Writes input to the terminal
   */
  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    }
  }

  /**
   * Resizes the terminal
   */
  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows)
    }
  }

  /**
   * Sets the callback for terminal output
   */
  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback
  }

  /**
   * Checks if terminal is running
   */
  isRunning(): boolean {
    return this.ptyProcess !== null
  }
}

// Global terminal session instance
let terminalSession: TerminalSession | null = null

/**
 * Gets or creates a terminal session for a window
 */
export const getTerminalSession = (window: BrowserWindow): TerminalSession => {
  if (!terminalSession) {
    terminalSession = new TerminalSession(window)
  }
  return terminalSession
}

/**
 * Destroys the current terminal session
 */
export const destroyTerminalSession = (): void => {
  if (terminalSession) {
    terminalSession.stop()
    terminalSession = null
  }
}
