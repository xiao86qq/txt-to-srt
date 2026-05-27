from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "assets"
PICTURE_DIR = ASSETS_DIR / "picture"
SONG_DIR = ASSETS_DIR / "song"
MANIFEST_PATH = ASSETS_DIR / "media-manifest.js"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".flac"}

BACKGROUND_TITLES = {
    "hero-background": "默认蓝天",
    "wallhaven-xejx2l": "森林晨雾",
    "wallhaven-jev965": "湖畔雪山",
    "wallhaven-e8wejo": "灯塔风暴",
    "wallhaven-qrg78l": "暮色栈桥",
    "wallhaven-w5mdxp": "金色群山",
    "wallhaven-9o8ekw": "雨后小镇",
    "wallhaven-rqj3g7": "彩色沙丘",
    "wallhaven-ly2mzy": "海面微光",
    "wallhaven-xepjgv": "极光夜幕",
    "wallhaven-7jrw8y": "雪中小狐",
    "wallhaven-k828y1": "火山雪原",
    "wallhaven-k82d26": "云层航拍",
    "wallhaven-d8e1qm": "山间流云",
}

SONG_IDS = {
    "Stay Alive (From The Secret Life of Walter Mitty Soundtrack) - José González.mp3": "stay-alive",
    "弥敦道 - 洪卓立.mp3": "midun-road",
    "白玫瑰 - 陈奕迅.mp3": "white-rose",
    "森林 - Mr..mp3": "forest",
    "不浪漫罪名 - 王杰.mp3": "unromantic",
    "囍帖街 - 谢安琪.mp3": "wedding-card-street",
    "难念的经 - 周华健.mp3": "hard-scripture",
    "小白 - 周柏豪.mp3": "little-white",
    "最佳损友 - 陈奕迅.mp3": "best-bad-friend",
}

DEFAULT_BACKGROUND_ID = "hero-background"
DEFAULT_SONG_ID = "stay-alive"

RESOLUTION_SUFFIX_RE = re.compile(r"(?:[_-]\d{3,5}x\d{3,5})$", re.IGNORECASE)
UNSAFE_ID_RE = re.compile(r"[^a-z0-9-]+")
WHITESPACE_RE = re.compile(r"\s+")
SOUNDTRACK_SUFFIX_RE = re.compile(r"\s*\([^)]*soundtrack[^)]*\)\s*", re.IGNORECASE)


def stable_hash(value: str, length: int = 8) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:length]


def normalize_stem(stem: str) -> str:
    return RESOLUTION_SUFFIX_RE.sub("", stem).strip()


def slugify(value: str, fallback_prefix: str) -> str:
    original = normalize_stem(value)
    slug = original.lower()
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = UNSAFE_ID_RE.sub("-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")

    if slug:
        return slug

    return f"{fallback_prefix}-{stable_hash(original or fallback_prefix, 6)}"


def unique_id(base_id: str, used_ids: set[str], filename: str) -> str:
    if base_id not in used_ids:
        used_ids.add(base_id)
        return base_id

    next_id = f"{base_id}-{stable_hash(filename, 6)}"
    index = 2

    while next_id in used_ids:
        next_id = f"{base_id}-{stable_hash(filename + str(index), 6)}"
        index += 1

    used_ids.add(next_id)
    return next_id


def browser_src(folder: str, filename: str) -> str:
    return f"./assets/{folder}/{quote(filename)}"


def display_title_from_stem(stem: str) -> str:
    cleaned = normalize_stem(stem)
    cleaned = cleaned.replace("_", " ").replace("-", " ")
    cleaned = WHITESPACE_RE.sub(" ", cleaned).strip()

    if not cleaned:
        return "未命名"

    if re.fullmatch(r"[a-zA-Z0-9 ]+", cleaned):
        return cleaned.title()

    return cleaned


def build_backgrounds() -> list[dict[str, str]]:
    used_ids: set[str] = set()
    entries: list[dict[str, str]] = []

    for path in sorted(PICTURE_DIR.iterdir() if PICTURE_DIR.exists() else [], key=lambda item: item.name.lower()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        normalized_stem = normalize_stem(path.stem)
        base_id = slugify(normalized_stem, "picture")
        item_id = unique_id(base_id, used_ids, path.name)
        title = BACKGROUND_TITLES.get(base_id) or BACKGROUND_TITLES.get(item_id) or display_title_from_stem(normalized_stem)
        entries.append({
            "id": item_id,
            "title": title,
            "src": browser_src("picture", path.name),
            "filename": path.name,
        })

    return sorted(entries, key=lambda item: (item["id"] != DEFAULT_BACKGROUND_ID, item["title"].lower(), item["filename"].lower()))


def parse_song_name(path: Path) -> tuple[str, str]:
    stem = path.stem.strip()

    if " - " in stem:
        title, artist = stem.rsplit(" - ", 1)
    else:
        title, artist = stem, "未知艺术家"

    title = SOUNDTRACK_SUFFIX_RE.sub(" ", title)
    title = WHITESPACE_RE.sub(" ", title).strip() or stem
    artist = WHITESPACE_RE.sub(" ", artist).strip() or "未知艺术家"
    return title, artist


def build_songs() -> list[dict[str, str]]:
    used_ids: set[str] = set()
    entries: list[dict[str, str]] = []

    for path in sorted(SONG_DIR.iterdir() if SONG_DIR.exists() else [], key=lambda item: item.name.lower()):
        if not path.is_file() or path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue

        title, artist = parse_song_name(path)
        base_id = SONG_IDS.get(path.name) or slugify(title, "song")
        item_id = unique_id(base_id, used_ids, path.name)
        entries.append({
            "id": item_id,
            "title": title,
            "artist": artist,
            "src": browser_src("song", path.name),
            "filename": path.name,
        })

    return sorted(entries, key=lambda item: (item["id"] != DEFAULT_SONG_ID, item["title"].lower(), item["artist"].lower()))


def choose_default(default_id: str, entries: list[dict[str, str]]) -> str:
    if any(item["id"] == default_id for item in entries):
        return default_id

    return entries[0]["id"] if entries else default_id


def main() -> None:
    backgrounds = build_backgrounds()
    songs = build_songs()
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "defaults": {
            "backgroundId": choose_default(DEFAULT_BACKGROUND_ID, backgrounds),
            "songId": choose_default(DEFAULT_SONG_ID, songs),
        },
        "backgrounds": backgrounds,
        "songs": songs,
    }

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    json_payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    MANIFEST_PATH.write_text(f"window.MEDIA_LIBRARY = {json_payload};\n", encoding="utf-8")
    print(f"Generated {MANIFEST_PATH.relative_to(PROJECT_ROOT)}")
    print(f"Backgrounds: {len(backgrounds)}")
    print(f"Songs: {len(songs)}")


if __name__ == "__main__":
    main()
