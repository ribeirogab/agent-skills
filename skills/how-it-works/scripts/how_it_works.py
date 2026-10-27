#!/usr/bin/env python3
import argparse
import base64
import hashlib
import html
import json
import os
import re
import signal
import struct
import sys
import tempfile
import webbrowser
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
OUTPUT_NAME = "how-it-works.html"
FRAGMENT_NAME = "how-it-works.fragment.html"
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
FORBIDDEN_TAGS = ("html", "head", "body", "main", "script", "style", "link", "iframe")
TEXT_BLOCKS = ("p", "li", "h3", "figcaption", "td", "th", "small", "aside")
VOID_TAGS = ("area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr")
SENTENCE_WORDS = 25
HEADING_WORDS = 10
SCREEN_WARN_BYTES = 400_000
PAGE_WARN_BYTES = 8_000_000
PAGE_LIMIT_BYTES = 15_000_000
SENTENCE_BREAK = re.compile(r"(?<=[.!?;])\s+")
PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
BARS_LIST = re.compile(r"<ul\b(?P<attrs>[^>]*\bclass=\"[^\"]*\bbars\b[^\"]*\"[^>]*)>(?P<items>.*?)</ul>", re.IGNORECASE | re.DOTALL)
BAR_ITEM = re.compile(r"<li\b(?P<attrs>[^>]*)>(?P<label>.*?)</li>", re.IGNORECASE | re.DOTALL)
BUILD_PATTERN = re.compile(r'\bdata-build="([^"]+)"')
PORT_BASE = 48000
PORT_SPAN = 1000
UI_STRINGS = {
    "en": {"screens": "Screens", "contents": "Contents", "previous": "Previous screen", "next": "Next screen", "close": "Close", "open": "Open the live screen", "light": "Light theme", "dark": "Dark theme", "updated": "updated"},
    "pt": {"screens": "Telas", "contents": "Seções", "previous": "Tela anterior", "next": "Próxima tela", "close": "Fechar", "open": "Abrir a tela", "light": "Tema claro", "dark": "Tema escuro", "updated": "atualizado em"},
    "es": {"screens": "Pantallas", "contents": "Secciones", "previous": "Pantalla anterior", "next": "Pantalla siguiente", "close": "Cerrar", "open": "Abrir la pantalla", "light": "Tema claro", "dark": "Tema oscuro", "updated": "actualizado el"},
}
RELOAD_SNIPPET = (
    "<script>(()=>{const build=document.getElementById(\"guide\")?.dataset.build;"
    "setInterval(async()=>{try{const response=await fetch(\"/__build\",{cache:\"no-store\"});"
    "const data=await response.json();if(build&&data.build&&data.build!==build)location.reload()}catch{}},1500)})();</script>"
)


class GuideError(Exception):
    pass


def words_in(text):
    return " ".join(text.split())


def opening(text, size=8):
    words = text.split()
    return " ".join(words[:size]) + ("…" if len(words) > size else "")


def class_list(attrs):
    return (attrs.get("class") or "").split()


def parse_attrs(tag):
    collector = AttributeCollector()
    collector.feed(tag)
    collector.close()
    return collector.attrs


class AttributeCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.attrs = {}

    def handle_starttag(self, tag, attrs):
        self.attrs = {name: value or "" for name, value in attrs}

    handle_startendtag = handle_starttag


class ContentScanner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.problems = []
        self.warnings = []
        self.titles = 0
        self.title = ""
        self.lede = ""
        self.ids = []
        self.local_links = []
        self.screens = []
        self.sections = []
        self.section = None
        self.text_stack = []
        self.capture = None
        self.awaiting_takeaway = False

    def where(self):
        return f"line {self.getpos()[0]}"

    def handle_starttag(self, tag, attrs):
        attrs = {name: value or "" for name, value in attrs}
        classes = class_list(attrs)
        if tag in FORBIDDEN_TAGS:
            self.problems.append(f"{self.where()}: <{tag}> belongs to the page template; write content markup only")
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href", "").startswith("#"):
            self.local_links.append((attrs["href"][1:], self.where()))
        if self.awaiting_takeaway and self.section is not None:
            self.section["takeaway"] = tag == "p" and "takeaway" in classes
            self.awaiting_takeaway = False
        if tag == "section":
            self.open_section(attrs)
        if tag == "img":
            self.check_image(attrs, classes)
        if tag in ("h1", "h2") or (tag == "p" and "lede" in classes):
            self.capture = {"tag": tag, "parts": []}
        if tag in TEXT_BLOCKS and tag not in VOID_TAGS:
            self.text_stack.append({"tag": tag, "parts": [], "line": self.getpos()[0]})

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.capture and self.capture["tag"] == tag:
            self.finish_capture()
        if tag == "section":
            self.close_section()
        if self.text_stack and self.text_stack[-1]["tag"] == tag:
            self.check_text(self.text_stack.pop())

    def handle_data(self, data):
        if self.capture:
            self.capture["parts"].append(data)
        for block in self.text_stack:
            block["parts"].append(data)

    def finish_capture(self):
        text = words_in("".join(self.capture["parts"]))
        tag = self.capture["tag"]
        self.capture = None
        if tag == "h1":
            self.titles += 1
            self.title = self.title or text
        elif tag == "p":
            self.lede = self.lede or text
        elif tag == "h2" and self.section is not None and not self.section["heading"]:
            self.section["heading"] = text
            self.awaiting_takeaway = True

    def open_section(self, attrs):
        if self.section is not None:
            self.problems.append(f"{self.where()}: sections cannot be nested; close the previous <section> first")
        self.section = {"id": attrs.get("id", ""), "heading": "", "takeaway": False, "line": self.getpos()[0], "screens": 0}
        if not self.section["id"]:
            self.problems.append(f"{self.where()}: <section> needs an id, the anchor of its entry in the contents")

    def close_section(self):
        if self.section is None:
            return
        if not self.section["heading"]:
            self.problems.append(f"line {self.section['line']}: section {self.section['id'] or '(no id)'} needs an <h2> heading")
        self.sections.append(self.section)
        self.section = None
        self.awaiting_takeaway = False

    def check_image(self, attrs, classes):
        if "screen" not in classes:
            return
        self.screens.append({"src": attrs.get("src", ""), "line": self.getpos()[0]})
        if self.section is not None:
            self.section["screens"] += 1
        if not attrs.get("src"):
            self.problems.append(f"{self.where()}: a screen needs src, the path of its image under screens/")
        if len(attrs.get("alt", "").split()) < 3:
            self.problems.append(f"{self.where()}: a screen needs an alt that says what the screen shows, in three words or more")

    def check_text(self, block):
        text = words_in("".join(block["parts"]))
        if not text:
            return
        if block["tag"] == "h3" and len(text.split()) > HEADING_WORDS:
            self.warnings.append(f'line {block["line"]}: heading "{opening(text)}" has {len(text.split())} words; keep it to {HEADING_WORDS} or fewer')
            return
        for sentence in SENTENCE_BREAK.split(text):
            if len(sentence.split()) > SENTENCE_WORDS:
                self.warnings.append(f'line {block["line"]}: sentence "{opening(sentence)}" has {len(sentence.split())} words; split it to {SENTENCE_WORDS} or fewer')


def scan(content):
    scanner = ContentScanner()
    scanner.feed(content)
    scanner.close()
    if scanner.section is not None:
        scanner.close_section()
    return scanner


def content_problems(scanner):
    problems = list(scanner.problems)
    if scanner.titles != 1 or not scanner.title:
        problems.append(f"the content needs exactly one non-empty <h1>; found {scanner.titles}")
    if not scanner.lede:
        problems.append('the content needs a <p class="lede"> under the <h1>: what the subject does, in one or two sentences')
    if not scanner.sections:
        problems.append('the content needs at least one <section id="<key>"> with an <h2>')
    duplicates = sorted(key for key, count in Counter(scanner.ids).items() if count > 1)
    problems.extend(f'id="{key}" is used more than once' for key in duplicates)
    known = set(scanner.ids)
    problems.extend(f'{where}: the link to #{target} points to no element' for target, where in scanner.local_links if target not in known)
    return problems


def content_warnings(scanner):
    warnings = list(scanner.warnings)
    for section in scanner.sections[1:]:
        if not section["takeaway"]:
            warnings.append(f'line {section["line"]}: section {section["id"]} needs a <p class="takeaway"> right after its <h2>: the one fact the section shows')
    if not scanner.screens:
        warnings.append('the content has no screen; show each step with <img class="screen">')
    return warnings


def image_size(data, suffix):
    if suffix == ".png" and data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if suffix == ".gif" and data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    if suffix == ".webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return webp_size(data)
    if suffix in (".jpg", ".jpeg") and data[:2] == b"\xff\xd8":
        return jpeg_size(data)
    raise GuideError(f"cannot read the size of a {suffix} image; check that the file is a valid {suffix}")


def webp_size(data):
    chunk = data[12:16]
    if chunk == b"VP8 ":
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF
    if chunk == b"VP8L":
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8X":
        return int.from_bytes(data[24:27], "little") + 1, int.from_bytes(data[27:30], "little") + 1
    raise GuideError("unknown WebP chunk")


def jpeg_size(data):
    index = 2
    while index + 9 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height, width = struct.unpack(">HH", data[index + 5:index + 9])
            return width, height
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            index += 2
            continue
        index += 2 + struct.unpack(">H", data[index + 2:index + 4])[0]
    raise GuideError("no frame header found in the JPEG")


class Embedder:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.problems = []
        self.warnings = []
        self.cache = {}
        self.screens = 0

    def load(self, src):
        if src in self.cache:
            return self.cache[src]
        path = (self.base_dir / src).resolve()
        suffix = path.suffix.lower()
        if suffix not in IMAGE_TYPES:
            raise GuideError(f"{src}: use a PNG, JPEG, WebP, or GIF image")
        if not path.is_file():
            raise GuideError(f"{src}: no file at {path}")
        data = path.read_bytes()
        width, height = image_size(data, suffix)
        if len(data) > SCREEN_WARN_BYTES:
            self.warnings.append(f"{src} is {len(data) // 1024} KB; save it as WebP or JPEG at quality 80, under {SCREEN_WARN_BYTES // 1000} KB")
        uri = f"data:{IMAGE_TYPES[suffix]};base64,{base64.b64encode(data).decode('ascii')}"
        self.cache[src] = (uri, width, height)
        return self.cache[src]

    def image(self, match):
        tag = match.group(0)
        attrs = parse_attrs(tag)
        src = attrs.get("src", "")
        if not src or src.startswith(("data:", "http:", "https:", "//")):
            return tag
        try:
            uri, width, height = self.load(src)
        except GuideError as error:
            self.problems.append(str(error))
            return tag
        if "screen" not in class_list(attrs):
            return tag.replace(f'src="{src}"', f'src="{uri}"', 1)
        self.screens += 1
        shape = "tall" if height > width else "wide"
        extra = "".join(
            f' data-{name}="{html.escape(attrs[f"data-{name}"])}"' for name in ("href", "caption") if attrs.get(f"data-{name}")
        )
        alt = html.escape(attrs.get("alt", ""))
        return f'<button class="screen {shape}" type="button"{extra}><img src="{uri}" alt="{alt}" width="{width}" height="{height}"></button>'


def number(value, field, problems):
    try:
        return float(value)
    except (TypeError, ValueError):
        problems.append(f'bars: {field}="{value}" is not a number')
        return None


def render_bars(match, problems):
    attrs = parse_attrs(f"<ul{match.group('attrs')}>")
    maximum = number(attrs.get("data-max"), "data-max", problems)
    mark = number(attrs["data-mark"], "data-mark", problems) if attrs.get("data-mark") else None
    unit = attrs.get("data-unit", "")
    if not maximum:
        return match.group(0)
    rows = []
    for item in BAR_ITEM.finditer(match.group("items")):
        value = number(parse_attrs(f"<li{item.group('attrs')}>").get("data-value"), "data-value", problems)
        if value is None:
            continue
        side = "" if mark is None else (' class="over"' if value > mark else ' class="under"')
        width = min(100, max(0, value / maximum * 100))
        marker = "" if mark is None else f'<span class="bar-mark" style="left:{min(100, mark / maximum * 100):.2f}%"></span>'
        shown = f"{value:g} {unit}".strip()
        rows.append(
            f'<li{side}><span class="bar-label">{item.group("label").strip()}</span>'
            f'<span class="bar-track"><span class="bar-fill" style="width:{width:.2f}%"></span>{marker}</span>'
            f'<span class="bar-value">{html.escape(shown)}</span></li>'
        )
    return f'<ul class="bars" role="list">{"".join(rows)}</ul>'


def transform(content, base_dir):
    embedder = Embedder(base_dir)
    content = IMG_TAG.sub(embedder.image, content)
    bar_problems = []
    content = BARS_LIST.sub(lambda match: render_bars(match, bar_problems), content)
    content = re.sub(r"<table\b", '<div class="table-scroll"><table', content)
    content = content.replace("</table>", "</table></div>")
    return content, embedder.problems + bar_problems, embedder.warnings, embedder.screens


def contents_list(sections):
    items = "".join(f'<li><a href="#{html.escape(section["id"])}">{html.escape(section["heading"])}</a></li>' for section in sections)
    return f"<ol>{items}</ol>"


def ui_strings(lang):
    return UI_STRINGS.get(lang.split("-")[0].lower(), UI_STRINGS["en"])


def read_asset(name):
    return (ASSETS_DIR / name).read_text(encoding="utf-8")


def as_fragment(page):
    head = re.search(r"<head>(.*?)</head>", page, re.DOTALL).group(1)
    body = re.search(r"<body>(.*?)</body>", page, re.DOTALL).group(1)
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
    head = head.replace("</title>", '</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
    return head.strip() + "\n" + body.strip() + "\n"


def render_page(content, scanner, slug, lang, fragment):
    fields = {
        "lang": html.escape(lang),
        "title": html.escape(scanner.title),
        "description": html.escape(scanner.lede),
        "slug": html.escape(slug),
        "date": datetime.now().astimezone().strftime("%Y-%m-%d"),
        "build": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"),
        "toc": contents_list(scanner.sections),
        "content": content.strip(),
        "css": read_asset("guide.css"),
        "js": read_asset("guide.js"),
        **{key: html.escape(value) for key, value in ui_strings(lang).items()},
    }
    page = PLACEHOLDER_PATTERN.sub(lambda match: fields[match.group(1)], read_asset("template.html"))
    return (as_fragment(page) if fragment else page), fields["build"]


def write_atomic(path, text):
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def source_file(value):
    path = Path(value).expanduser().resolve()
    if path.suffix != ".html" or not path.is_file():
        raise GuideError(f"{path} is not an existing .html file")
    if path.name in (OUTPUT_NAME, FRAGMENT_NAME):
        raise GuideError(f"{path.name} is a built page; build from the content file, content.html")
    return path


def build(args):
    source = source_file(args.content_file)
    content = source.read_text(encoding="utf-8")
    scanner = scan(content)
    problems = content_problems(scanner)
    warnings = content_warnings(scanner)
    built_content, embed_problems, embed_warnings, screens = transform(content, source.parent)
    problems += embed_problems
    warnings += embed_warnings
    output = Path(args.out).expanduser().resolve() if args.out else source.parent / (FRAGMENT_NAME if args.fragment else OUTPUT_NAME)
    page, build_id = ("", "")
    if not problems:
        page, build_id = render_page(built_content, scanner, source.parent.name, args.lang, args.fragment)
        size = len(page.encode("utf-8"))
        if size > PAGE_LIMIT_BYTES:
            problems.append(f"the page is {size // 1_000_000} MB; keep it under {PAGE_LIMIT_BYTES // 1_000_000} MB by shrinking the screens")
        elif size > PAGE_WARN_BYTES:
            warnings.append(f"the page is {size // 1_000_000} MB; shrink the largest screens so it loads fast on a phone")
    for problem in problems:
        print(f"problem: {problem}", file=sys.stderr)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    if problems:
        print(f"{len(problems)} problem(s) in {source}; nothing was written", file=sys.stderr)
        return 1
    write_atomic(output, page)
    print(f"built {output}")
    print(f"title: {scanner.title}")
    print(f"sections: {len(scanner.sections)}, screens: {screens}, size: {len(page.encode('utf-8')) // 1024} KB")
    print(f"warnings: {len(warnings)}" + ("; fix each one and build again" if warnings else ""))
    print(f"build: {build_id}")
    running = running_server(output)
    print(f"server: {running} (an open page reloads by itself)" if running else "server: not running; start it with the serve command")
    return 0


def preferred_port(path):
    return PORT_BASE + int(hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:8], 16) % PORT_SPAN


def running_server(path, port=None):
    url = f"http://127.0.0.1:{port or preferred_port(path)}/"
    try:
        with build_opener(ProxyHandler({})).open(f"{url}__build", timeout=1) as response:
            data = json.load(response)
    except (OSError, ValueError):
        return None
    return url if data.get("file") == str(path) else None


class GuideHandler(BaseHTTPRequestHandler):
    server_version = "how-it-works"

    def log_message(self, format, *args):
        return

    def send_body(self, body, content_type, status=200):
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def do_GET(self):
        route = urlsplit(self.path).path
        path = self.server.page_path
        text = path.read_text(encoding="utf-8") if path.is_file() else ""
        if route == "/__build":
            match = BUILD_PATTERN.search(text)
            self.send_body(json.dumps({"file": str(path), "build": match.group(1) if match else ""}), "application/json")
        elif route in ("/", f"/{path.name}"):
            page = text.replace("</body>", f"{RELOAD_SNIPPET}\n</body>") if "</body>" in text else text + RELOAD_SNIPPET
            self.send_body(page, "text/html; charset=utf-8")
        else:
            self.send_body("not found", "text/plain; charset=utf-8", 404)

    do_HEAD = do_GET


def stop_on_signal(signum, frame):
    raise KeyboardInterrupt


def serve(args):
    path = Path(args.page_file).expanduser().resolve()
    if not path.is_file():
        raise GuideError(f"{path} does not exist; run build first")
    running = running_server(path, args.port)
    if running:
        print(f"already serving {path} at {running}", flush=True)
        if args.open:
            webbrowser.open(running)
        return 0
    server = None
    last_error = None
    for port in [args.port] if args.port else [preferred_port(path), 0]:
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), GuideHandler)
            break
        except OSError as error:
            last_error = error
    if server is None:
        raise GuideError(f"cannot bind a local port: {last_error}")
    server.daemon_threads = True
    server.page_path = path
    url = f"http://127.0.0.1:{server.server_port}/"
    signal.signal(signal.SIGTERM, stop_on_signal)
    print(f"serving {path} at {url}", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


def build_parser():
    parser = argparse.ArgumentParser(
        prog="how_it_works.py",
        description="Build and serve a how-it-works page. CONTENT_FILE is .scratch/<slug>/content.html, with its images in .scratch/<slug>/screens/.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    build_command = commands.add_parser("build", help="validate the content, embed the screens, and write the self-contained page next to it")
    build_command.add_argument("content_file")
    build_command.add_argument("--lang", default="en", help="page language tag, for example pt-BR; sets the language of the page controls")
    build_command.add_argument("--fragment", action="store_true", help=f"write {FRAGMENT_NAME} without the document shell, for hosts that wrap pages in their own, such as Claude artifacts")
    build_command.add_argument("--out", help="output path instead of the default next to the content file")
    build_command.set_defaults(handler=build)

    serve_command = commands.add_parser("serve", help="serve the built page on 127.0.0.1 and reload it after each build, reusing a running server")
    serve_command.add_argument("page_file", help=f"the built page, for example .scratch/<slug>/{OUTPUT_NAME}")
    serve_command.add_argument("--port", type=int, help="port to bind instead of the stable port derived from the file path")
    serve_command.add_argument("--open", action="store_true", help="open the page in the default browser")
    serve_command.set_defaults(handler=serve)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except GuideError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
