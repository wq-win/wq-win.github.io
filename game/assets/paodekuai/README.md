# Original card-table art

Shared runtime assets for the Paodekuai and Doudizhu blue-and-gold table themes:

- `avatar-player.webp`, `avatar-female.webp`, `avatar-opponent.webp`: three fictional adult-player portraits, 640 × 640 pixels each. Newly generated for this project with OpenAI image generation, without external reference images, celebrity names, or existing game characters.
- `card-back.svg`: original blue-and-gold ornamental card back.
- `court-jack.svg`, `court-queen.svg`, `court-king.svg`: original double-ended court illustrations. Rank and suit labels are rendered separately by the game.

The SVG artwork was written for this project, using familiar playing-card conventions with original paths and layouts. No Tencent logos, copied game artwork, downloaded portraits, or third-party asset packs are included. Portrait frames are implemented in `css/paodekuai.css` and `css/doudizhu.css`.

Doudizhu reuses the player/opponent portraits, court illustrations, and card-back ornament. Its 1v1 puzzle hands remain fully face-up: the two small backs beside the table title are decorative and do not represent hidden cards or a third player. Each game keeps its own scoped card rendering and styles; the original engines and Doudizhu levels are unchanged.

The source assets were visually checked at small display sizes. This does not replace real-browser verification of the complete game layout.
