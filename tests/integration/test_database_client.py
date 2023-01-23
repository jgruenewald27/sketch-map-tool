from uuid import uuid4

import pytest
from psycopg2.extensions import connection

from sketch_map_tool.database import client


@pytest.fixture()
def db_conn():
    # setup
    client.open_connection()
    yield None
    # teardown
    client.close_connection()


def test_open_connection():
    client.db_conn = None
    client.open_connection()
    assert isinstance(client.db_conn, connection)
    client.close_connection()
    client.db_conn = None


def test_close_closed_connection():
    client.db_conn = None
    client.close_connection()
    assert client.db_conn is None


def test_close_open_connection(db_conn):
    assert isinstance(client.db_conn, connection)
    client.close_connection()
    assert client.db_conn.closed == 0


def test_insert_uuid_map(uuid, db_conn):
    map_ = {"sketch-map": str(uuid4()), "quality-report": str(uuid4())}
    client._insert_id_map(uuid, map_)
    client._delete_id_map(uuid)


def test_delete_uuid_map(uuid, db_conn):
    map_ = {"sketch-map": str(uuid4()), "quality-report": str(uuid4())}
    client._insert_id_map(uuid, map_)
    client._delete_id_map(uuid)


def test_select_uuid_map(uuid, db_conn):
    map_ = {"sketch-map": str(uuid4()), "quality-report": str(uuid4())}
    client._insert_id_map(uuid, map_)
    client._select_id_map(uuid)
    client._delete_id_map(uuid)


def test_get_async_result_id(uuid, db_conn):
    uuid1 = str(uuid4())
    uuid2 = str(uuid4())
    map_ = {"sketch-map": uuid1, "quality-report": uuid2}
    client._insert_id_map(uuid, map_)
    assert uuid1 == client.get_async_result_id(uuid, "sketch-map")
    assert uuid2 == client.get_async_result_id(uuid, "quality-report")
    client._delete_id_map(uuid)


def test_insert_files(files, db_conn):
    ids = client._insert_files(files)
    assert len(ids) == 2
