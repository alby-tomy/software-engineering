"""RAG runbook assistant with TF-IDF fallback (Week 22)."""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from pulsegrid.models import Incident


@dataclass
class RunbookChunk:
    id: str
    title: str
    content: str
    source_file: str


@dataclass
class RunbookIndex:
    chunks: list[RunbookChunk] = field(default_factory=list)
    _tfidf: dict[str, dict[str, float]] = field(default_factory=dict)
    _idf: dict[str, float] = field(default_factory=dict)

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    def ingest_directory(self, path: Path) -> int:
        count = 0
        for md_file in sorted(path.glob("**/*.md")):
            content = md_file.read_text(encoding="utf-8")
            title = md_file.stem.replace("-", " ").title()
            chunk_id = f"{md_file.stem}-{count}"
            self.chunks.append(
                RunbookChunk(id=chunk_id, title=title, content=content, source_file=str(md_file))
            )
            count += 1
        self._build_index()
        return count

    def _build_index(self) -> None:
        doc_freq: Counter[str] = Counter()
        tf_docs: list[Counter[str]] = []
        for chunk in self.chunks:
            tokens = self._tokenize(chunk.title + " " + chunk.content)
            tf = Counter(tokens)
            tf_docs.append(tf)
            doc_freq.update(set(tokens))
        n = len(self.chunks) or 1
        self._idf = {t: math.log(n / (1 + df)) for t, df in doc_freq.items()}
        self._tfidf = {}
        for i, chunk in enumerate(self.chunks):
            tf = tf_docs[i]
            total = sum(tf.values()) or 1
            self._tfidf[chunk.id] = {
                t: (c / total) * self._idf.get(t, 0) for t, c in tf.items()
            }

    def _score(self, query: str, chunk_id: str) -> float:
        q_tokens = self._tokenize(query)
        q_tf = Counter(q_tokens)
        q_vec = {t: (c / (sum(q_tf.values()) or 1)) * self._idf.get(t, 0) for t, c in q_tf.items()}
        d_vec = self._tfidf.get(chunk_id, {})
        dot = sum(q_vec.get(t, 0) * d_vec.get(t, 0) for t in set(q_vec) | set(d_vec))
        return dot

    def search(self, query: str, top_k: int = 3) -> list[RunbookChunk]:
        scored = [(self._score(query, c.id), c) for c in self.chunks]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:top_k] if _ > 0]

    def suggest_for_incident(self, incident: Incident, top_k: int = 3) -> list[RunbookChunk]:
        query = f"{incident.title} {incident.service_id} {' '.join(incident.correlated_services)}"
        return self.search(query, top_k=top_k)
