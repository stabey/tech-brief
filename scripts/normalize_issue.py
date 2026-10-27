#!/usr/bin/env python3
"""Normalize an issue JSON to the schema app.js renders.
sections must be a list of {id, source, items:[{id,title,summary?,url,discussion_url?,meta?}]}.
Converts the dict form {hn:[...],lobsters:[...],v2ex:[...],cn:[...],reddit:[...]} by
restructuring existing fields only (no new content). Usage: normalize_issue.py FILE..."""
import json, sys
NAMES = {"hn": "Hacker News", "lobsters": "Lobsters", "v2ex": "V2EX", "reddit": "Reddit"}
PFX = {"hn": "hn", "lobsters": "lo", "v2ex": "v2", "cn": "cn", "reddit": "rd"}
def meta_of(k, it):
    p = []
    if it.get("subreddit"): p.append("r/" + it["subreddit"])
    if it.get("node"): p.append(it["node"])
    if k == "cn" and it.get("source"): p.append(it["source"])
    if it.get("score") is not None: p.append(f"{it['score']} 分")
    if it.get("comments") is not None: p.append(f"{it['comments']} 评论")
    if it.get("replies") is not None: p.append(f"{it['replies']} 回复")
    if it.get("tags"): p.append(", ".join(it["tags"]))
    return " · ".join(p)
def convert(secs):
    out = []
    for k, items in secs.items():
        if k == "cn":
            srcs = list(dict.fromkeys(i.get("source") for i in items if i.get("source")))
            name = " / ".join(srcs) or "中文社区"
        else:
            name = NAMES.get(k, k)
        new = []
        for n, it in enumerate(items, 1):
            o = {"id": it.get("id") or f"{PFX.get(k,k)}-{n}", "title": it.get("title", "")}
            if it.get("summary"): o["summary"] = it["summary"]
            o["url"] = it.get("url", "")
            d = it.get("discussion_url") or it.get("hn_url")
            if d: o["discussion_url"] = d
            m = it.get("meta") or meta_of(k, it)
            if m: o["meta"] = m
            new.append(o)
        out.append({"id": k, "source": name, "items": new})
    return out
def validate(d):
    assert isinstance(d.get("id"), str)
    for key in ("highlights", "accounts", "sections", "gaps"):
        assert isinstance(d.get(key, []), list), key
    for s in d["sections"]:
        assert isinstance(s.get("source"), str) and isinstance(s.get("items"), list)
        for i in s["items"]: assert i.get("title") and "url" in i
    for a in d["accounts"]: assert a.get("handle") and isinstance(a.get("items", []), list)
if __name__ == "__main__":
    for f in sys.argv[1:]:
        d = json.load(open(f))
        if isinstance(d.get("sections"), dict): d["sections"] = convert(d["sections"])
        validate(d)
        json.dump(d, open(f, "w"), ensure_ascii=False, indent=2); open(f, "a").write("\n")
        print("ok", f, [ (s["source"], len(s["items"])) for s in d["sections"]])
