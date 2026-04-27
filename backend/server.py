from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------------ Database ------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ------------------ App / Router ------------------
app = FastAPI(title="Aura Cosmetics API")
api = APIRouter(prefix="/api")

# ------------------ Auth helpers ------------------
JWT_ALGO = "HS256"


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def make_access(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)


def make_refresh(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)


def _cookie_kwargs(max_age: int):
    """Cookie settings that work both in production HTTPS cross-site and local HTTP same-site dev."""
    secure_env = os.environ.get("COOKIE_SECURE", "auto").lower()
    samesite_env = os.environ.get("COOKIE_SAMESITE", "auto").lower()
    if secure_env == "auto":
        # If running behind HTTPS frontend (deployed), use cross-site safe; else local
        fe = os.environ.get("FRONTEND_URL", "")
        secure = fe.startswith("https://")
    else:
        secure = secure_env == "true"
    if samesite_env == "auto":
        samesite = "none" if secure else "lax"
    else:
        samesite = samesite_env
    return {"httponly": True, "secure": secure, "samesite": samesite, "max_age": max_age, "path": "/"}


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(key="access_token", value=access, **_cookie_kwargs(43200))
    response.set_cookie(key="refresh_token", value=refresh, **_cookie_kwargs(604800))


def clear_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ------------------ Models ------------------
Role = Literal["customer", "worker", "director", "admin"]


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Role
    phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: str


class RegisterCustomer(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CreateWorker(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None


class ProductIn(BaseModel):
    name: str
    description: str
    price: float
    image_url: str
    category: str = "skincare"
    in_stock: bool = True


class ProductOut(ProductIn):
    id: str
    created_at: str


class NewsIn(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None


class NewsOut(NewsIn):
    id: str
    created_at: str


class OrderIn(BaseModel):
    product_id: str
    quantity: int = 1
    note: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None


class SaleIn(BaseModel):
    customer_name: str
    customer_phone: str
    product_id: str
    product_name: str
    quantity: int = 1
    price: float
    reason: str


class QuestionIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str


class ClockIn(BaseModel):
    lat: float
    lng: float


# ------------------ Utility ------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def push_notification(target_role: str, type_: str, title: str, body: str, sound: bool = True, data: Optional[dict] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "target_role": target_role,
        "type": type_,
        "title": title,
        "body": body,
        "sound": sound,
        "data": data or {},
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)


# ------------------ Auth Endpoints ------------------
@api.post("/auth/register")
async def register(body: RegisterCustomer, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "customer",
        "phone": body.phone,
        "lat": body.lat,
        "lng": body.lng,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    access = make_access(user_id, email, "customer")
    refresh = make_refresh(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id,
        "email": email,
        "name": body.name,
        "role": "customer",
        "phone": body.phone,
        "access_token": access,
    }


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")
    access = make_access(user["id"], user["email"], user["role"])
    refresh = make_refresh(user["id"])
    set_auth_cookies(response, access, refresh)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "phone": user.get("phone"),
        "access_token": access,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    clear_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(rt, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = make_access(user["id"], user["email"], user["role"])
        response.set_cookie(key="access_token", value=access, **_cookie_kwargs(43200))
        return {"ok": True, "access_token": access}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ------------------ Public: Products ------------------
@api.get("/products", response_model=List[ProductOut])
async def list_products():
    items = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.get("/products/{pid}", response_model=ProductOut)
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@api.post("/products", response_model=ProductOut)
async def create_product(body: ProductIn, _: dict = Depends(require_roles("admin"))):
    pid = str(uuid.uuid4())
    doc = {**body.model_dump(), "id": pid, "created_at": now_iso()}
    await db.products.insert_one(doc.copy())
    return {**body.model_dump(), "id": pid, "created_at": doc["created_at"]}


@api.put("/products/{pid}", response_model=ProductOut)
async def update_product(pid: str, body: ProductIn, _: dict = Depends(require_roles("admin"))):
    res = await db.products.update_one({"id": pid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Product not found")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    return p


@api.delete("/products/{pid}")
async def delete_product(pid: str, _: dict = Depends(require_roles("admin"))):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# ------------------ Public: News ------------------
@api.get("/news", response_model=List[NewsOut])
async def list_news():
    items = await db.news.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.post("/news", response_model=NewsOut)
async def create_news(body: NewsIn, _: dict = Depends(require_roles("admin"))):
    nid = str(uuid.uuid4())
    doc = {**body.model_dump(), "id": nid, "created_at": now_iso()}
    await db.news.insert_one(doc.copy())
    return {**body.model_dump(), "id": nid, "created_at": doc["created_at"]}


@api.put("/news/{nid}", response_model=NewsOut)
async def update_news(nid: str, body: NewsIn, _: dict = Depends(require_roles("admin"))):
    res = await db.news.update_one({"id": nid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "News not found")
    n = await db.news.find_one({"id": nid}, {"_id": 0})
    return n


@api.delete("/news/{nid}")
async def delete_news(nid: str, _: dict = Depends(require_roles("admin"))):
    await db.news.delete_one({"id": nid})
    return {"ok": True}


# ------------------ Orders (customer creates) ------------------
@api.post("/orders")
async def create_order(body: OrderIn, user: dict = Depends(require_roles("customer"))):
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    oid = str(uuid.uuid4())
    doc = {
        "id": oid,
        "product_id": body.product_id,
        "product_name": product["name"],
        "price": product["price"],
        "quantity": body.quantity,
        "note": body.note,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "user_phone": user.get("phone"),
        "lat": body.lat if body.lat is not None else user.get("lat"),
        "lng": body.lng if body.lng is not None else user.get("lng"),
        "address": body.address,
        "status": "new",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(doc.copy())
    await push_notification(
        target_role="director",
        type_="new_order",
        title="Yangi buyurtma!",
        body=f"{user['name']} - {product['name']} (x{body.quantity})",
        sound=True,
        data={"order_id": oid},
    )
    await push_notification(
        target_role="admin",
        type_="new_order",
        title="Yangi buyurtma!",
        body=f"{user['name']} - {product['name']}",
        sound=True,
        data={"order_id": oid},
    )
    return {"ok": True, "id": oid}


@api.get("/orders")
async def list_orders(user: dict = Depends(require_roles("director", "admin"))):
    items = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


# ------------------ Workers ------------------
@api.get("/workers")
async def list_workers(_: dict = Depends(require_roles("director"))):
    items = await db.users.find({"role": "worker"}, {"_id": 0, "password_hash": 0}).to_list(50)
    return items


@api.post("/workers")
async def create_worker(body: CreateWorker, _: dict = Depends(require_roles("director"))):
    cnt = await db.users.count_documents({"role": "worker"})
    if cnt >= 4:
        raise HTTPException(400, "Maksimal 4 ishchi mumkin")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Bu email band")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "worker",
        "phone": body.phone,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return {"id": uid, "email": email, "name": body.name, "role": "worker"}


@api.delete("/workers/{wid}")
async def delete_worker(wid: str, _: dict = Depends(require_roles("director"))):
    res = await db.users.delete_one({"id": wid, "role": "worker"})
    if res.deleted_count == 0:
        raise HTTPException(404, "Worker not found")
    return {"ok": True}


# ------------------ Sales ------------------
@api.post("/sales")
async def create_sale(body: SaleIn, user: dict = Depends(require_roles("worker"))):
    sid = str(uuid.uuid4())
    purchase_date = datetime.now(timezone.utc)
    doc = {
        "id": sid,
        "worker_id": user["id"],
        "worker_name": user["name"],
        "customer_name": body.customer_name,
        "customer_phone": body.customer_phone,
        "product_id": body.product_id,
        "product_name": body.product_name,
        "quantity": body.quantity,
        "price": body.price,
        "total": body.price * body.quantity,
        "reason": body.reason,
        "purchase_date": purchase_date.isoformat(),
        "follow_up_date": (purchase_date + timedelta(days=30)).isoformat(),
        "follow_up_done": False,
        "created_at": now_iso(),
    }
    await db.sales.insert_one(doc.copy())
    return {"ok": True, "id": sid}


@api.get("/sales")
async def list_sales(user: dict = Depends(get_current_user)):
    if user["role"] == "worker":
        items = await db.sales.find({"worker_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    elif user["role"] in ("director", "admin"):
        items = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    else:
        raise HTTPException(403, "Forbidden")
    return items


@api.get("/reminders")
async def list_reminders(user: dict = Depends(require_roles("worker"))):
    """30-day follow-up reminders for the worker's own customers."""
    now = datetime.now(timezone.utc)
    sales = await db.sales.find(
        {"worker_id": user["id"], "follow_up_done": False},
        {"_id": 0},
    ).sort("follow_up_date", 1).to_list(500)
    due = []
    upcoming = []
    for s in sales:
        try:
            fu = datetime.fromisoformat(s["follow_up_date"])
        except Exception:
            continue
        if fu <= now:
            due.append(s)
        elif fu <= now + timedelta(days=7):
            upcoming.append(s)
    return {"due": due, "upcoming": upcoming}


@api.post("/reminders/{sid}/done")
async def mark_reminder_done(sid: str, user: dict = Depends(require_roles("worker"))):
    res = await db.sales.update_one(
        {"id": sid, "worker_id": user["id"]},
        {"$set": {"follow_up_done": True, "follow_up_done_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ------------------ Attendance ------------------
@api.post("/attendance/clock-in")
async def clock_in(body: ClockIn, user: dict = Depends(require_roles("worker"))):
    now = datetime.now(timezone.utc)
    # Convert to Tashkent (UTC+5)
    tashkent_now = now + timedelta(hours=5)
    is_late = tashkent_now.hour > 8 or (tashkent_now.hour == 8 and tashkent_now.minute > 0)
    is_early = tashkent_now.hour < 8
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "worker_id": user["id"],
        "worker_name": user["name"],
        "type": "in",
        "lat": body.lat,
        "lng": body.lng,
        "timestamp": now.isoformat(),
        "tashkent_time": tashkent_now.strftime("%H:%M"),
        "is_late": is_late,
        "is_early": is_early,
    }
    await db.attendance.insert_one(doc.copy())
    if is_late:
        await push_notification(
            target_role="director",
            type_="late_clock_in",
            title=f"Kechikish: {user['name']}",
            body=f"Ishga {tashkent_now.strftime('%H:%M')} da keldi (8:00 dan kech)",
            sound=True,
            data={"worker_id": user["id"]},
        )
    elif is_early:
        await push_notification(
            target_role="director",
            type_="early_clock_in",
            title=f"Erta keldi: {user['name']}",
            body=f"Ishga {tashkent_now.strftime('%H:%M')} da keldi",
            sound=False,
            data={"worker_id": user["id"]},
        )
    else:
        await push_notification(
            target_role="director",
            type_="clock_in",
            title=f"Ishga keldi: {user['name']}",
            body=f"Vaqt: {tashkent_now.strftime('%H:%M')}",
            sound=False,
            data={"worker_id": user["id"]},
        )
    return {"ok": True, "is_late": is_late, "is_early": is_early}


@api.post("/attendance/clock-out")
async def clock_out(body: ClockIn, user: dict = Depends(require_roles("worker"))):
    now = datetime.now(timezone.utc)
    tashkent_now = now + timedelta(hours=5)
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "worker_id": user["id"],
        "worker_name": user["name"],
        "type": "out",
        "lat": body.lat,
        "lng": body.lng,
        "timestamp": now.isoformat(),
        "tashkent_time": tashkent_now.strftime("%H:%M"),
    }
    await db.attendance.insert_one(doc.copy())
    await push_notification(
        target_role="director",
        type_="clock_out",
        title=f"Ishdan ketdi: {user['name']}",
        body=f"Vaqt: {tashkent_now.strftime('%H:%M')}",
        sound=False,
        data={"worker_id": user["id"]},
    )
    return {"ok": True}


@api.get("/attendance")
async def list_attendance(user: dict = Depends(get_current_user), worker_id: Optional[str] = None):
    if user["role"] == "worker":
        q = {"worker_id": user["id"]}
    elif user["role"] == "director":
        q = {}
        if worker_id:
            q["worker_id"] = worker_id
    else:
        raise HTTPException(403, "Forbidden")
    items = await db.attendance.find(q, {"_id": 0}).sort("timestamp", -1).to_list(2000)
    return items


@api.get("/attendance/today")
async def today_attendance(user: dict = Depends(require_roles("worker"))):
    now = datetime.now(timezone.utc)
    tashkent_now = now + timedelta(hours=5)
    start_of_day = tashkent_now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=5)
    items = await db.attendance.find(
        {
            "worker_id": user["id"],
            "timestamp": {"$gte": start_of_day.isoformat()},
        },
        {"_id": 0},
    ).sort("timestamp", 1).to_list(20)
    in_record = next((x for x in items if x["type"] == "in"), None)
    out_record = next((x for x in items if x["type"] == "out"), None)
    return {"in": in_record, "out": out_record}


# ------------------ Questions ------------------
@api.post("/questions")
async def create_question(body: QuestionIn):
    qid = str(uuid.uuid4())
    doc = {**body.model_dump(), "id": qid, "answered": False, "created_at": now_iso()}
    await db.questions.insert_one(doc.copy())
    await push_notification(
        target_role="admin",
        type_="new_question",
        title="Yangi savol",
        body=f"{body.name}: {body.message[:60]}",
        sound=True,
        data={"question_id": qid},
    )
    return {"ok": True, "id": qid}


@api.get("/questions")
async def list_questions(_: dict = Depends(require_roles("admin"))):
    items = await db.questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/questions/{qid}/answer")
async def mark_answered(qid: str, _: dict = Depends(require_roles("admin"))):
    await db.questions.update_one({"id": qid}, {"$set": {"answered": True}})
    return {"ok": True}


# ------------------ Director: Accounts & Stats ------------------
@api.get("/accounts")
async def all_accounts(_: dict = Depends(require_roles("director"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(2000)
    # attach last sale info for customers
    customers = [u for u in users if u["role"] == "customer"]
    for c in customers:
        last_sale = await db.sales.find_one({"customer_phone": c.get("phone")}, {"_id": 0}, sort=[("created_at", -1)])
        c["last_purchase"] = last_sale
    return users


@api.get("/stats")
async def stats(_: dict = Depends(require_roles("director"))):
    total_users = await db.users.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_workers = await db.users.count_documents({"role": "worker"})
    total_orders = await db.orders.count_documents({})
    total_sales = await db.sales.count_documents({})
    total_products = await db.products.count_documents({})
    # sales by worker (last 30 days)
    pipeline = [
        {"$group": {"_id": "$worker_id", "worker_name": {"$first": "$worker_name"}, "count": {"$sum": 1}, "revenue": {"$sum": "$total"}}},
        {"$sort": {"revenue": -1}},
    ]
    sales_by_worker = await db.sales.aggregate(pipeline).to_list(20)
    for s in sales_by_worker:
        s["worker_id"] = s.pop("_id")
    # sales per day (last 14)
    sales_per_day = []
    today = datetime.now(timezone.utc)
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        day_start = d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = d.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        cnt = await db.sales.count_documents({"created_at": {"$gte": day_start, "$lte": day_end}})
        rev_pipe = [
            {"$match": {"created_at": {"$gte": day_start, "$lte": day_end}}},
            {"$group": {"_id": None, "rev": {"$sum": "$total"}}},
        ]
        rev_res = await db.sales.aggregate(rev_pipe).to_list(1)
        rev = rev_res[0]["rev"] if rev_res else 0
        sales_per_day.append({"date": d.strftime("%m-%d"), "sales": cnt, "revenue": rev})
    return {
        "totals": {
            "users": total_users,
            "customers": total_customers,
            "workers": total_workers,
            "orders": total_orders,
            "sales": total_sales,
            "products": total_products,
        },
        "sales_by_worker": sales_by_worker,
        "sales_per_day": sales_per_day,
    }


# ------------------ Notifications ------------------
@api.get("/notifications")
async def list_notifs(user: dict = Depends(get_current_user), since: Optional[str] = Query(None)):
    if user["role"] not in ("director", "admin"):
        raise HTTPException(403, "Forbidden")
    q = {"target_role": user["role"]}
    if since:
        q["created_at"] = {"$gt": since}
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return items


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, _: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"target_role": user["role"]}, {"$set": {"read": True}})
    return {"ok": True}


# ------------------ Health ------------------
@api.get("/")
async def root():
    return {"app": "Aura Cosmetics API", "ok": True}


# ------------------ Seed ------------------
async def seed():
    # Seed Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aura.uz").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}}
        )

    # Seed Director
    dir_email = os.environ.get("DIRECTOR_EMAIL", "director@aura.uz").lower()
    dir_password = os.environ.get("DIRECTOR_PASSWORD", "Director@2026")
    existing_dir = await db.users.find_one({"email": dir_email})
    if not existing_dir:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": dir_email,
            "password_hash": hash_password(dir_password),
            "name": "Direktor",
            "role": "director",
            "created_at": now_iso(),
        })
    elif not verify_password(dir_password, existing_dir["password_hash"]):
        await db.users.update_one(
            {"email": dir_email},
            {"$set": {"password_hash": hash_password(dir_password), "role": "director"}}
        )

    # Seed sample products if empty
    if await db.products.count_documents({}) == 0:
        sample = [
            {
                "id": str(uuid.uuid4()),
                "name": "Aura Glow Serum",
                "description": "Yengil teksturali va terini chuqur namlantiruvchi yuz uchun yorqinlik beruvchi serum. Vitamin C va hyaluron kislotasi bilan boyitilgan.",
                "price": 285000,
                "image_url": "https://images.unsplash.com/photo-1764694071531-008332b61f43?crop=entropy&cs=srgb&fm=jpg&q=85",
                "category": "skincare",
                "in_stock": True,
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Pure Cleansing Gel",
                "description": "Sezgir teri uchun yumshoq yuvinish geli. Tabiiy ekstraktlar bilan, sulfatesiz formula.",
                "price": 145000,
                "image_url": "https://images.unsplash.com/photo-1773015806006-addf313bda7a?crop=entropy&cs=srgb&fm=jpg&q=85",
                "category": "cleanser",
                "in_stock": True,
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Mineral Ritual Set",
                "description": "Toshlardan olingan mineral kompleks bilan to'liq parvarish to'plami. Krem, toner va niqob.",
                "price": 520000,
                "image_url": "https://images.pexels.com/photos/4841286/pexels-photo-4841286.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
                "category": "set",
                "in_stock": True,
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Velvet Skin Cream",
                "description": "Yumshoq baxmal teri uchun namlovchi krem. Kunlik va kechki foydalanish uchun mos.",
                "price": 195000,
                "image_url": "https://images.pexels.com/photos/6925487/pexels-photo-6925487.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
                "category": "skincare",
                "in_stock": True,
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Aura Signature Eau",
                "description": "Yengil va shahzoda parfyumeriya. Sitrus va ag'och notalari bilan signature aroma.",
                "price": 460000,
                "image_url": "https://images.unsplash.com/photo-1748638348145-d53bc0373166?crop=entropy&cs=srgb&fm=jpg&q=85",
                "category": "fragrance",
                "in_stock": True,
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Botanical Face Mask",
                "description": "Haftalik chuqur tozalovchi niqob. Loy va botanik ekstraktlar.",
                "price": 165000,
                "image_url": "https://images.unsplash.com/photo-1613526513504-e8585909d91c?crop=entropy&cs=srgb&fm=jpg&q=85",
                "category": "mask",
                "in_stock": True,
                "created_at": now_iso(),
            },
        ]
        await db.products.insert_many([s.copy() for s in sample])

    if await db.news.count_documents({}) == 0:
        news = [
            {
                "id": str(uuid.uuid4()),
                "title": "Yangi Glow Serum kollektsiyasi",
                "content": "Yangi Aura Glow Serum kolleksiyamiz endi sotuvda. Vitamin C va hyaluron kislotasi terini yorqinlashtiradi.",
                "image_url": "https://images.unsplash.com/photo-1764694071531-008332b61f43?crop=entropy&cs=srgb&fm=jpg&q=85",
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Qish parvarishi: 5 ta muhim qadam",
                "content": "Qish faslida teringizni quruqlikdan saqlash uchun mineral kompleks va yog'li kremlar muhim ahamiyatga ega.",
                "image_url": "https://images.unsplash.com/photo-1613526513504-e8585909d91c?crop=entropy&cs=srgb&fm=jpg&q=85",
                "created_at": now_iso(),
            },
        ]
        await db.news.insert_many([n.copy() for n in news])


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.products.create_index("id", unique=True)
        await db.orders.create_index([("created_at", -1)])
        await db.sales.create_index([("worker_id", 1), ("created_at", -1)])
        await db.attendance.create_index([("worker_id", 1), ("timestamp", -1)])
        await db.notifications.create_index([("target_role", 1), ("created_at", -1)])
    except Exception as e:
        logging.warning(f"Index error: {e}")
    await seed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ------------------ Mount router & CORS ------------------
app.include_router(api)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [
    frontend_url,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["set-cookie"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
