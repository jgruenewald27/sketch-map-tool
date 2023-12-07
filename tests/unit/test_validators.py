import pytest

from sketch_map_tool.exceptions import UploadLimitsExceededError
from sketch_map_tool.validators import (
    validate_type,
    validate_uploaded_sketchmaps,
    validate_uuid,
)


@pytest.mark.parametrize(
    "type_",
    ["quality-report", "sketch-map", "raster-results", "vector-results"],
)
def test_validate_type(type_):
    validate_type(type_)


@pytest.mark.parametrize("type_", ["", "foo", 3, None])
def test_validate_type_invalid(type_):
    with pytest.raises(ValueError):
        validate_type(type_)


def test_validate_file_by_pixel_count(files, monkeypatch):
    with pytest.raises(UploadLimitsExceededError):
        monkeypatch.setenv("SMT_MAX_PIXEL_PER_IMAGE", "10")
        validate_uploaded_sketchmaps(files)


def test_validate_uui(uuid):
    validate_uuid(uuid)


def test_validate_uuid_invalid():
    with pytest.raises(ValueError):
        validate_uuid("")
    with pytest.raises(ValueError):
        validate_uuid("foo")
