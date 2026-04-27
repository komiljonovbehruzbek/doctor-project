"""Backend tests for Aura Cosmetics API.
Tests auth, products, news, orders, workers, sales, reminders, attendance,
accounts, stats, notifications, questions, and role-based access control.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://e8141a9d-0cb1-44e0-a382-9161568f7ec7.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@aura.uz", "password": "Admin@2026"}
DIRECTOR = {"email": "director@aura.uz", "password": "Director@2026"}


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


# -------- Session fixtures --------
@pytest.fixture(scope="session")
def admin_token():
    return login(ADMIN)


@pytest.fixture(scope="session")
def director_token():
    return login(DIRECTOR)


@pytest.fixture(scope="session")
def customer():
    """Register a fresh customer."""
    email = f"test_customer_{uuid.uuid4().hex[:8]}@aura.uz"
    payload = {
        "email": email,
        "password": "Customer@2026",
        "name": "Test Customer",
        "phone": "+998901234567",
        "lat": 41.3111,
        "lng": 69.2797,
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": payload["password"], "token": data["access_token"], "id": data["id"]}


@pytest.fixture(scope="session")
def worker(director_token):
    """Create or reuse a worker via director."""
    # Cleanup old test workers (keep capacity available)
    rlist = requests.get(f"{API}/workers", headers=auth_header(director_token), timeout=15)
    if rlist.status_code == 200:
        for w in rlist.json():
            if w["email"].startswith("test_worker_"):
                requests.delete(f"{API}/workers/{w['id']}", headers=auth_header(director_token), timeout=15)
    email = f"test_worker_{uuid.uuid4().hex[:6]}@aura.uz"
    pw = "Worker@2026"
    r = requests.post(
        f"{API}/workers",
        headers=auth_header(director_token),
        json={"email": email, "password": pw, "name": "Test Worker", "phone": "+998901112233"},
        timeout=15,
    )
    assert r.status_code == 200, f"Create worker failed: {r.text}"
    token = login({"email": email, "password": pw})
    return {"email": email, "password": pw, "token": token, "id": r.json()["id"]}


# -------- Health & public --------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_products_seeded():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 6, f"Expected >=6 products, got {len(items)}"


def test_news_seeded():
    r = requests.get(f"{API}/news", timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1


# -------- Auth --------
def test_login_admin():
    t = login(ADMIN)
    assert isinstance(t, str) and len(t) > 0


def test_login_director():
    t = login(DIRECTOR)
    assert isinstance(t, str) and len(t) > 0


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@aura.uz", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_auth_me_with_bearer(admin_token):
    r = requests.get(f"{API}/auth/me", headers=auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_auth_me_unauthenticated():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_register_customer(customer):
    # fixture itself asserts; ensure /me returns customer role
    r = requests.get(f"{API}/auth/me", headers=auth_header(customer["token"]), timeout=15)
    assert r.status_code == 200
    me = r.json()
    assert me["role"] == "customer"
    assert me["phone"] == "+998901234567"
    assert me["lat"] == 41.3111


# -------- Orders --------
def test_create_order_as_customer(customer):
    products = requests.get(f"{API}/products", timeout=15).json()
    pid = products[0]["id"]
    r = requests.post(
        f"{API}/orders",
        headers=auth_header(customer["token"]),
        json={"product_id": pid, "quantity": 2, "note": "TEST_order"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    # Verify director sees it
    director = login(DIRECTOR)
    rl = requests.get(f"{API}/orders", headers=auth_header(director), timeout=15)
    assert rl.status_code == 200
    assert any(o["product_id"] == pid and o.get("note") == "TEST_order" for o in rl.json())


def test_orders_forbidden_for_customer_listing(customer):
    r = requests.get(f"{API}/orders", headers=auth_header(customer["token"]), timeout=15)
    assert r.status_code == 403


# -------- Workers (max 4) --------
def test_create_worker_director_only(worker, customer):
    # customer cannot create
    r = requests.post(
        f"{API}/workers",
        headers=auth_header(customer["token"]),
        json={"email": "x@x.com", "password": "Pass@123", "name": "X"},
        timeout=15,
    )
    assert r.status_code == 403


def test_max_4_workers_enforced(director_token, worker):
    # cleanup created test workers and create up to 4
    rlist = requests.get(f"{API}/workers", headers=auth_header(director_token), timeout=15).json()
    # Existing count
    existing = len(rlist)
    # Add until we hit 4
    created_ids = []
    while existing < 4:
        em = f"test_cap_{uuid.uuid4().hex[:6]}@aura.uz"
        r = requests.post(
            f"{API}/workers",
            headers=auth_header(director_token),
            json={"email": em, "password": "Pass@2026", "name": "Cap"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        created_ids.append(r.json()["id"])
        existing += 1
    # 5th must fail
    em = f"test_cap_{uuid.uuid4().hex[:6]}@aura.uz"
    r = requests.post(
        f"{API}/workers",
        headers=auth_header(director_token),
        json={"email": em, "password": "Pass@2026", "name": "Cap5"},
        timeout=15,
    )
    assert r.status_code == 400
    # cleanup added cap workers
    for wid in created_ids:
        requests.delete(f"{API}/workers/{wid}", headers=auth_header(director_token), timeout=15)


# -------- Sales --------
def test_create_sale_and_follow_up(worker):
    products = requests.get(f"{API}/products", timeout=15).json()
    p = products[0]
    payload = {
        "customer_name": "TEST_cust",
        "customer_phone": "+998900000111",
        "product_id": p["id"],
        "product_name": p["name"],
        "quantity": 2,
        "price": p["price"],
        "reason": "Quruq teri",
    }
    r = requests.post(f"{API}/sales", headers=auth_header(worker["token"]), json=payload, timeout=15)
    assert r.status_code == 200, r.text
    # Verify follow_up_date = purchase + 30 days
    sales = requests.get(f"{API}/sales", headers=auth_header(worker["token"]), timeout=15).json()
    sale = next(s for s in sales if s["customer_phone"] == "+998900000111")
    from datetime import datetime
    pd = datetime.fromisoformat(sale["purchase_date"])
    fu = datetime.fromisoformat(sale["follow_up_date"])
    delta_days = (fu - pd).days
    assert delta_days == 30, f"Expected 30 days, got {delta_days}"


def test_sales_isolation_worker_only_own(worker, director_token):
    # worker only sees own
    r1 = requests.get(f"{API}/sales", headers=auth_header(worker["token"]), timeout=15)
    assert r1.status_code == 200
    for s in r1.json():
        assert s["worker_id"] == worker["id"]
    # director sees all
    r2 = requests.get(f"{API}/sales", headers=auth_header(director_token), timeout=15)
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)


def test_reminders_endpoint(worker):
    r = requests.get(f"{API}/reminders", headers=auth_header(worker["token"]), timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "due" in body and "upcoming" in body
    assert isinstance(body["due"], list) and isinstance(body["upcoming"], list)


# -------- Attendance --------
def test_clock_in_and_today(worker):
    r = requests.post(
        f"{API}/attendance/clock-in",
        headers=auth_header(worker["token"]),
        json={"lat": 41.3111, "lng": 69.2797},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "is_late" in body and "is_early" in body
    # today endpoint
    rt = requests.get(f"{API}/attendance/today", headers=auth_header(worker["token"]), timeout=15)
    assert rt.status_code == 200
    assert rt.json()["in"] is not None


def test_clock_out(worker):
    r = requests.post(
        f"{API}/attendance/clock-out",
        headers=auth_header(worker["token"]),
        json={"lat": 41.3111, "lng": 69.2797},
        timeout=15,
    )
    assert r.status_code == 200


# -------- Director stats / accounts --------
def test_accounts_director(director_token):
    r = requests.get(f"{API}/accounts", headers=auth_header(director_token), timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert any(u["role"] == "admin" for u in users)
    assert any(u["role"] == "director" for u in users)
    # customers should have last_purchase key (could be None)
    for u in users:
        if u["role"] == "customer":
            assert "last_purchase" in u


def test_stats_director(director_token):
    r = requests.get(f"{API}/stats", headers=auth_header(director_token), timeout=15)
    assert r.status_code == 200
    s = r.json()
    assert "totals" in s and "sales_by_worker" in s and "sales_per_day" in s
    assert s["totals"]["users"] >= 2
    assert len(s["sales_per_day"]) == 14


# -------- Notifications --------
def test_notifications_director(director_token):
    r = requests.get(f"{API}/notifications", headers=auth_header(director_token), timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    # since param
    r2 = requests.get(
        f"{API}/notifications",
        headers=auth_header(director_token),
        params={"since": "2099-01-01T00:00:00+00:00"},
        timeout=15,
    )
    assert r2.status_code == 200
    assert r2.json() == []


def test_notifications_forbidden_worker(worker):
    r = requests.get(f"{API}/notifications", headers=auth_header(worker["token"]), timeout=15)
    assert r.status_code == 403


# -------- Products CRUD (admin) --------
def test_products_crud_admin(admin_token):
    payload = {
        "name": "TEST_prod",
        "description": "TEST product",
        "price": 99000,
        "image_url": "https://example.com/x.jpg",
        "category": "skincare",
        "in_stock": True,
    }
    rc = requests.post(f"{API}/products", headers=auth_header(admin_token), json=payload, timeout=15)
    assert rc.status_code == 200
    pid = rc.json()["id"]
    rg = requests.get(f"{API}/products/{pid}", timeout=15)
    assert rg.status_code == 200 and rg.json()["name"] == "TEST_prod"
    payload["name"] = "TEST_prod_v2"
    ru = requests.put(f"{API}/products/{pid}", headers=auth_header(admin_token), json=payload, timeout=15)
    assert ru.status_code == 200 and ru.json()["name"] == "TEST_prod_v2"
    rd = requests.delete(f"{API}/products/{pid}", headers=auth_header(admin_token), timeout=15)
    assert rd.status_code == 200
    rg2 = requests.get(f"{API}/products/{pid}", timeout=15)
    assert rg2.status_code == 404


def test_products_create_forbidden_for_director(director_token):
    payload = {"name": "X", "description": "X", "price": 1, "image_url": "u"}
    r = requests.post(f"{API}/products", headers=auth_header(director_token), json=payload, timeout=15)
    assert r.status_code == 403


# -------- News CRUD (admin) --------
def test_news_crud_admin(admin_token):
    payload = {"title": "TEST_news", "content": "x", "image_url": None}
    rc = requests.post(f"{API}/news", headers=auth_header(admin_token), json=payload, timeout=15)
    assert rc.status_code == 200
    nid = rc.json()["id"]
    payload["title"] = "TEST_news_v2"
    ru = requests.put(f"{API}/news/{nid}", headers=auth_header(admin_token), json=payload, timeout=15)
    assert ru.status_code == 200 and ru.json()["title"] == "TEST_news_v2"
    rd = requests.delete(f"{API}/news/{nid}", headers=auth_header(admin_token), timeout=15)
    assert rd.status_code == 200


# -------- Questions (public POST, admin GET) --------
def test_questions_flow(admin_token):
    msg = f"TEST_q_{uuid.uuid4().hex[:6]}"
    rc = requests.post(
        f"{API}/questions",
        json={"name": "Tester", "email": "t@t.com", "phone": "+99890", "message": msg},
        timeout=15,
    )
    assert rc.status_code == 200
    qid = rc.json()["id"]
    # admin only listing
    rg = requests.get(f"{API}/questions", headers=auth_header(admin_token), timeout=15)
    assert rg.status_code == 200
    assert any(q["id"] == qid for q in rg.json())


def test_questions_listing_forbidden_director(director_token):
    r = requests.get(f"{API}/questions", headers=auth_header(director_token), timeout=15)
    assert r.status_code == 403


# -------- Role-based access spot checks --------
def test_workers_listing_forbidden_admin(admin_token):
    r = requests.get(f"{API}/workers", headers=auth_header(admin_token), timeout=15)
    assert r.status_code == 403


def test_stats_forbidden_admin(admin_token):
    r = requests.get(f"{API}/stats", headers=auth_header(admin_token), timeout=15)
    assert r.status_code == 403
