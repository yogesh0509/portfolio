# Third-party grammars

`cairo.tmLanguage.json` is the TextMate grammar used by the official Cairo VS Code extension.

- Source: https://github.com/software-mansion/vscode-cairo/blob/main/syntaxes/cairo.tmLanguage.json
- Licence: Apache License 2.0. The licence text, copied from the upstream repository's `LICENSE`, is in
  `cairo.tmLanguage.LICENSE` next to the grammar, as the licence asks of anyone who redistributes the file.
- Origin: the grammar's own `credits` field says it is "heavily modified Rust grammar from VSCode repository".
- Why it is here: the `cairo` grammar bundled with Shiki only covers Cairo 0 (`func`, `felt`, `tempvar`).
  The Cairo in my repos is Cairo 1/2 (`fn`, `mod`, `#[starknet::contract]`), which this grammar highlights correctly.
- Unmodified, except that `lib/highlight/shiki.server.ts` registers it under the name `cairo`.
