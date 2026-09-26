"""Looks up the resolution rule for a classified complaint. The real
TravelNova rule matrix is (near-)1:1 with (category, subcategory) pairs, so
this is primarily a direct lookup with a category-level fallback for the one
subcategory that has no rule, or for a classification the classifier couldn't
narrow to a subcategory.
"""

import re


def _word_overlap(a: str, b: str) -> int:
    words_a = set(re.findall(r"[a-z]+", a.lower()))
    words_b = set(re.findall(r"[a-z]+", b.lower()))
    return len(words_a & words_b)


class RuleMatcher:
    def __init__(self, rules: list[dict]):
        self.rules = rules
        self._by_pair: dict[tuple[str, str], dict] = {
            (r["category"], r["subcategory"]): r for r in rules
        }
        self._by_category: dict[str, list[dict]] = {}
        for r in rules:
            self._by_category.setdefault(r["category"], []).append(r)

    def has_exact_match(self, category: str | None, subcategory: str | None) -> bool:
        return bool(category and subcategory and (category, subcategory) in self._by_pair)

    def match(self, category: str | None, subcategory: str | None) -> list[dict]:
        if not category:
            return []

        if subcategory:
            exact = self._by_pair.get((category, subcategory))
            if exact is not None:
                return [exact]

        candidates = self._by_category.get(category, [])
        if not candidates:
            return []

        if subcategory:
            candidates = sorted(candidates, key=lambda r: _word_overlap(r["subcategory"], subcategory), reverse=True)

        return candidates
