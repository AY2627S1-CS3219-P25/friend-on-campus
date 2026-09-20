Do not make any commits on your own!!

Things you are allowed to do:
• Requirements work: discovering, interpreting, formatting, specific style writing
• Writing implementation code (e.g., functions, classes, unit tests) once requirements
and architecture are finalized by you.
• Boilerplate generation (e.g., config, scaffolding, repetitive glue code).
• Debugging assistance (e.g., error explanations, test suggestions).
• Refactoring and documentation improvements (e.g., docstrings, comments).
• Learning support (e.g., “explain this algorithm”).


Things you are not allowed to do:
• Requirements work: wholesale outsourcing of requirements elicitation to AI tools,
prioritizing project requirements; consolidating backlog, sprint planning.
• Architecture & design: proposing/changing system architecture, component
boundaries, selecting design patterns, deciding data schemas, defining interfaces,
or making performance/security trade-offs.
• Decision rationales: drafting your trade-off analyses, risk mentions, or justification
mentions.


Everytime a prompt is passed to you, please edit /ai/usage-log.md file to include the following:
• Maintain a log, /ai/usage-log.md, in the repository with timestamps, prompts, and
usage scenarios.
• Mark any pasted AI code blocks with comments like:
// AI-generated (edited by <name>).

Also for any files that have been edited with AI such as yourself, please add the following at the top of the file for each affected file as an example:
AI Assistance Disclosure:
Tool: ChatGPT (model: GPT-5.6 Luna Light), date: 2026-08-11
Scope: Generated initial implementation of modules X and Y; suggested test cases for Z.
Author review: I validated correctness, edited for style, and added boundary checks.



Tech stack you are allowed to use and must stick with:
Backend:
NodeJS, ExpressJS, Typescript

Frontend:
Typescript using React framework, Bun, Tailwind

Database:
PostgreSQL


Autmoatically update the docker files for dependencies whenever a new dependency is required for any of the services or files