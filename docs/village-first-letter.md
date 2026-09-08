# Mongsangin: The First Letter

## Experience Direction

The village is a short original narrative exploration game, not a Pokemon clone
and not a conventional bulletin board with a pixel border. The visitor becomes
a keeper of imperfect records. Existing community and commerce services remain
real, but the first interaction is a person, object or place.

The first chapter is an undeliverable letter. Three fragments are hidden on a
postage stamp, a garment label and a film reel. A sentence-restoration puzzle in
the workshop reveals its recipient: the visitor. Completion awards only a
device-local journal stamp. Login, purchases and posting are never prerequisites.

## Feature Map

| Existing feature | New encounter | Actual data/action |
| --- | --- | --- |
| Community posts | Moa's open letter box | Publish, search, page through letters, reply, recover own letter |
| World poop records | A letter left in the street | Same persistent community records; shared letter reader |
| Goods | Dan's display stand | Real catalog, categories, item inspection, cart, existing protected file purchase/download |
| Studio | Lu's projector | Real studio posts, image/text/media inspection, existing membership checks, continuous playback |
| Account/orders | Seo's resident desk | Existing authenticated resident account and order dialog |
| Meeting queue | On's cafe | Explicit queue application/cancellation in the existing matching dialog |
| About/workflow | Gyeol's workshop | Sentence puzzle plus access to existing production records |

## Interaction Rules

- Six residents have authored dialogue and optional questions.
- Interior objects and dialogue choices are keyboard-operable buttons.
- A journal suggests the next missing fragment but never locks free exploration.
- Scene actions open focused work surfaces. Hidden scenes leave the accessibility tree.
- Letter titles and bodies remain user content, rendered as text, never HTML.
- A new letter also appears as a persistent trace in the shared outdoor village.
- Empty catalog and studio data stay empty; narrative content is separate and
  never represented as a real customer product, community post or media upload.
- Purchasing is not a story action. Financial transactions retain their existing
  confirmation and authorization paths.
- `/community` redirects to `/?room=community`; all six rooms support direct links.

## Art Direction

Original pixel room scenes, restrained mulberry/green/blue accents, readable
dialogue, still object displays, paper correspondence, and deliberate empty
space. No automatic product carousels or scrolling tier rows in game mode.
The outdoor ground has world-anchored paving, flower beds, trees and street lamps.
Motion-reduction preferences stop clue-marker animation.

## Save Boundaries

`mongsangin-first-letter-v1` is a versioned localStorage save. Inputs are validated
and deduplicated. Storage denial must retain a temporary in-memory session and
show that it cannot be saved. It is not shared between devices and is never used
for authentication, purchases, membership or account privileges.

## Verification

Verification results and limitations for this release are recorded after the
browser pass in `village-game-verification.md`. Legacy payment infrastructure is
not validated by a story completion or a successful cart mutation.
