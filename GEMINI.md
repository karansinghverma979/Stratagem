# DESIGN DIRECTIVE — TACTICAL CYBERPUNK FUI SYSTEM

You are designing a classified intelligence operating system from a futuristic world.
Every screen must feel like a command terminal, a strategic war room, a neural control station, and an AI-linked tactical environment.
The user should feel powerful, dangerous, strategic, and connected to an advanced intelligence network.
This is Cinematic Tactical Cyberpunk Interface Design.

## CORE DESIGN PHILOSOPHY
- The interface must feel like a "living digital command infrastructure."
- Not flat, casual, or corporate. It must be atmospheric, immersive, operational, high-authority, and classified.
- The system must appear as if it controls missions, intelligence, breaches, neural networks, tactical operations, and cognitive infrastructure.

## VISUAL IDENTITY
- **Environment:** Extremely dark environment. Primary backgrounds: near-black, midnight blue, deep indigo, dark violet.
- **Rules:** Never use pure flat black. Always introduce soft gradients, subtle noise, atmospheric bloom, and depth layering. The darkness must feel alive.

## COLOR LANGUAGE
- **Purple / Neon Violet (Primary Intelligence):** Represents neural systems, AI infrastructure, futuristic cognition. Use for active states, selected tabs, primary glow, neural interfaces.
- **Red (Danger/Hostile):** Reserved for danger, irreversible actions, breaches, system corruption, purge operations. Use sparingly to maintain authority.
- **Cyan / Electric Blue (Utility):** Represents system utilities, exports, technical processes, diagnostics.
- **Green (Success):** Represents validated operations, successful synchronization, stable execution, verified states.

## LIGHTING & DEPTH DESIGN
- **Atmospheric Neon Illumination:** Glow is structure, not decoration. Use edge glow, bloom diffusion, internal illumination, ambient light spill.
- **Depth System:** Every component must feel layered. Use inner/outer shadows, glass-like gradients, elevated cards, inset panels. It should resemble a physical futuristic console, not a webpage.

## PANEL & TYPOGRAPHY SYSTEM
- **Panels:** Modular intelligence modules. Use rounded tactical containers, thin neon borders, glowing edge strokes. Spacing must be engineered and precise—never overcrowd.
- **Typography:** Military command systems. Use bold futuristic sans-serif (e.g., Outfit), uppercase labels, expanded letter spacing. Headings must feel authoritative (e.g., CRITICAL PURGE DETECTED).
- **Hierarchy:** Primary (massive bold headings), Secondary (operational sections like Tactical Operations), Tertiary (telemetry, metadata, packets, diagnostics).

## INTERACTION & UI LANGUAGE
- **Interaction:** Buttons should feel powerful, mechanical, with heavy glow and strong contrast. Primary actions appear energetic and dangerous.
- **Language Overrides:**
  - Tasks -> Missions
  - Categories -> Sectors
  - Delete -> Purge
  - Upload -> Neural Merge
  - Dashboard -> Intelligence Hub

## SCREEN DESIGN PHILOSOPHY
- Every screen represents a **system state** (e.g., breach state, synchronization state), telling a story.
- **Execution Screen:** Mission deployment board (mission cards, objective counters, threat filters).
- **Purge Screen:** Psychological tension (red atmospheric glow, centered modal isolation, countdowns).
- **Neural Link Screen:** Procedural intelligence transfer (sequential process stages, verification indicators).
- **System Hub:** Core intelligence center (diagnostics, system metrics, storage intelligence).
- **The Forge:** Mission creation is ritualistic and strategic (temporal boundaries, threat levels, authorizing a covert operation).
- **Motion Design:** Slow, smooth, heavy, cinematic (system boot animations, scanning effects, pulse glows, neural signal movement). Avoid playful or bouncy consumer microinteractions.

## PERFORMANCE & MEMORY CONSTRAINT DIRECTIVES
- **Overlapping Backdrop Filters:** Never stack multiple heavy `backdrop-filter: blur(...)` elements on top of each other.
- **Background Suspends:** When a full-screen or large modal/overlay window is open (e.g., Task View, Forge Modal, Calendar Nexus, or Stratagem Hub), suspend/disable the underlying background animations, rotating gradients, and frosted glass blurs of the main page (using Svelte conditional `{#if}` blocks).
- **DOM Visibility Culling:** Apply `display: none` to the main viewport wrapper or inactive underlying pages when modals are active. This removes hidden elements from the GPU compositor tree to avoid warnings like "tile memory limits exceeded" and ensure 60fps lag-free animations.
- **Resource Cleanup:** Disable mouse tilt listeners, mouse tracks, and SVG rotating vectors in background panels when their containing view is covered or inactive.

