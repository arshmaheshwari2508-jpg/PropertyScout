"""Regression tests for shared Python locality resolver (BUG 046)."""

import pytest

from src.data.locality_resolver import (
    extract_localities_from_text,
    extract_locality_from_text,
)


def test_major_bengaluru_neighborhoods():
    assert "Indiranagar" in extract_localities_from_text("rent in Indiranagar")
    assert "Koramangala" in extract_localities_from_text("Koramangala 2BHK")
    assert "Whitefield" in extract_localities_from_text("Whitefield rental")
    assert "JP Nagar" in extract_localities_from_text("JP Nagar flat")
    assert "HSR Layout" in extract_localities_from_text("HSR Layout under 40k")


def test_stt_come_does_not_map_to_cantonment():
    assert "Cantonment Area" not in extract_localities_from_text("come")


def test_containment_area_maps_to_cantonment():
    assert "Cantonment Area" in extract_localities_from_text("containment area")


def test_sarjapur_road_maps_to_sarjapura():
    locs = extract_localities_from_text("Sarjapur Road rental")
    assert any("Sarjapura" in loc for loc in locs)


def test_pivot_prefers_latest_locality():
    loc = extract_locality_from_text("Show me Koramangala instead of Cantonment")
    assert loc == "Koramangala"
