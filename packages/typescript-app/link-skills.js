#!/usr/bin/env node
// Links the agent skills bundled with the @chuvenger/* stacks into the repo's
// .claude/skills (Claude Code) and .agents/skills (Codex), so they version with
// the installed stack. Meant for an app's `prepare` script; the framework
// stacks re-expose it as a bin because only direct deps' bins reach the app
// under bun's isolated linker. Runs on import.
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"

const SCOPE = "@chuvenger/"
const AGENT_DIRS = [".claude/skills", ".agents/skills"]
const HEADER =
  "# Managed by link-stack-skills: symlinks into node_modules, recreated on install."
// Every layout (hoisted, bun isolated, pnpm) puts the real package dir at
// .../node_modules/@chuvenger/<pkg>, so this is how our own links are told
// apart from anything the user put in the same directory.
const OURS = /node_modules[\\/]@chuvenger[\\/][^\\/]+[\\/]skills[\\/][^\\/]+$/

/** Walk up from `dir` until `test` matches, or return null at the fs root. */
const findUp = (dir, test) => {
  for (let d = dir; ; d = dirname(d)) {
    if (test(d)) {
      return d
    }
    if (dirname(d) === d) {
      return null
    }
  }
}

// Node's own lookup (nearest node_modules/<name> going up), done by hand so
// it neither depends on a package's `exports` nor on where this file lives.
const findPackage = (name, fromDir) => {
  const found = findUp(fromDir, (d) =>
    existsSync(join(d, "node_modules", name, "package.json")),
  )
  return found && realpathSync(join(found, "node_modules", name))
}

const scopedDeps = (pkgDir) => {
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"))
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
    (name) => name.startsWith(SCOPE),
  )
}

// Collect skills breadth-first through the app's @chuvenger/* dep graph,
// resolving each package from the real path of the one that depends on it.
const app = process.cwd()
const skills = new Map()
const seen = new Set()
const queue = [app]
while (queue.length > 0) {
  const from = queue.shift()
  for (const name of scopedDeps(from)) {
    const pkgDir = findPackage(name, from)
    if (!pkgDir || seen.has(pkgDir)) {
      continue
    }
    seen.add(pkgDir)
    queue.push(pkgDir)
    const skillsDir = join(pkgDir, "skills")
    if (!existsSync(skillsDir)) {
      continue
    }
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      const skillDir = join(skillsDir, entry.name)
      if (entry.isDirectory() && existsSync(join(skillDir, "SKILL.md"))) {
        skills.set(entry.name, skillDir)
      }
    }
  }
}

// Link at the repo root: Codex only scans .agents/skills from the working
// directory up to the root, and in a workspace the app sits below it.
const root = findUp(app, (d) => existsSync(join(d, ".git"))) ?? app

const isSymlink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}
const ours = (path) => isSymlink(path) && OURS.test(readlinkSync(path))

for (const agentDir of AGENT_DIRS) {
  const dir = join(root, agentDir)
  if (skills.size === 0 && !existsSync(dir)) {
    continue
  }
  // Explicit modes: bun runs lifecycle scripts with umask 0, which would leave
  // these world-writable.
  mkdirSync(dir, { recursive: true, mode: 0o755 })

  // Drop links to skills that a newer stack version renamed or removed.
  for (const entry of readdirSync(dir)) {
    if (!skills.has(entry) && ours(join(dir, entry))) {
      rmSync(join(dir, entry))
    }
  }

  for (const [name, skillDir] of skills) {
    const path = join(dir, name)
    if (ours(path)) {
      rmSync(path)
    } else if (isSymlink(path) || existsSync(path)) {
      console.warn(
        `link-stack-skills: ${agentDir}/${name} already exists and isn't ours, leaving it`,
      )
      continue
    }
    // "junction" is ignored off Windows, and on Windows it links a directory
    // without admin rights (resolving the relative target to absolute).
    symlinkSync(relative(dir, skillDir), path, "junction")
  }

  // A .gitignore that ignores itself too, so the links never show up in git
  // and the app's own .gitignore needs no entry per skill.
  const gitignore = join(dir, ".gitignore")
  const lines = [HEADER, ".gitignore", ...[...skills.keys()].sort()]
  if (
    !existsSync(gitignore) ||
    readFileSync(gitignore, "utf8").startsWith(HEADER)
  ) {
    writeFileSync(gitignore, `${lines.join("\n")}\n`, { mode: 0o644 })
  } else if (skills.size > 0) {
    console.warn(
      `link-stack-skills: ${agentDir}/.gitignore isn't ours; ignore these yourself: ${[...skills.keys()].join(", ")}`,
    )
  }
}

const where = relative(app, root) || "."
console.log(
  skills.size > 0
    ? `link-stack-skills: linked ${[...skills.keys()].join(", ")} into ${AGENT_DIRS.map((d) => join(where, d)).join(", ")}`
    : "link-stack-skills: no @chuvenger/* dependency ships skills",
)
