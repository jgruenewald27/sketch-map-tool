from celery import Celery
from flask import Flask

from sketch_map_tool.config import get_config_value

__version__ = "0.9.0"


def make_flask():
    flask_app = Flask(__name__)

    flask_app.config.update(
        CELERY_CONFIG={
            "broker_url": get_config_value("broker-url"),
            "result_backend": get_config_value("result-backend"),
        }
    )

    return flask_app


def make_celery(flask_app):
    celery_app = Celery(flask_app.import_name)
    celery_app.conf.update(flask_app.config["CELERY_CONFIG"])

    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask
    return celery_app


flask_app = make_flask()
celery_app = make_celery(flask_app)
