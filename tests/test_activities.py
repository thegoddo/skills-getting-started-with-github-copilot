from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # expect some known activities from the sample data
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_and_unregister_lifecycle():
    activity = "Chess Club"
    email = "test.user@example.com"

    # Ensure email not present initially
    res = client.get("/activities")
    assert res.status_code == 200
    activities = res.json()
    assert email not in activities[activity]["participants"]

    # Sign up
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    json_body = res.json()
    assert "Signed up" in json_body.get("message", "")

    # Verify participant added
    res = client.get("/activities")
    activities = res.json()
    assert email in activities[activity]["participants"]

    # Unregister
    res = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res.status_code == 200
    json_body = res.json()
    assert "Unregistered" in json_body.get("message", "")

    # Verify participant removed
    res = client.get("/activities")
    activities = res.json()
    assert email not in activities[activity]["participants"]
*** End Patch