#!/usr/bin/env python3
"""Generate one Swiss-style cover/share PNG from an issue JSON.

Swiss tokens (guizang-social-card-skill): paper #fafaf8, ink #0a0a0a,
Safety Orange #FF6B35. Canvas 1200×630 (Open Graph / Twitter card).

Usage:
  python3 scripts/generate_cover.py [path/to/issue.json ...]

Default: data/latest.json
Writes:
  images/covers/YYYY-MM-DD.png
  images/cover.png                 (copy of latest)
Sets JSON field "cover": "images/covers/YYYY-MM-DD.png"
Patches index.html og:image / twitter:image to the absolute Pages URL.

Daily routine (after writing latest.json):
  python3 scripts/generate_cover.py data/latest.json
  python3 scripts/normalize_issue.py data/latest.json issues/YYYY-MM-DD.json
  # then commit + push
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES_BASE = "https://stabey.github.io/tech-brief"
W, H = 1200, 630
MAX_LINES = 5
MAX_LINE_CHARS = 40


def shorten(text: str, n: int = MAX_LINE_CHARS) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip())
    if len(t) <= n:
        return t
    # Prefer a mid-length cut at punctuation; keep enough hook text.
    for sep in ("：", ":", "——", "—", "；", ";", "，", ","):
        i = t.find(sep)
        if 12 <= i <= n:
            return t[:i].rstrip(" ：:")
        # Colon early (e.g. "Qwenputer：…") — keep head + a bit of body
        if 4 <= i < 12 and len(t) > i + 1:
            body = t[i + 1 :].lstrip()
            room = n - i - 1
            if room >= 8:
                chunk = body if len(body) <= room else body[: room - 1] + "…"
                return t[: i + 1] + chunk
    return t[: n - 1] + "…"


def punch_lines(data: dict) -> list[str]:
    out = []
    for h in data.get("highlights") or []:
        title = h.get("title") if isinstance(h, dict) else str(h)
        if not title:
            continue
        out.append(shorten(title))
        if len(out) >= MAX_LINES:
            break
    return out


def build_html(data: dict, lines: list[str]) -> str:
    issue_id = data.get("id") or "unknown"
    title = data.get("title") or f"技术早报 · {issue_id}"
    # Display date label
    try:
        y, m, d = issue_id.split("-")
        date_label = f"{y}.{m}.{d}"
        date_cn = f"{int(y)}年{int(m)}月{int(d)}日"
    except Exception:
        date_label = issue_id
        date_cn = issue_id

    rows = []
    for i, line in enumerate(lines, 1):
        rows.append(
            f'<li><span class="num">{i:02d}</span>'
            f'<span class="txt">{escape(line)}</span></li>'
        )
    rows_html = "\n".join(rows) if rows else "<li><span class='txt'>（暂无速览）</span></li>"

    return f"""<!DOCTYPE html>
<html lang="zh-CN" data-accent="safety-orange">
<head>
<meta charset="utf-8"/>
<!-- system fonts: Inter / Noto Sans CJK SC / IBM Plex Mono -->
<style>
  :root {{
    --paper: #fafaf8;
    --ink: #0a0a0a;
    --grey-1: #f0f0ee;
    --grey-2: #d4d4d2;
    --grey-3: #737373;
    --accent: #FF6B35;
    --accent-on: #ffffff;
    --sans: "Inter", "Noto Sans CJK SC", "Noto Sans SC", "Helvetica Neue", Helvetica, "PingFang SC", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{
    width: {W}px; height: {H}px;
    overflow: hidden;
    background: #111;
  }}
  #cover {{
    width: {W}px; height: {H}px;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    position: relative;
    display: grid;
    grid-template-columns: 48px 1fr;
    -webkit-font-smoothing: antialiased;
  }}
  .rail {{
    background: var(--accent);
    width: 48px;
    height: 100%;
  }}
  .body {{
    padding: 48px 56px 40px 48px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }}
  .top {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--grey-2);
  }}
  .kicker {{
    font-family: var(--mono);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }}
  .date {{
    font-family: var(--mono);
    font-size: 16px;
    font-weight: 500;
    color: var(--grey-3);
  }}
  h1 {{
    margin-top: 28px;
    font-size: 64px;
    font-weight: 200;
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: var(--ink);
  }}
  h1 .sub {{
    display: block;
    margin-top: 8px;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--grey-3);
  }}
  ol {{
    list-style: none;
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }}
  li {{
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 12px;
    align-items: baseline;
    border-top: 1px solid var(--grey-2);
    padding-top: 10px;
  }}
  li:first-child {{ border-top: none; padding-top: 0; }}
  .num {{
    font-family: var(--mono);
    font-size: 16px;
    font-weight: 600;
    color: var(--accent);
  }}
  .txt {{
    font-size: 22px;
    font-weight: 400;
    line-height: 1.35;
    color: var(--ink);
  }}
  .foot {{
    margin-top: auto;
    padding-top: 18px;
    border-top: 2px solid var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 500;
    color: var(--grey-3);
  }}
  .foot .url {{ color: var(--ink); }}
</style>
</head>
<body>
  <section id="cover" class="poster wide">
    <div class="rail" aria-hidden="true"></div>
    <div class="body">
      <div class="top">
        <span class="kicker">Tech Brief</span>
        <span class="date">{escape(date_label)} · CST 08:00</span>
      </div>
      <h1>技术早报<span class="sub">{escape(date_cn)} · 今日速览</span></h1>
      <ol>
        {rows_html}
      </ol>
      <div class="foot">
        <span>ISSUE {escape(issue_id)}</span>
        <span class="url">stabey.github.io/tech-brief</span>
      </div>
    </div>
  </section>
</body>
</html>
"""


def screenshot(html_path: Path, out_png: Path) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    # Chrome --screenshot captures the viewport; size window to canvas.
    cmd = [
        "google-chrome",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=2000",
        f"--window-size={W},{H}",
        f"--screenshot={out_png}",
        html_path.resolve().as_uri(),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
    if not out_png.exists() or out_png.stat().st_size < 1000:
        raise RuntimeError(f"screenshot failed or too small: {out_png}")


def patch_index_meta(cover_rel: str) -> None:
    index = ROOT / "index.html"
    if not index.exists():
        return
    abs_url = f"{PAGES_BASE}/{cover_rel}"
    text = index.read_text(encoding="utf-8")
    # Ensure og/twitter tags exist; replace or insert before </head>
    replacements = {
        r'<meta\s+property="og:image"[^>]*/?>': f'<meta property="og:image" content="{abs_url}" />',
        r'<meta\s+name="twitter:image"[^>]*/?>': f'<meta name="twitter:image" content="{abs_url}" />',
        r'<meta\s+property="og:image:width"[^>]*/?>': f'<meta property="og:image:width" content="{W}" />',
        r'<meta\s+property="og:image:height"[^>]*/?>': f'<meta property="og:image:height" content="{H}" />',
    }
    for pat, rep in replacements.items():
        if re.search(pat, text, flags=re.I):
            text = re.sub(pat, rep, text, count=1, flags=re.I)
        else:
            text = text.replace("</head>", f"  {rep}\n</head>", 1)

    # twitter:card + og:title/description if missing
    extras = [
        ('name="twitter:card"', '<meta name="twitter:card" content="summary_large_image" />'),
        ('property="og:type"', '<meta property="og:type" content="website" />'),
        ('property="og:url"', f'<meta property="og:url" content="{PAGES_BASE}/" />'),
        ('property="og:title"', '<meta property="og:title" content="技术早报" />'),
        (
            'property="og:description"',
            '<meta property="og:description" content="每天 8:00（北京时间）整理技术社区与特别关注账号的热点。" />',
        ),
    ]
    for needle, tag in extras:
        if needle not in text:
            text = text.replace("</head>", f"  {tag}\n</head>", 1)

    index.write_text(text, encoding="utf-8")


def process(path: Path) -> Path:
    data = json.loads(path.read_text(encoding="utf-8"))
    issue_id = data.get("id")
    if not issue_id:
        raise SystemExit(f"missing id in {path}")
    lines = punch_lines(data)
    html = build_html(data, lines)

    rel = f"images/covers/{issue_id}.png"
    out = ROOT / rel
    latest = ROOT / "images" / "cover.png"

    with tempfile.TemporaryDirectory(prefix="tech-brief-cover-") as td:
        html_path = Path(td) / "cover.html"
        html_path.write_text(html, encoding="utf-8")
        # Give fonts a moment: chrome loads them during paint; use virtual time?
        # First write, then screenshot (fonts usually load fast enough with preconnect).
        screenshot(html_path, out)

    shutil.copy2(out, latest)
    data["cover"] = rel
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    patch_index_meta(rel)
    print("ok", rel, "lines", len(lines), "bytes", out.stat().st_size)
    return out


def main(argv: list[str]) -> None:
    paths = [Path(p) for p in argv[1:]] or [ROOT / "data" / "latest.json"]
    for p in paths:
        if not p.is_absolute():
            # Prefer CWD-relative, else repo-relative
            cand = Path.cwd() / p
            p = cand if cand.exists() else ROOT / p
        process(p)


if __name__ == "__main__":
    main(sys.argv)
