> [!IMPORTANT]
> We know, we know, this documentation is incomplete. We're still working on it (and we'll get there, eventually). In the meantime, the best way to learn how to create a Backslash plugin is to check out the source code of some existing plugins. [Browse through the plugins on GitHub](https://github.com/backslash-app/plugins) and see how they're structured. You can also [join our Discord server](https://discord.gg/sTzwBzDkK9) and ask for help or advice. We're always happy to help out!

# Backslash Plugin Documentation

Welcome to the **Backslash Plugin Documentation**! So, you’ve decided to take Backslash to the next level and create your own plugin. Awesome! It's time to flex your developer muscles and add whatever command-line magic you want to Backslash. It's easier than you think (unless you're already thinking it's easy, then... it's still that).

Below, you'll find a simple guide on how to create and integrate your own plugin. Ready to make Backslash even more _yours_? Let’s do this!

## Table of Contents

1. [Introduction](#introduction)
2. [Plugin Basics](#plugin-basics)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Plugin Structure](#plugin-structure)
5. [Advanced Tips](#advanced-tips)
6. [Publishing and Sharing](#publishing-and-sharing)
7. [Optional system dependencies](#optional-system-dependencies)
8. [FAQ](#faq)

## Introduction

Backslash is designed to be flexible. Want a plugin to control your smart lights? No problem. A plugin to search through your ASCII art collection? Why not! Backslash doesn't judge, and neither do we (much). This guide will walk you through creating a basic plugin and integrating it into the Backslash ecosystem.

Whether you're an experienced developer or someone who's just really good at Googling, this guide will help you build something cool.

## Plugin Basics

### What is a Backslash Plugin?

A Backslash plugin is a simple module that you can add to extend Backslash's functionality. It can be anything from a custom search tool, a launcher for your favorite apps, or a shortcut to run scripts you use daily.

### Why Build Plugins?

1. **Because you can**. You're a Linux user, you already solve your problems with shell scripts. Why not make them pretty with Backslash?
2. **Automation**. If you're doing the same repetitive tasks, turn them into a plugin, and let Backslash handle it.
3. **Sharing is caring**. Once you've built something cool, share it with the rest of the Linux community. (They might even use it!)

## Optional system dependencies

### Clipboard manager

The built-in clipboard manager uses Electron’s clipboard API. On Linux (especially under Wayland), that API may not see the system clipboard when the app is in the background, so the history can stay empty.

For reliable clipboard history on Linux, install one of these **optional** helpers:

- **Wayland:** `wl-clipboard` (provides `wl-paste`). Example: `sudo pacman -S wl-clipboard` (Arch), `sudo apt install wl-clipboard` (Debian/Ubuntu).
- **X11:** `xclip` or `xsel`. Example: `sudo pacman -S xclip`, or `sudo apt install xclip`.

If none of these are installed, the app still runs; clipboard history may just be empty when the window is not focused.
