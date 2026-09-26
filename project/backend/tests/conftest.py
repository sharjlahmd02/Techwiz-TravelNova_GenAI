from pathlib import Path

import pytest

from app.services.ground_truth.data_loader import load_ground_truth_data
from app.services.ground_truth_pipeline import GroundTruthPipeline

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@pytest.fixture(scope="session")
def real_ground_truth_data():
    return load_ground_truth_data(DATA_DIR)


@pytest.fixture(scope="session")
def pipeline(real_ground_truth_data) -> GroundTruthPipeline:
    categories, resolution_rules, escalation_rules = real_ground_truth_data
    return GroundTruthPipeline(categories, resolution_rules, escalation_rules)
