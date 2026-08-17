## Purpose

Gives anyone looking at the repo a single, current picture of every OpenSpec change and where it stands, instead of relying on the frozen version-phase list in `documentation.md`.

## ADDED Requirements

### Requirement: Roadmap groups every change by lifecycle state
`ROADMAP.md` SHALL list every OpenSpec change under exactly one of four sections: Proposed, Doing, Done, or Archived, reflecting that change's current state.

#### Scenario: New change created
- **WHEN** a new OpenSpec change is created and its planning artifacts are not yet complete
- **THEN** the change SHALL appear under the Proposed section in `ROADMAP.md`

#### Scenario: Implementation underway
- **WHEN** a change's planning artifacts are complete and at least one of its tasks has started but not all tasks are complete
- **THEN** the change SHALL appear under the Doing section in `ROADMAP.md`

#### Scenario: Implementation complete but not archived
- **WHEN** all of a change's tasks are complete but the change has not yet been archived
- **THEN** the change SHALL appear under the Done section in `ROADMAP.md`

#### Scenario: Change archived
- **WHEN** a change is archived (moved under `openspec/changes/archive/`)
- **THEN** the change SHALL appear under the Archived section in `ROADMAP.md` and SHALL be removed from whichever section it previously occupied

### Requirement: Roadmap entries link to their source change
Each entry in `ROADMAP.md` SHALL link to the change's proposal (or, once archived, its archived location) so a reader can reach full details from the roadmap.

#### Scenario: Reader follows a roadmap entry
- **WHEN** a reader clicks a change's entry in `ROADMAP.md`
- **THEN** they SHALL land on that change's `proposal.md` (or its archived equivalent if the change has been archived)

### Requirement: Roadmap stays synchronized with actual change state
`ROADMAP.md` SHALL be updated to reflect a change's new lifecycle state whenever that state changes, so the roadmap never shows a change in a section it has already left.

#### Scenario: Change transitions state
- **WHEN** a change moves from one lifecycle state to another (Proposed → Doing, Doing → Done, or Done → Archived)
- **THEN** `ROADMAP.md` SHALL be updated to move the change out of its old section and into its new one
