---
name: refactoring-code-cleaning
description: Use when refactoring code, restructuring or removing features, changing database or API contracts, or cleaning a codebase. Trace affected dependencies end to end, remove obsolete implementations safely, and verify the resulting flow.
---

# Refactoring and Code Cleaning

Use this skill whenever a task changes existing behavior or structure, removes functionality, changes a database or API contract, or requests code cleanup. Complete the affected flow end to end; a localized edit is not complete if it leaves stale callers, contracts, schema, or tests behind.

## Workflow

Follow this sequence, adapting each step to the actual scope:

`Analyze -> Trace Dependencies -> Refactor -> Migrate -> Clean -> Test -> Audit -> Verify`

1. **Analyze the behavior and boundaries.** Identify the user-visible flow, entry points, data ownership, integrations, authorization rules, and compatibility requirements. Establish the current behavior and conventions before choosing a design.
2. **Trace dependencies before changing or deleting.** Search the whole relevant codebase for symbols, field names, routes, endpoints, and schema references. Include frontend and backend code, database and migrations, seeders, models and relations, queries, services, controllers, validation, resources/DTOs, types, jobs/queues, commands, integrations, configuration, permissions, and tests as applicable. Use the repository's code search or code graph tools when available; inspect actual callers and relevant source. Do not infer that code is unused from its name or a single search result.
3. **Refactor consistently.** Follow established project patterns. Before introducing a component, helper, service, hook, abstraction, or utility, look for an existing reusable implementation. Prefer a simpler consolidation only when it preserves behavior and makes the system easier to maintain.
4. **Migrate contracts and data safely.** Update every affected layer together. For obsolete columns, tables, keys, indexes, pivots, or enum/status values, first find all code and integration uses and assess deployment/data compatibility. If removal is justified, implement the repository's safe migration pattern; do not directly alter deployed schema or discard data as part of cleanup. Preserve compatibility where rollout order or external consumers require it.
5. **Clean up replaced code.** After the replacement is complete and references are verified, remove obsolete implementations and genuinely unused files, functions, variables, imports, hooks, services, repositories, endpoints, routes, controller methods, validation, relations, DTOs/resources, types, constants/enums, styles, assets, duplicate logic, debug output, temporary compatibility code, backups, and commented-out legacy code. Remove temporary TODOs only when resolved. Do not leave confusing parallel names such as `oldFunction` and `newFunction` when the old implementation has no remaining purpose.
6. **Test affected behavior.** Add or update tests for the changed behavior and important failure modes, following repository testing instructions. Verify the relevant available operations, such as create, read, search, filter, sort, pagination, update, delete, and detail. Check imports, routes, endpoint calls, validation, authorization, relations, and API response/type agreement. Run relevant automated tests and build or static checks when required and available; report checks that cannot be run.
7. **Audit the final diff.** Review the complete diff for accidental changes. Search again for old field, function, component, endpoint, route, table, and column names; inspect remaining matches and resolve orphan references or document a real compatibility reason. Confirm the new implementation and all affected layers agree.
8. **Verify end to end.** Confirm the changed flow works across its actual boundaries and that no stale implementation or reference remains. Summarize the change, cleanup, verification performed, and any known limitation.

## Trace the Relevant Flow

For a full-stack feature, consider each applicable link in this chain and follow its real dependencies:

`Database -> Migration -> Model/Entity -> Relation -> Repository/Query -> Service -> Controller -> Validation -> Resource/DTO/API Response -> Route -> Frontend API/Service -> State/Hook -> Component -> Form/Table/Detail -> Permission/Authorization -> Test`

Not every project has every layer. Inspect only applicable layers, but do not stop at the layer named in the request when evidence shows the change crosses a boundary. For a removed API field, for example, check what the frontend sends, backend validation and use, persistence, response serialization, types, integrations, and tests before deleting its implementation.

## Safety and Scope

- Treat database, API, route, permission, and integration changes as contract changes. Preserve behavior unless the task explicitly changes it.
- Do not delete code or schema until all relevant references and consumers have been checked. If usage cannot be ruled out, retain it and report the uncertainty rather than making a speculative deletion.
- Prefer additive or staged migrations when old and new application versions may overlap. Never run a destructive production migration or perform external deployment actions without explicit authorization.
- Keep cleanup tied to the requested change. Do not expand into unrelated redesigns, broad renaming, dependency changes, or speculative abstractions.
- Follow the repository's own rules for framework versions, skills, migration practices, formatting, and tests. This skill complements those rules; it does not replace them.

## Definition of Done

The task is complete when the replacement behavior works, relevant dependencies and contracts agree across the affected stack, obsolete code has been safely removed, permissions and validation remain correct, no unexplained orphan reference remains, and relevant checks have passed or their limitations are reported. A successful UI change alone is not sufficient when other affected layers remain inconsistent.
