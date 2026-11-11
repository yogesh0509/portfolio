def validate_parsed(parsed: dict) -> Optional[dict]:
    """
    Re-check every field against the real enums; the grammar is never trusted as the only layer.
    action "none" stays distinct from None (malformed): main.py speaks its "reply" instead of
    dispatching it.
    """
    action = parsed.get("action")
    if action == "no_match":
        # Deliberate abstain: "reply" is force-emptied so an abstain can never become speech (fail closed).
        return {"action": "no_match", "app": "none", "direction": "none", "repo": "", "reply": ""}
    if action == "none":
        reply = parsed.get("reply", "")
        return {
            "action": "none",
            "app": "none",
            "direction": "none",
            "repo": "",
            "reply": reply if isinstance(reply, str) else "",
        }

    if action not in _ACTION_NAMES:
        return None

    app = parsed.get("app")
    if app not in (*LLM_APP_KEYS, "none"):
        return None

    direction = parsed.get("direction")
    if direction not in ("next", "previous", "left", "right", "none"):
        return None

    repo = parsed.get("repo", "")
    if not isinstance(repo, str):
        return None

    # The grammar allows any app/direction/repo for any action, so a real action must still carry its
    # own required parameter; a mismatch (often background chatter) is declined, not dispatched to fail.
    if action in ("focus_or_launch_app", "minimize_app", "maximize_app", "count_app_windows") and app == "none":
        return None
    if action == "switch_desktop" and direction not in ("next", "previous"):
        return None
    if action == "snap_window" and direction not in ("left", "right"):
        return None
    if action == "focus_vscode_repo" and not repo.strip():
        return None
    # No check for _NO_PARAM_ACTION_NAMES or start_dictation: dispatch ignores stray app/direction/repo
    # values for them, so declining over one would be an unforced failure.

    return {"action": action, "app": app, "direction": direction, "repo": repo}
