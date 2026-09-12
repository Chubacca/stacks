#!/usr/bin/env node
// Re-exposes typescript-app-stack's skill linker as this stack's own bin:
// under bun's isolated linker only an app's direct deps put bins on its PATH.
import "@chuvenger/typescript-app-stack/link-skills"
