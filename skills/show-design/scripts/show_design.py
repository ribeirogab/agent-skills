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
KINDS = ("comment", "explain")
LESSON_PREFIX = "lesson:"
DESIGN_LESSON = "lesson:design"
LESSON_STEPS = 2
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
MERMAID_TYPE = "text/x-mermaid"
FORBIDDEN_TAGS = ("html", "head", "body", "main")
SECTIONS = (
    ("section:summary", "Summary"),
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
TAKEAWAY_SECTIONS = (
    "section:architecture",
    "section:flows",
    "section:changes",
    "section:data-model",
    "section:contracts",
    "section:risks",
)
TEXT_BLOCKS = ("p", "li", "dt", "dd", "td", "th", "aside", "blockquote", "summary", "figcaption")
DECISION_TITLE_WORDS = 12
DECISION_REASON_WORDS = 40
SENTENCE_WORDS = 30
FIRST_DIAGRAM_NODES = 12
SENTENCE_BREAK = re.compile(r"(?<=[.!?;])\s+")
FLOWCHART_START = re.compile(r"^\s*(?:%%.*\n\s*)*(?:flowchart|graph)\b")
MERMAID_STRING = re.compile(r'"[^"\n]*"')
FLOWCHART_NODE = re.compile(r"(?<!subgraph )(?<![\w-])([A-Za-z_][\w-]*)\s*[\[({]")
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


def words_in(parts):
    return " ".join("".join(parts).split())


def opening(text, size=8):
    words = text.split()
    return " ".join(words[:size]) + ("…" if len(words) > size else "")


def flowchart_nodes(source):
    if not FLOWCHART_START.match(source):
        return 0
    return len(set(FLOWCHART_NODE.findall(MERMAID_STRING.sub('""', source))))


class SourceScanner(HTMLParser):
    def __init__(self, first_line=1):
        super().__init__(convert_charrefs=True)
        self.line_offset = first_line - 1
        self.anchors = []
        self.problems = []
        self.warnings = []
        self.title_parts = []
        self.titles = 0
        self.inside_title = False
        self.sections = 0
        self.diagrams = 0
        self.open_sections = []
        self.closed_sections = []
        self.heading_parts = None
        self.text_blocks = []
        self.span_depth = 0
        self.pre_depth = 0
        self.decision = None
        self.diagram = None
        self.stack = []
        self.lessons = []
        self.anchor_text = {}

    def warn(self, line, message):
        self.warnings.append(f"line {line}: {message}")

    def innermost_lesson(self):
        return next((entry["ref"] for entry in reversed(self.stack) if entry["kind"] == "lesson"), None)

    def open_lesson(self, anchor, attributes, classes, line):
        lesson = {
            "anchor": anchor or "",
            "line": line,
            "for": (attributes.get("data-lesson-for") or "").strip(),
            "term": (attributes.get("data-lesson-term") or "").strip(),
            "title": "",
            "steps": 0,
            "quizzes": [],
        }
        if "lesson" not in classes:
            self.problems.append(f'line {line}: section {anchor} needs class="lesson"')
        if not lesson["anchor"].startswith(LESSON_PREFIX):
            self.problems.append(f'line {line}: a lesson section needs data-anchor="lesson:<key>"')
        if not lesson["for"]:
            self.problems.append(f"line {line}: lesson {anchor} needs data-lesson-for with the anchor of the element it explains, or page")
        if self.open_sections:
            self.problems.append(f"line {line}: lesson {anchor} sits inside another section; put lessons at the top level, after the base sections")
        self.lessons.append(lesson)
        return lesson

    def track_lesson_markup(self, tag, attributes, classes, line, entry):
        parent = self.stack[-1] if self.stack else {"kind": None, "ref": None}
        if tag == "h3" and parent["kind"] == "lesson":
            parent["ref"]["steps"] += 1
        elif tag == "ol" and "quiz" in classes:
            entry["kind"], entry["ref"] = "quiz", {"line": line, "questions": []}
            lesson = self.innermost_lesson()
            if lesson:
                lesson["quizzes"].append(entry["ref"])
            else:
                self.problems.append(f'line {line}: <ol class="quiz"> belongs inside a lesson section')
        elif tag == "li" and parent["kind"] == "quiz":
            entry["kind"], entry["ref"] = "question", {"line": line, "lists": 0, "choices": 0, "correct": 0, "why": 0}
            parent["ref"]["questions"].append(entry["ref"])
        elif tag == "ul" and "choices" in classes and parent["kind"] == "question":
            entry["kind"], entry["ref"] = "choices", parent["ref"]
            parent["ref"]["lists"] += 1
        elif tag == "li" and parent["kind"] == "choices":
            parent["ref"]["choices"] += 1
            parent["ref"]["correct"] += "data-correct" in attributes
        elif tag == "p" and "why" in classes and parent["kind"] == "question":
            parent["ref"]["why"] += 1

    def check_quiz(self, quiz):
        if not quiz["questions"]:
            self.problems.append(f'line {quiz["line"]}: a quiz needs one <li> per question')
        for question in quiz["questions"]:
            line = question["line"]
            if question["lists"] != 1 or question["choices"] < 2:
                self.problems.append(f'line {line}: a quiz question needs one <ul class="choices"> with two or more <li> choices')
            if question["correct"] != 1:
                self.problems.append(f'line {line}: a quiz question needs exactly one <li data-correct> choice; found {question["correct"]}')
            if question["why"] != 1:
                self.problems.append(f'line {line}: a quiz question needs one <p class="why"> that explains the right answer')

    def check_lesson(self, lesson):
        if lesson["steps"] < LESSON_STEPS:
            self.warn(lesson["line"], f"lesson {lesson['anchor']} has {lesson['steps']} <h3> step(s); teach it in {LESSON_STEPS} or more steps, starting from the problem the concept solves")

    def close_element(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] != tag:
                continue
            closed = self.stack[index:]
            del self.stack[index:]
            for entry in reversed(closed):
                if entry["kind"] == "quiz":
                    self.check_quiz(entry["ref"])
                elif entry["kind"] == "lesson":
                    self.check_lesson(entry["ref"])
            return

    def check_takeaway(self, tag, classes):
        section = self.open_sections[-1] if self.open_sections else None
        if not section or not section.get("awaits_takeaway"):
            return
        section["awaits_takeaway"] = False
        if tag != "p" or "takeaway" not in classes:
            self.warn(section["line"], f'section {section["anchor"]} needs <p class="takeaway"> right after its <h2>: its conclusion in one sentence')

    def open_text_block(self, tag, classes, anchor, line):
        if tag in TEXT_BLOCKS or (tag == "span" and "note" in classes):
            self.text_blocks.append({"tag": tag, "line": line, "parts": [], "span_depth": self.span_depth, "decision": (anchor or "").startswith("decision:")})

    def close_text_block(self, tag):
        top = self.text_blocks[-1] if self.text_blocks else None
        if tag == "span":
            if top and top["tag"] == "span" and top["span_depth"] == self.span_depth:
                self.check_sentences(self.text_blocks.pop())
            return
        positions = [index for index, block in enumerate(self.text_blocks) if block["tag"] == tag]
        if not positions:
            return
        while len(self.text_blocks) > positions[-1]:
            self.check_sentences(self.text_blocks.pop())

    def check_sentences(self, block):
        if block["decision"]:
            return
        for sentence in SENTENCE_BREAK.split(words_in(block["parts"])):
            size = len(sentence.split())
            if size > SENTENCE_WORDS:
                self.warn(block["line"], f'a sentence of {size} words, over {SENTENCE_WORDS}: "{opening(sentence)}"; split it into short sentences')

    def track_decision(self, tag, anchor, line):
        if tag == "li" and (anchor or "").startswith("decision:"):
            self.decision = {"anchor": anchor, "line": line, "title": [], "reason": [], "part": None}
        elif self.decision and tag == "strong" and not self.decision["title"]:
            self.decision["part"] = "title"
        elif self.decision and tag == "p":
            self.decision["part"] = "reason"

    def end_decision(self, tag):
        if not self.decision:
            return
        if (tag, self.decision["part"]) in (("strong", "title"), ("p", "reason")):
            self.decision["part"] = None
        elif tag == "li":
            self.check_decision(self.decision)
            self.decision = None

    def check_decision(self, decision):
        title = len(words_in(decision["title"]).split())
        reason = len(words_in(decision["reason"]).split())
        if title > DECISION_TITLE_WORDS:
            self.warn(decision["line"], f"{decision['anchor']} states the decision in {title} words, over {DECISION_TITLE_WORDS}; keep the decision and move its mechanics to the section that owns them")
        if reason > DECISION_REASON_WORDS:
            self.warn(decision["line"], f"{decision['anchor']} gives its reason in {reason} words, over {DECISION_REASON_WORDS}; keep the why in one or two sentences and move the how to the section that owns it")

    def start_diagram(self, anchor, line):
        section = self.open_sections[-1] if self.open_sections else None
        first = bool(section) and not section.get("diagrams")
        if section:
            section["diagrams"] = section.get("diagrams", 0) + 1
        self.diagram = {"anchor": anchor, "line": line, "parts": [], "first": first}

    def end_diagram(self):
        diagram, self.diagram = self.diagram, None
        nodes = flowchart_nodes("".join(diagram["parts"]))
        if diagram["first"] and nodes > FIRST_DIAGRAM_NODES:
            self.warn(diagram["line"], f"{diagram['anchor']} opens its section with {nodes} nodes, over {FIRST_DIAGRAM_NODES}; open with an overview of 8 nodes or fewer and put this diagram after it")

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        anchor = attributes.get("data-anchor")
        classes = (attributes.get("class") or "").split()
        line = self.getpos()[0] + self.line_offset
        entry = {"tag": tag, "kind": None, "ref": None, "anchor": anchor.strip() if anchor and anchor.strip() else None}
        self.track_lesson_markup(tag, attributes, classes, line, entry)
        self.check_takeaway(tag, classes)
        self.open_text_block(tag, classes, anchor, line)
        self.track_decision(tag, anchor, line)
        if tag == "span":
            self.span_depth += 1
        elif tag == "pre":
            self.pre_depth += 1
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
            section = {"anchor": anchor or "", "line": line, "heading": None}
            if "lesson" in classes or (anchor or "").startswith(LESSON_PREFIX):
                section["lesson"] = entry["ref"] = self.open_lesson(anchor, attributes, classes, line)
                entry["kind"] = "lesson"
            self.open_sections.append(section)
            if not anchor:
                self.problems.append(f'line {line}: <section> needs data-anchor="section:<key>"')
        elif tag == "h2" and self.open_sections and self.open_sections[-1]["heading"] is None:
            self.heading_parts = []
        elif tag == "script" and attributes.get("type") == MERMAID_TYPE:
            self.diagrams += 1
            self.start_diagram(anchor, line)
            if not anchor:
                self.problems.append(f'line {line}: diagram needs data-anchor="diagram:<key>"')
        elif tag == "script":
            self.problems.append(f'line {line}: only <script type="{MERMAID_TYPE}"> diagrams belong in the content')
        elif tag == "pre" and "mermaid" in (attributes.get("class") or "").split():
            self.problems.append(f'line {line}: write diagrams as <script type="{MERMAID_TYPE}">, not <pre class="mermaid">')
        if entry["anchor"]:
            self.anchor_text.setdefault(entry["anchor"], [])
        if tag not in VOID_TAGS:
            self.stack.append(entry)

    def handle_endtag(self, tag):
        if tag == "span":
            self.span_depth = max(0, self.span_depth - 1)
        elif tag == "pre":
            self.pre_depth = max(0, self.pre_depth - 1)
        elif tag == "script" and self.diagram:
            self.end_diagram()
        self.close_text_block(tag)
        self.end_decision(tag)
        if tag == "h1":
            self.inside_title = False
        elif tag == "h2" and self.heading_parts is not None:
            section = self.open_sections[-1]
            section["heading"] = " ".join("".join(self.heading_parts).split())
            section["awaits_takeaway"] = section["anchor"] in TAKEAWAY_SECTIONS or "lesson" in section
            if "lesson" in section:
                section["lesson"]["title"] = section["heading"]
            self.heading_parts = None
        elif tag == "section" and self.open_sections:
            self.check_takeaway("section", [])
            section = self.open_sections.pop()
            if section["heading"] is None:
                self.problems.append(f"line {section['line']}: section {section['anchor']} needs an <h2> heading")
            else:
                self.closed_sections.append(section)
        if tag not in VOID_TAGS:
            self.close_element(tag)

    def handle_data(self, data):
        for entry in self.stack:
            if entry["anchor"]:
                self.anchor_text[entry["anchor"]].append(data)
        if self.inside_title:
            self.title_parts.append(data)
        if self.heading_parts is not None:
            self.heading_parts.append(data)
        if self.diagram:
            self.diagram["parts"].append(data)
            return
        if self.decision and self.decision["part"]:
            self.decision[self.decision["part"]].append(data)
        if self.text_blocks and not self.pre_depth:
            self.text_blocks[-1]["parts"].append(data)

    @property
    def title(self):
        return " ".join("".join(self.title_parts).split())


def scan(content, first_line=1):
    scanner = SourceScanner(first_line)
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
    problems.extend(lesson_problems(scanner))
    return problems


def lesson_problems(scanner):
    targets = set(scanner.anchors) | {"page"}
    return [
        f'line {lesson["line"]}: lesson {lesson["anchor"]} has data-lesson-for="{lesson["for"]}", which no element of the design carries'
        for lesson in scanner.lessons
        if lesson["for"] and (lesson["for"] not in targets or lesson["for"].startswith(LESSON_PREFIX))
    ]


def lesson_warnings(scanner):
    warnings = []
    design = next((lesson for lesson in scanner.lessons if lesson["anchor"] == DESIGN_LESSON), None)
    if not design:
        warnings.append('the content needs <section class="lesson" data-anchor="lesson:design" data-lesson-for="page">: a lesson on the whole design that ends with a quiz')
    elif design["for"] != "page":
        warnings.append(f'line {design["line"]}: lesson:design teaches the whole design; set data-lesson-for="page"')
    elif not design["quizzes"]:
        warnings.append(f'line {design["line"]}: lesson:design needs a quiz (<ol class="quiz">) on the main decisions')
    for lesson in scanner.lessons:
        text = " ".join("".join(scanner.anchor_text.get(lesson["for"], [])).split()).lower()
        if lesson["term"] and lesson["for"] != "page" and text and lesson["term"].lower() not in text:
            warnings.append(f'line {lesson["line"]}: lesson {lesson["anchor"]} marks the term "{lesson["term"]}", which the text of {lesson["for"]} does not contain')
    return warnings


def is_request(comment):
    return comment.get("kind") == "explain"


def request_warnings(scanner, document):
    lessons = {lesson["anchor"] for lesson in scanner.lessons}
    return [
        f"request {request.get('id')} is answered with {request['lesson']}, which the content no longer has; restore the lesson or answer the request again"
        for request in document["comments"]
        if is_request(request) and request.get("lesson") and request["lesson"] not in lessons
    ]


def content_warnings(scanner):
    warnings = list(scanner.warnings)
    if scanner.sections and not any(section["anchor"] == "section:summary" for section in scanner.closed_sections):
        warnings.append('the content needs <section data-anchor="section:summary"> first: what changes, for a reader who reads nothing else')
    if scanner.sections:
        warnings.extend(lesson_warnings(scanner))
    return warnings


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
        first_line = text.count("\n", 0, parsed[0].start("content")) + 1 if parsed else 1
        scanner = scan(content, first_line)
        problems = content_problems(scanner)
        warnings = content_warnings(scanner) + request_warnings(scanner, document)
        for problem in problems:
            print(f"problem: {problem}", file=sys.stderr)
        for warning in warnings:
            print(f"warning: {warning}", file=sys.stderr)
        if problems:
            print(f"{len(problems)} problem(s) in {path}; the file was left unchanged", file=sys.stderr)
            return 1
        page, build_id = render_page(content, document, scanner.title, feature_slug(path), args.lang)
        write_atomic(path, page)
    comments = [comment for comment in document["comments"] if not is_request(comment)]
    requests = [comment for comment in document["comments"] if is_request(comment)]
    print(f"built {path}")
    print(f"title: {scanner.title}")
    print(f"sections: {scanner.sections}, anchors: {len(scanner.anchors)}, diagrams: {scanner.diagrams}, lessons: {len(scanner.lessons)}")
    print(f"comments: {len(comments)} ({sum(1 for comment in comments if comment.get('status') != 'resolved')} open)")
    print(f"explanation requests: {len(requests)} ({sum(1 for request in requests if request.get('status') != 'resolved')} open)")
    print(f"warnings: {len(warnings)}" + ("; rewrite the text each warning names and build again" if warnings else ""))
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
    kind = data.get("kind") or "comment"
    if kind not in KINDS:
        raise DesignError(f"kind must be one of {', '.join(KINDS)}")
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
    if kind == "explain":
        comment["kind"] = kind

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


def add_lesson_answer(path, request_id, lesson, body):
    text = clean_text(body, 10000, "answer", required=True)

    def change(document):
        request = find_comment(document, request_id)
        if not is_request(request):
            raise DesignError(f"{request_id} is a review comment, not an explanation request; answer it with reply")
        now = utc_now()
        request.setdefault("replies", []).append({"author": "agent", "body": text, "lesson": lesson, "createdAt": now})
        request["lesson"] = lesson
        request["status"] = "resolved"
        request["updatedAt"] = now
        return request

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
    selected = [comment for comment in document["comments"] if not is_request(comment) and (args.all or comment.get("status") != "resolved")]
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


def list_requests(args):
    path = design_file(args.design_file)
    _, match, document = load_page(path)
    scanner = scan(match.group("content"))
    anchors = set(scanner.anchors) | {"page"}
    lessons = {lesson["anchor"] for lesson in scanner.lessons}
    selected = [request for request in document["comments"] if is_request(request) and (args.all or request.get("status") != "resolved")]
    if args.json:
        print(json.dumps(selected, ensure_ascii=False, indent=2))
        return 0
    if not selected:
        print("no explanation requests" if args.all else "no open explanation requests")
        return 0
    print(f"{len(selected)} {'explanation request(s)' if args.all else 'open explanation request(s)'} in {path}")
    for request in selected:
        flags = [request.get("status", "open")]
        if request.get("anchor") not in anchors:
            flags.append("outdated")
        if request.get("lesson"):
            flags.append(request["lesson"] if request["lesson"] in lessons else f"{request['lesson']} missing")
        print(f"\n## {request.get('id')} · {' · '.join(flags)}")
        print(f"location: {request.get('location') or request.get('anchor')}")
        print(f"anchor: {request.get('anchor')}")
        if request.get("quote"):
            print(f"quote:\n{indent(request['quote'])}")
        print(f"request:\n{indent(request.get('body', ''))}")
        for message in request.get("replies", []):
            print(f"reply from {message.get('author')}:\n{indent(message.get('body', ''))}")
    return 0


def answer(args):
    path = design_file(args.design_file)
    _, match, _ = load_page(path)
    lesson = next((item for item in scan(match.group("content")).lessons if item["anchor"] == args.lesson), None)
    if not lesson:
        raise DesignError(f"{args.lesson} is not a lesson section in {path}; write the lesson into the content first")
    text = sys.stdin.read() if args.text == "-" else args.text or f"Lesson ready: {lesson['title']}"
    request = add_lesson_answer(path, args.request_id, args.lesson, text)
    print(f"answered {request['id']} with {args.lesson} ({request['status']})")
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

    comments_command = commands.add_parser("comments", help="print the review comments, open ones by default; explanation requests are listed by requests")
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

    requests_command = commands.add_parser("requests", help="print the explanation requests, open ones by default")
    requests_command.add_argument("design_file")
    requests_command.add_argument("--all", action="store_true", help="include answered requests")
    requests_command.add_argument("--json", action="store_true", help="print the selected requests as JSON")
    requests_command.set_defaults(handler=list_requests)

    answer_command = commands.add_parser("answer", help="close an explanation request with a reply that points to its lesson")
    answer_command.add_argument("design_file")
    answer_command.add_argument("request_id")
    answer_command.add_argument("lesson", help="anchor of the lesson section that answers the request, for example lesson:postgres-view")
    answer_command.add_argument("text", nargs="?", help="reply text, or - to read it from standard input; defaults to a line naming the lesson")
    answer_command.set_defaults(handler=answer)
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
