from io import BytesIO

from sketch_map_tool import tasks


def test_generate_sketch_map(celery_worker, bbox, format_, size, scale):
    task = tasks.generate_sketch_map.apply_async(
        args=(bbox, format_, "landscape", size, scale)
    )
    result = task.wait()
    assert isinstance(result, BytesIO)


def test_generate_quality_report(celery_app, celery_worker):
    task = tasks.generate_quality_report.apply_async(args=([],))
    result = task.wait()
    assert isinstance(result, BytesIO)
