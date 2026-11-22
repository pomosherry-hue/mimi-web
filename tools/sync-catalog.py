#!/usr/bin/env python3
"""把仓库根目录 data/catalog.json 同步到网页版。在仓库根目录运行：

    python3 web/tools/sync-catalog.py
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
src = ROOT / "data" / "catalog.json"
web = ROOT / "web"
data = json.loads(src.read_text(encoding="utf-8"))
(web / "data" / "catalog.json").write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
js = (
    "/* 由 tools/sync-catalog.py 从 data/catalog.json 生成，请勿手改 */\n"
    "window.MIMI_CATALOG = "
    + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    + ";\n"
)
(web / "js" / "catalog.js").write_text(js, encoding="utf-8")
print("synced", src, "-> web/data/catalog.json and web/js/catalog.js")
