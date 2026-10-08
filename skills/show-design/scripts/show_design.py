#!/usr/bin/env python3
import argparse
import hashlib
import html
import json
import os
import re
import secrets
import signal
import sys
import tempfile
import threading
import time
import webbrowser
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from urllib.request import ProxyHandler, build_opener

try:
    import fcntl
except ImportError:
    fcntl = None

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
RUNTIME_DIR = Path(tempfile.gettempdir()) / "show-design"
CHANGE_KINDS = ("added", "changed", "removed", "moved", "unchanged")
STATUSES = ("open", "resolved")
MERMAID_TYPE = "text/x-mermaid"
FORBIDDEN_TAGS = ("html", "head", "body", "main")
SECTIONS = (
    ("section:overview", "Overview"),
    ("section:architecture", "Architecture"),
    ("section:flows", "Flows"),
    ("section:changes", "Changes"),
    ("section:data-model", "Data model"),
    ("section:contracts", "Contracts"),
    ("section:risks", "Risks"),
    ("section:questions", "Open questions"),
    ("section:out-of-scope", "Out of scope"),
)
PORT_BASE = 47000
PORT_SPAN = 1000
MAX_REQUEST_BYTES = 1_000_000
PAGE_PATTERN = re.compile(
    r'<main class="design" id="design"[^>]*>\s*(?P<content>.*?)\s*</main>\s*'
    r'<script type="application/json" id="review-comments">\s*(?P<comments>.*?)\s*</script>',
    re.DOTALL,
)
BUILD_PATTERN = re.compile(r'<body[^>]*\bdata-build="([^"]+)"')
PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")
GENERATOR_MARK = '<meta name="generator" content="show-design">'
PROCESS_LOCK = threading.Lock()


class DesignError(Exception):
    def __init__(self, message, status=HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def design_file(value, must_exist=True):
    path = Path(value).expanduser().resolve()
    if path.suffix != ".html":
        raise DesignError(f"{path} is not an .html file")
    if must_exist and not path.is_file():
        raise DesignError(f"{path} does not exist")
    return path


def runtime_key(path):
    return hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:16]


def runtime_path(path, suffix):
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    return RUNTIME_DIR / f"{runtime_key(path)}.{suffix}"


class FileLock:
    def __init__(self, path):
        self.path = runtime_path(path, "lock")
        self.handle = None

    def __enter__(self):
        PROCESS_LOCK.acquire()
        self.handle = open(self.path, "a+")
        if fcntl:
            fcntl.flock(self.handle, fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc_info):
        if fcntl:
            fcntl.flock(self.handle, fcntl.LOCK_UN)
        self.handle.close()
        PROCESS_LOCK.release()


def write_atomic(path, text):
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def read_json_file(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def read_asset(name):
    return (ASSETS_DIR / name).read_text(encoding="utf-8")


def single_line(source):
    return " ".join(line.strip() for line in source.splitlines() if line.strip())


def minify_css(source):
    text = re.sub(r"\s*([{};,>])\s*", r"\1", single_line(source))
    return re.sub(r":\s+", ":", text).replace(";}", "}")


def dump_comments(document):
    text = json.dumps(document, ensure_ascii=False, indent=2)
    return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def parse_page(text):
    match = PAGE_PATTERN.search(text)
    if not match:
        return None
    try:
        document = json.loads(match.group("comments") or "{}")
    except ValueError as error:
        raise DesignError(f"the embedded review comments are not valid JSON: {error}", HTTPStatus.INTERNAL_SERVER_ERROR)
    document.setdefault("version", 1)
    document.setdefault("comments", [])
    return match, document


def load_page(path):
    text = path.read_text(encoding="utf-8")
    parsed = parse_page(text)
    if not parsed:
        raise DesignError(f"{path} is not a built show-design page; run build first", HTTPStatus.CONFLICT)
    return text, parsed[0], parsed[1]


class SourceScanner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.anchors = []
        self.problems = []
        self.title_parts = []
        self.titles = 0
        self.inside_title = False
        self.sections = 0
        self.diagrams = 0
        self.open_sections = []
        self.closed_sections = []
        self.heading_parts = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        anchor = attributes.get("data-anchor")
        line = self.getpos()[0]
        if anchor is not None:
            if anchor == "page":
                self.problems.append(f'line {line}: data-anchor="page" is reserved for the page itself')
            elif anchor.strip():
                self.anchors.append(anchor)
            else:
                self.problems.append(f"line {line}: empty data-anchor on <{tag}>")
        change = attributes.get("data-change")
        if change is not None and change not in CHANGE_KINDS:
            self.problems.append(f'line {line}: data-change="{change}" is not one of {", ".join(CHANGE_KINDS)}')
        if tag in FORBIDDEN_TAGS:
            self.problems.append(f"line {line}: <{tag}> belongs to the page template; write content markup only")
        elif tag == "h1":
            self.titles += 1
            self.inside_title = self.titles == 1
        elif tag == "section":
            self.sections += 1
            self.open_sections.append({"anchor": anchor or "", "line": line, "heading": None})
            if not anchor:
                self.problems.append(f'line {line}: <section> needs data-anchor="section:<key>"')
        elif tag == "h2" and self.open_sections and self.open_sections[-1]["heading"] is None:
            self.heading_parts = []
        elif tag == "script" and attributes.get("type") == MERMAID_TYPE:
            self.diagrams += 1
            if not anchor:
                self.problems.append(f'line {line}: diagram needs data-anchor="diagram:<key>"')
        elif tag == "script":
            self.problems.append(f'line {line}: only <script type="{MERMAID_TYPE}"> diagrams belong in the content')
        elif tag == "pre" and "mermaid" in (attributes.get("class") or "").split():
            self.problems.append(f'line {line}: write diagrams as <script type="{MERMAID_TYPE}">, not <pre class="mermaid">')

    def handle_endtag(self, tag):
        if tag == "h1":
            self.inside_title = False
        elif tag == "h2" and self.heading_parts is not None:
            self.open_sections[-1]["heading"] = " ".join("".join(self.heading_parts).split())
            self.heading_parts = None
        elif tag == "section" and self.open_sections:
            section = self.open_sections.pop()
            if section["heading"] is None:
                self.problems.append(f"line {section['line']}: section {section['anchor']} needs an <h2> heading")
            else:
                self.closed_sections.append(section)

    def handle_data(self, data):
        if self.inside_title:
            self.title_parts.append(data)
        if self.heading_parts is not None:
            self.heading_parts.append(data)

    @property
    def title(self):
        return " ".join("".join(self.title_parts).split())


def scan(content):
    scanner = SourceScanner()
    scanner.feed(content)
    scanner.close()
    return scanner


def content_problems(scanner):
    problems = list(scanner.problems)
    duplicates = sorted(anchor for anchor, count in Counter(scanner.anchors).items() if count > 1)
    problems.extend(f'data-anchor="{anchor}" is used more than once' for anchor in duplicates)
    if scanner.titles != 1 or not scanner.title:
        problems.append(f"the content needs exactly one non-empty <h1>; found {scanner.titles}")
    if scanner.sections == 0:
        problems.append('the content needs at least one <section data-anchor="section:<key>">')
    problems.extend(section_problems(scanner.closed_sections))
    return problems


def section_problems(sections):
    headings = dict(SECTIONS)
    return [
        f'line {section["line"]}: section {section["anchor"]} needs the English heading <h2>{headings[section["anchor"]]}</h2>, found "{section["heading"]}"'
        for section in sections
        if section["anchor"] in headings and section["heading"] != headings[section["anchor"]]
    ]


def feature_slug(path):
    return path.parent.name if path.stem == "design" else path.stem


def render_page(content, document, title, slug, lang):
    fields = {
        "lang": html.escape(lang),
        "title": html.escape(title),
        "slug": html.escape(slug),
        "build": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"),
        "built": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M"),
        "content": content.strip(),
        "comments": dump_comments(document),
        "css": minify_css(read_asset("design.css")),
        "js": single_line(read_asset("review.js")),
    }
    page = PLACEHOLDER_PATTERN.sub(lambda match: fields[match.group(1)], read_asset("template.html"))
    return page, fields["build"]


def build(args):
    path = design_file(args.design_file)
    with FileLock(path):
        text = path.read_text(encoding="utf-8")
        parsed = parse_page(text)
        if not parsed and GENERATOR_MARK in text:
            raise DesignError(
                f"{path} was built before, but its <main class=\"design\" id=\"design\"> element or the review-comments "
                "script after it is broken; restore them so the content and comments can be found"
            )
        content, document = (parsed[0].group("content"), parsed[1]) if parsed else (text, {"version": 1, "comments": []})
        scanner = scan(content)
        problems = content_problems(scanner)
        if problems:
            for problem in problems:
                print(f"problem: {problem}", file=sys.stderr)
            print(f"{len(problems)} problem(s) in {path}; the file was left unchanged", file=sys.stderr)
            return 1
        page, build_id = render_page(content, document, scanner.title, feature_slug(path), args.lang)
        write_atomic(path, page)
    open_comments = sum(1 for comment in document["comments"] if comment.get("status") != "resolved")
    print(f"built {path}")
    print(f"title: {scanner.title}")
    print(f"sections: {scanner.sections}, anchors: {len(scanner.anchors)}, diagrams: {scanner.diagrams}")
    print(f"comments: {len(document['comments'])} ({open_comments} open)")
    print(f"build: {build_id}")
    running = running_server(path)
    print(f"server: {running['url']} (an open page reloads by itself)" if running else "server: not running; start it with the serve command")
    return 0


def comments_version(text):
    match = PAGE_PATTERN.search(text)
    return hashlib.sha1(match.group("comments").encode("utf-8")).hexdigest()[:16] if match else None


def page_build(text):
    match = BUILD_PATTERN.search(text)
    return match.group(1) if match else None


def mutate_comments(path, change):
    with FileLock(path):
        text, match, document = load_page(path)
        result = change(document)
        start, end = match.span("comments")
        write_atomic(path, f"{text[:start]}{dump_comments(document)}{text[end:]}")
        return result


def clean_text(value, limit, field, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise DesignError(f"{field} must be text")
    value = value.strip()
    if required and not value:
        raise DesignError(f"{field} is required")
    if len(value) > limit:
        raise DesignError(f"{field} is longer than {limit} characters")
    return value


def find_comment(document, comment_id):
    for comment in document["comments"]:
        if comment.get("id") == comment_id:
            return comment
    raise DesignError(f"comment {comment_id} does not exist", HTTPStatus.NOT_FOUND)


def new_comment_id(taken):
    while True:
        candidate = f"c{secrets.token_hex(3)}"
        if candidate not in taken:
            return candidate


def clean_point(value):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise DesignError("point must be an object")
    point = {}
    for axis in ("x", "y"):
        number = value.get(axis)
        if not isinstance(number, (int, float)) or isinstance(number, bool) or not 0 <= number <= 1:
            raise DesignError(f"point.{axis} must be a number from 0 to 1")
        point[axis] = round(float(number), 4)
    point["block"] = clean_text(value.get("block"), 200, "point.block")
    return point


def create_comment(path, data):
    now = utc_now()
    comment = {
        "id": "",
        "anchor": clean_text(data.get("anchor"), 500, "anchor", required=True),
        "location": clean_text(data.get("location"), 500, "location"),
        "quote": clean_text(data.get("quote"), 2000, "quote"),
        "body": clean_text(data.get("body"), 10000, "body", required=True),
        "point": clean_point(data.get("point")),
        "status": "open",
        "createdAt": now,
        "updatedAt": now,
        "replies": [],
    }

    def change(document):
        comment["id"] = new_comment_id({item.get("id") for item in document["comments"]})
        document["comments"].append(comment)
        return comment

    return mutate_comments(path, change)


def update_comment(path, comment_id, data):
    status = data.get("status")
    if status is not None and status not in STATUSES:
        raise DesignError(f"status must be one of {', '.join(STATUSES)}")
    body = clean_text(data.get("body"), 10000, "body", required=True) if "body" in data else None

    def change(document):
        comment = find_comment(document, comment_id)
        if status:
            comment["status"] = status
        if body:
            comment["body"] = body
        comment["updatedAt"] = utc_now()
        return comment

    return mutate_comments(path, change)


def delete_comment(path, comment_id):
    def change(document):
        find_comment(document, comment_id)
        document["comments"] = [comment for comment in document["comments"] if comment.get("id") != comment_id]

    mutate_comments(path, change)


def add_reply(path, comment_id, author, body, resolve=False):
    text = clean_text(body, 10000, "reply", required=True)

    def change(document):
        comment = find_comment(document, comment_id)
        now = utc_now()
        comment.setdefault("replies", []).append({"author": author, "body": text, "createdAt": now})
        if resolve:
            comment["status"] = "resolved"
        elif author == "user":
            comment["status"] = "open"
        comment["updatedAt"] = now
        return comment

    return mutate_comments(path, change)


def render_report(data):
    try:
        errors = [
            {"anchor": str(error.get("anchor", "")), "message": str(error.get("message", ""))[:2000]}
            for error in data.get("errors") or []
            if isinstance(error, dict)
        ]
        return {"build": str(data.get("build", "")), "diagrams": int(data.get("diagrams") or 0), "errors": errors, "receivedAt": utc_now()}
    except (TypeError, ValueError, AttributeError) as error:
        raise DesignError(f"invalid render report: {error}")


class DesignServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, path):
        super().__init__(address, DesignHandler)
        self.design_path = path
        self.render = None


class DesignHandler(BaseHTTPRequestHandler):
    server_version = "show-design"

    def log_message(self, format, *args):
        return

    @property
    def path_on_disk(self):
        return self.server.design_path

    def route(self):
        return [unquote(part) for part in urlsplit(self.path).path.strip("/").split("/") if part]

    def trusted(self, write):
        port = self.server.server_port
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        origin = self.headers.get("Origin")
        allowed = self.headers.get("Host", "") in hosts and (origin is None or origin in {f"http://{host}" for host in hosts})
        if allowed and write and self.command in ("POST", "PATCH"):
            allowed = self.headers.get("Content-Type", "").split(";")[0].strip() == "application/json"
        if not allowed:
            self.send_error(HTTPStatus.FORBIDDEN, "request rejected")
        return allowed

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_REQUEST_BYTES:
            raise DesignError("request body is too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            raise DesignError("request body is not valid JSON")
        if not isinstance(data, dict):
            raise DesignError("request body must be a JSON object")
        return data

    def send_body(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def respond(self, action):
        try:
            status, payload = action()
        except DesignError as error:
            status, payload = error.status, {"error": str(error)}
        if status == HTTPStatus.NO_CONTENT:
            self.send_response(status)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        self.send_body(status, json.dumps(payload, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        if not self.trusted(write=False):
            return
        route = self.route()
        if route[:1] == ["api"]:
            return self.respond(lambda: self.api_get(route))
        if route in ([], [self.path_on_disk.name]):
            return self.send_body(HTTPStatus.OK, self.path_on_disk.read_bytes(), "text/html; charset=utf-8")
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        if self.trusted(write=True):
            route = self.route()
            self.respond(lambda: self.api_post(route, self.read_json()))

    def do_PATCH(self):
        if self.trusted(write=True):
            route = self.route()
            self.respond(lambda: self.api_patch(route, self.read_json()))

    def do_DELETE(self):
        if self.trusted(write=True):
            route = self.route()
            self.respond(lambda: self.api_delete(route))

    def api_get(self, route):
        if route == ["api", "health"]:
            return HTTPStatus.OK, {"ok": True, "file": str(self.path_on_disk)}
        text = self.path_on_disk.read_text(encoding="utf-8")
        if route == ["api", "version"]:
            return HTTPStatus.OK, {"build": page_build(text), "comments": comments_version(text)}
        if route == ["api", "comments"]:
            parsed = parse_page(text)
            comments = parsed[1]["comments"] if parsed else []
            return HTTPStatus.OK, {"version": comments_version(text), "comments": comments}
        if route == ["api", "render"]:
            if not self.server.render:
                raise DesignError("no render report yet", HTTPStatus.NOT_FOUND)
            return HTTPStatus.OK, self.server.render
        raise DesignError("not found", HTTPStatus.NOT_FOUND)

    def api_post(self, route, data):
        if route == ["api", "comments"]:
            return HTTPStatus.CREATED, create_comment(self.path_on_disk, data)
        if len(route) == 4 and route[:2] == ["api", "comments"] and route[3] == "replies":
            return HTTPStatus.OK, add_reply(self.path_on_disk, route[2], "user", data.get("body"))
        if route == ["api", "render"]:
            self.server.render = render_report(data)
            return HTTPStatus.OK, {"ok": True}
        raise DesignError("not found", HTTPStatus.NOT_FOUND)

    def api_patch(self, route, data):
        if len(route) == 3 and route[:2] == ["api", "comments"]:
            return HTTPStatus.OK, update_comment(self.path_on_disk, route[2], data)
        raise DesignError("not found", HTTPStatus.NOT_FOUND)

    def api_delete(self, route):
        if len(route) == 3 and route[:2] == ["api", "comments"]:
            delete_comment(self.path_on_disk, route[2])
            return HTTPStatus.NO_CONTENT, None
        raise DesignError("not found", HTTPStatus.NOT_FOUND)


def fetch_json(url):
    with build_opener(ProxyHandler({})).open(url, timeout=2) as response:
        return json.load(response)


def running_server(path):
    info = read_json_file(runtime_path(path, "server.json"))
    if not info:
        return None
    try:
        health = fetch_json(f"{info['url']}api/health")
    except (OSError, ValueError, KeyError):
        return None
    return info if health.get("file") == str(path) else None


def preferred_port(path):
    return PORT_BASE + int(runtime_key(path), 16) % PORT_SPAN


def bind_server(path, requested):
    last_error = None
    for port in [requested] if requested else [preferred_port(path), 0]:
        try:
            return DesignServer(("127.0.0.1", port), path)
        except OSError as error:
            last_error = error
    raise DesignError(f"cannot bind a local port: {last_error}")


def stop_on_signal(signum, frame):
    raise KeyboardInterrupt


def serve(args):
    path = design_file(args.design_file)
    load_page(path)
    running = running_server(path)
    if running:
        print(f"already serving {path} at {running['url']}", flush=True)
        if args.open:
            webbrowser.open(running["url"])
        return 0
    server = bind_server(path, args.port)
    url = f"http://127.0.0.1:{server.server_port}/"
    registry = runtime_path(path, "server.json")
    write_atomic(registry, json.dumps({"pid": os.getpid(), "port": server.server_port, "url": url, "file": str(path), "startedAt": utc_now()}))
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
        info = read_json_file(registry)
        if info and info.get("pid") == os.getpid():
            registry.unlink(missing_ok=True)
    return 0


def status(args):
    path = design_file(args.design_file)
    build_id = page_build(path.read_text(encoding="utf-8"))
    if not build_id:
        raise DesignError(f"{path} is not a built show-design page; run build first")
    deadline = time.monotonic() + args.wait
    report = None
    while True:
        running = running_server(path)
        if running:
            try:
                report = fetch_json(f"{running['url']}api/render")
            except (OSError, ValueError):
                report = None
        if report and report.get("build") == build_id:
            break
        if time.monotonic() >= deadline:
            reason = "the server is not running; start it with serve" if not running else "the page has not reported this build yet; open or reload the page"
            print(f"no render report for build {build_id}: {reason}")
            return 2
        time.sleep(0.5)
    errors = report.get("errors") or []
    if errors:
        print(f"{len(errors)} of {report.get('diagrams', 0)} diagram(s) failed for build {build_id}:")
        for error in errors:
            print(f"- {error.get('anchor')}: {error.get('message')}")
        return 1
    print(f"ok: {report.get('diagrams', 0)} diagram(s) rendered for build {build_id}")
    return 0


def indent(text, prefix="  "):
    return "\n".join(f"{prefix}{line}" for line in str(text).splitlines() or [""])


def list_comments(args):
    path = design_file(args.design_file)
    _, match, document = load_page(path)
    anchors = set(scan(match.group("content")).anchors) | {"page"}
    selected = [comment for comment in document["comments"] if args.all or comment.get("status") != "resolved"]
    if args.json:
        print(json.dumps(selected, ensure_ascii=False, indent=2))
        return 0
    if not selected:
        print("no comments" if args.all else "no open comments")
        return 0
    print(f"{len(selected)} {'comment(s)' if args.all else 'open comment(s)'} in {path}")
    for comment in selected:
        flags = [comment.get("status", "open")]
        if comment.get("anchor") not in anchors:
            flags.append("outdated")
        print(f"\n## {comment.get('id')} · {' · '.join(flags)}")
        print(f"location: {comment.get('location') or comment.get('anchor')}")
        print(f"anchor: {comment.get('anchor')}")
        if comment.get("quote"):
            print(f"quote:\n{indent(comment['quote'])}")
        print(f"comment:\n{indent(comment.get('body', ''))}")
        for reply in comment.get("replies", []):
            print(f"reply from {reply.get('author')}:\n{indent(reply.get('body', ''))}")
    return 0


def reply(args):
    path = design_file(args.design_file)
    text = sys.stdin.read() if args.text == "-" else args.text
    comment = add_reply(path, args.comment_id, "agent", text, resolve=args.resolve)
    print(f"replied to {comment['id']} ({comment['status']})")
    return 0


def build_parser():
    parser = argparse.ArgumentParser(
        prog="show_design.py",
        description="Build, serve, and review a show-design page. DESIGN_FILE is .scratch/<feature-slug>/design.html.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    build_command = commands.add_parser("build", help="validate the content and rebuild the self-contained page in place")
    build_command.add_argument("design_file")
    build_command.add_argument("--lang", default="en", help="page language tag, for example pt-BR")
    build_command.set_defaults(handler=build)

    serve_command = commands.add_parser("serve", help="serve the page and its comment API on 127.0.0.1, reusing a running server")
    serve_command.add_argument("design_file")
    serve_command.add_argument("--port", type=int, help="port to bind instead of the stable port derived from the file path")
    serve_command.add_argument("--open", action="store_true", help="open the page in the default browser")
    serve_command.set_defaults(handler=serve)

    status_command = commands.add_parser("status", help="report whether every diagram of the current build rendered in the open page")
    status_command.add_argument("design_file")
    status_command.add_argument("--wait", type=float, default=0, help="seconds to wait for the page to report the current build")
    status_command.set_defaults(handler=status)

    comments_command = commands.add_parser("comments", help="print the review comments, open ones by default")
    comments_command.add_argument("design_file")
    comments_command.add_argument("--all", action="store_true", help="include resolved comments")
    comments_command.add_argument("--json", action="store_true", help="print the selected comments as JSON")
    comments_command.set_defaults(handler=list_comments)

    reply_command = commands.add_parser("reply", help="add an agent reply to a comment")
    reply_command.add_argument("design_file")
    reply_command.add_argument("comment_id")
    reply_command.add_argument("text", help="reply text, or - to read it from standard input")
    reply_command.add_argument("--resolve", action="store_true", help="mark the comment resolved")
    reply_command.set_defaults(handler=reply)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except DesignError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
