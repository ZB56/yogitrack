#!/usr/bin/env python3
"""
tools/build-report.py
---------------------
Builds docs/project-report.html from docs/11-project-report.md.

Why this exists: the report has to be submitted as a document, but the source
of truth should stay in Markdown inside the repository so it can be diffed and
reviewed like everything else. This script produces a single self-contained
HTML file -- the four SVG diagrams are inlined, so nothing else needs to be
present -- with a print stylesheet, ready to be saved as a PDF from a browser.

No third-party dependency: pandoc and the usual Markdown libraries are not
installed on the development machine, and adding a toolchain for one file
would be a poor trade. This handles the subset of Markdown the report uses.

Usage:  python3 tools/build-report.py
"""

import pathlib
import re
import html

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "11-project-report.md"
DIAGRAMS = ROOT / "docs" / "diagrams"
OUTPUT = ROOT / "docs" / "project-report.html"


def inline(text):
    """Convert inline Markdown (code, bold, italic, links) to HTML."""
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def convert(md):
    # Drop the Markdown contents list; a printed document is navigated by eye.
    md = re.sub(r"## Contents\n.*?\n---\n", "", md, count=1, flags=re.S)

    # Stash fenced code blocks first, so no later rule rewrites their contents.
    blocks = []

    def stash(match):
        blocks.append(match.group(2))
        return f"\x00BLOCK{len(blocks) - 1}\x00"

    md = re.sub(r"```(\w*)\n(.*?)```", stash, md, flags=re.S)

    lines = md.split("\n")
    out = []
    in_table = in_list = in_quote = False
    i = 0

    def close_table():
        nonlocal in_table
        if in_table:
            out.append("</tbody></table>")
            in_table = False

    def close_list():
        nonlocal in_list
        if in_list:
            out.append("</li></ul>")
            in_list = False

    def close_quote():
        nonlocal in_quote
        if in_quote:
            out.append("</blockquote>")
            in_quote = False

    while i < len(lines):
        line = lines[i]

        # --- inlined diagram --------------------------------------------
        match = re.match(r"!\[([^\]]*)\]\(diagrams/([^)]+)\)", line.strip())
        if match:
            close_table(); close_list(); close_quote()
            svg = (DIAGRAMS / match.group(2)).read_text()
            # Drop the root width/height so the CSS can scale it to the page.
            svg = re.sub(r'\s(width|height)="\d+"', "", svg, count=2)
            out.append(
                f'<figure class="diagram">{svg}'
                f"<figcaption>{inline(match.group(1))}</figcaption></figure>"
            )
            i += 1
            continue

        # --- fenced code block ------------------------------------------
        if line.startswith("\x00BLOCK"):
            close_table(); close_list(); close_quote()
            index = int(re.search(r"\x00BLOCK(\d+)\x00", line).group(1))
            out.append(f"<pre><code>{html.escape(blocks[index])}</code></pre>")
            i += 1
            continue

        # --- horizontal rule (used only as a section separator) ----------
        if line.strip() == "---":
            close_table(); close_list(); close_quote()
            i += 1
            continue

        # --- blockquote ---------------------------------------------------
        if line.startswith(">"):
            close_table(); close_list()
            if not in_quote:
                out.append("<blockquote>")
                in_quote = True
            body = line[1:].lstrip()
            # Join continuation lines of the same quote paragraph.
            while (i + 1 < len(lines) and lines[i + 1].startswith(">")
                   and lines[i + 1][1:].strip()):
                i += 1
                body += " " + lines[i][1:].lstrip()
            out.append(f"<p>{inline(body)}</p>" if body else "")
            i += 1
            continue
        close_quote()

        # --- heading --------------------------------------------------------
        match = re.match(r"^(#{1,4})\s+(.*)$", line)
        if match:
            close_table(); close_list()
            level = len(match.group(1))
            text = match.group(2)
            anchor = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
            out.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            i += 1
            continue

        # --- table ----------------------------------------------------------
        if (line.startswith("|") and i + 1 < len(lines)
                and re.match(r"^\|[\s:|-]+\|$", lines[i + 1])):
            close_list()
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            out.append("<table><thead><tr>"
                       + "".join(f"<th>{inline(c)}</th>" for c in cells)
                       + "</tr></thead><tbody>")
            in_table = True
            i += 2
            continue
        if in_table:
            if line.startswith("|"):
                cells = [c.strip() for c in line.strip().strip("|").split("|")]
                out.append("<tr>"
                           + "".join(f"<td>{inline(c)}</td>" for c in cells)
                           + "</tr>")
                i += 1
                continue
            close_table()

        # --- list item --------------------------------------------------
        bullet = re.match(r"^(\s*)[-*]\s+(.*)$", line)
        numbered = re.match(r"^(\s*)(\d+)\.\s+(.*)$", line)
        if bullet or numbered:
            if in_list:
                out.append("</li>")
            else:
                out.append("<ul>")
                in_list = True
            if bullet:
                body = bullet.group(2)
            else:
                body = f"<strong>{numbered.group(2)}.</strong> {numbered.group(3)}"
            out.append(f"<li>{inline(body)}")
            i += 1
            # Continuation lines: indented, non-empty, and not a new item.
            # Without this a wrapped list item is split into a stray paragraph.
            while (i < len(lines) and lines[i].strip()
                   and re.match(r"^\s+", lines[i])
                   and not re.match(r"^\s*([-*]|\d+\.)\s", lines[i])
                   and not lines[i].startswith("\x00BLOCK")):
                out.append(" " + inline(lines[i].strip()))
                i += 1
            continue
        close_list()

        # --- blank line -------------------------------------------------
        if line.strip() == "":
            i += 1
            continue

        # --- paragraph ----------------------------------------------------
        paragraph = [line]
        i += 1
        while (i < len(lines) and lines[i].strip()
               and not re.match(r"^(#{1,4}\s|\||>|\s*[-*]\s|\s*\d+\.\s|---$|!\[)", lines[i])
               and not lines[i].startswith("\x00BLOCK")):
            paragraph.append(lines[i])
            i += 1
        out.append(f"<p>{inline(' '.join(paragraph))}</p>")

    close_table(); close_list(); close_quote()
    return "\n".join(out)


CSS = """
:root{--ink:#1c211d;--mute:#5c6660;--line:#d8e0d9;--sage:#3a5840;--sage-l:#eef4ef;
      --warn:#fdf9f0;--warnb:#e2cfa4}
*{box-sizing:border-box}
body{margin:0;font:11.5pt/1.6 Georgia,'Times New Roman',serif;color:var(--ink);background:#f2f4f2}
.page{max-width:7.6in;margin:0 auto;background:#fff;padding:0.9in 0.85in}
h1{font-family:Helvetica,Arial,sans-serif;font-size:24pt;line-height:1.15;margin:0 0 .4em;color:var(--sage)}
h2{font-family:Helvetica,Arial,sans-serif;font-size:15pt;margin:2em 0 .6em;padding-bottom:.25em;
   border-bottom:2px solid var(--sage);color:var(--sage)}
h3{font-family:Helvetica,Arial,sans-serif;font-size:12.5pt;margin:1.5em 0 .45em}
h4{font-family:Helvetica,Arial,sans-serif;font-size:11pt;margin:1.2em 0 .3em;color:var(--mute)}
p{margin:0 0 .75em}
ul{margin:0 0 .9em;padding-left:1.35em}
li{margin-bottom:.4em}
a{color:var(--sage)}
code{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:.85em;background:var(--sage-l);
     padding:1px 4px;border-radius:3px;word-break:break-word}
pre{background:#f7f9f7;border:1px solid var(--line);border-left:3px solid var(--sage);
    border-radius:4px;padding:.7em .9em;overflow-x:auto;page-break-inside:avoid}
pre code{background:none;padding:0;font-size:.78em;line-height:1.45}
table{width:100%;border-collapse:collapse;margin:.6em 0 1.1em;
      font-family:Helvetica,Arial,sans-serif;font-size:9pt;page-break-inside:avoid}
th{background:var(--sage-l);text-align:left;padding:7px 9px;border:1px solid var(--line);
   font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:var(--sage)}
td{padding:7px 9px;border:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even){background:#fafcfa}
blockquote{margin:1em 0;padding:.75em 1em;background:var(--warn);border:1px solid var(--warnb);
           border-left:3px solid #c9a24d;border-radius:4px;page-break-inside:avoid}
blockquote p{margin:0 0 .4em}blockquote p:last-child{margin:0}
.diagram{margin:1.3em 0;padding:.8em;border:1px solid var(--line);border-radius:5px;
         background:#fff;page-break-inside:avoid;text-align:center}
.diagram svg{width:100%;height:auto;max-height:8.2in}
figcaption{font-family:Helvetica,Arial,sans-serif;font-size:8.5pt;color:var(--mute);
           margin-top:.5em;font-style:italic}
.hint{font-family:Helvetica,Arial,sans-serif;font-size:10pt;background:var(--sage-l);
      border:1px solid var(--line);border-radius:5px;padding:.8em 1em;margin:0 auto 14px;max-width:7.6in}
@media print{
  /* Without this, Chrome and Safari strip every background colour when
     printing, which would flatten the table headers, the note panels and the
     diagram tints into plain white. */
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{background:#fff}
  .page{max-width:none;padding:0}
  .hint{display:none}
  h2,h3{page-break-after:avoid}
  table,pre,blockquote,.diagram{page-break-inside:avoid}
  @page{margin:0.75in;size:letter}
}
"""


def main():
    body = convert(SOURCE.read_text())
    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>YogiTrack - Project Report, Part 1</title>
<style>{CSS}</style>
</head>
<body>
<div class="hint"><strong>To produce the PDF for submission:</strong> press
Cmd&#8209;P, choose <em>Save as PDF</em>, and make sure &ldquo;Print
backgrounds&rdquo; is enabled. This banner does not appear in the PDF.</div>
<div class="page">
{body}
</div>
</body>
</html>
"""
    OUTPUT.write_text(doc)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(doc) // 1024} KB)")


if __name__ == "__main__":
    main()
