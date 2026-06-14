import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChefHat,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  ImagePlus,
  LogOut,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import {
  auth,
  cloudbaseApp,
  db,
  ensureAnonymousSession,
  isCloudBaseConfigured,
  toDocId,
} from "./lib/cloudbase";

const emptyDish = {
  name: "",
  category: "",
  price: "",
  image_url: "",
  is_available: true,
};

const sortOptions = [
  { value: "newest", label: "最新上架" },
  { value: "name", label: "名称排序" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

function formatMoney(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDish(dish) {
  return { ...dish, id: toDocId(dish) };
}

function normalizeOrder(order) {
  return { ...order, id: toDocId(order), order_items: order.items || [] };
}

function isEmailLoginState(loginState) {
  return Boolean(loginState?.user?.email || loginState?.user?.emailVerified);
}

function createUploadId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function App() {
  const [view, setView] = useState(() =>
    window.location.hash === "#admin" ? "admin" : "customer"
  );

  useEffect(() => {
    const onHashChange = () =>
      setView(window.location.hash === "#admin" ? "admin" : "customer");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (!isCloudBaseConfigured) {
    return (
      <main className="setup-screen">
        <div>
          <ChefHat size={40} />
          <h1>点菜网页</h1>
          <p>
            请先复制 <code>.env.example</code> 为 <code>.env</code>，填写
            CloudBase 环境 ID，然后重启开发服务器。
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            window.location.hash = "";
          }}
        >
          <ChefHat size={24} />
          <span>今日点菜</span>
        </a>
        <nav className="view-switch">
          <a className={view === "customer" ? "active" : ""} href="#">
            点菜
          </a>
          <a className={view === "admin" ? "active" : ""} href="#admin">
            后台
          </a>
        </nav>
      </header>

      {view === "admin" ? <AdminApp /> : <CustomerApp />}
    </div>
  );
}

function CustomerApp() {
  const [dishes, setDishes] = useState([]);
  const [cart, setCart] = useState({});
  const [remark, setRemark] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadDishes();
  }, []);

  async function loadDishes() {
    setLoading(true);
    try {
      await ensureAnonymousSession();
      const { data } = await db
        .collection("dishes")
        .where({ is_available: true })
        .orderBy("created_at", "desc")
        .get();
      setDishes((data || []).map(normalizeDish));
    } catch (error) {
      setNotice(error.message);
    }
    setLoading(false);
  }

  const categories = useMemo(() => {
    const values = new Set(dishes.map((dish) => dish.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = dishes.filter((dish) => {
      const matchesQuery =
        !normalized ||
        dish.name.toLowerCase().includes(normalized) ||
        (dish.category || "").toLowerCase().includes(normalized);
      const matchesCategory = category === "all" || dish.category === category;
      return matchesQuery && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "zh-CN");
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [category, dishes, query, sortBy]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([dishId, quantity]) => {
          const dish = dishes.find((item) => item.id === dishId);
          return dish ? { ...dish, quantity } : null;
        })
        .filter(Boolean),
    [cart, dishes]
  );

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  function changeQuantity(dishId, delta) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[dishId] || 0) + delta;
      if (quantity <= 0) delete next[dishId];
      else next[dishId] = quantity;
      return next;
    });
  }

  async function submitOrder() {
    if (!cartItems.length) return;
    setSubmitting(true);
    setNotice("");
    try {
      await ensureAnonymousSession();
      const items = cartItems.map((item) => ({
        dish_id: item.id,
        dish_name: item.name,
        unit_price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number((Number(item.price) * item.quantity).toFixed(2)),
      }));
      await db.collection("orders").add({
        remark: remark.trim() || "",
        total_amount: Number(total.toFixed(2)),
        status: "new",
        items,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
      setCart({});
      setRemark("");
      setNotice("已下单，对方会收到提醒。");
    } catch (error) {
      setNotice(error.message);
    }
    setSubmitting(false);
  }

  return (
    <main className="customer-layout">
      <section className="menu-panel">
        <div className="page-heading">
          <div>
            <p>菜单</p>
            <h1>选择今天想吃的菜</h1>
          </div>
          <button className="icon-button" onClick={loadDishes} title="刷新菜单">
            <Upload size={18} />
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索菜名或分类"
            />
          </label>
          <label className="select-field">
            <Filter size={18} />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option value={item} key={item}>
                  {item === "all" ? "全部分类" : item}
                </option>
              ))}
            </select>
          </label>
          <select
            className="plain-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">正在加载菜单...</div>
        ) : filteredDishes.length ? (
          <div className="dish-grid">
            {filteredDishes.map((dish) => (
              <article className="dish-card" key={dish.id}>
                <div className="dish-image">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} />
                  ) : (
                    <ImagePlus size={32} />
                  )}
                </div>
                <div className="dish-body">
                  <div>
                    <span className="tag">{dish.category || "未分类"}</span>
                    <h2>{dish.name}</h2>
                  </div>
                  <div className="dish-footer">
                    <strong>{formatMoney(dish.price)}</strong>
                    <QuantityControl
                      value={cart[dish.id] || 0}
                      onMinus={() => changeQuantity(dish.id, -1)}
                      onPlus={() => changeQuantity(dish.id, 1)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">没有匹配的菜品</div>
        )}
      </section>

      <aside className="cart-panel">
        <div className="panel-title">
          <ShoppingCart size={20} />
          <h2>订单</h2>
        </div>
        {cartItems.length ? (
          <div className="cart-items">
            {cartItems.map((item) => (
              <div className="cart-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {formatMoney(item.price)} x {item.quantity}
                  </span>
                </div>
                <QuantityControl
                  value={item.quantity}
                  onMinus={() => changeQuantity(item.id, -1)}
                  onPlus={() => changeQuantity(item.id, 1)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">还没有选择菜品</div>
        )}

        <label className="textarea-field">
          <span>备注</span>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="口味、忌口或其他说明"
            rows={4}
          />
        </label>

        <div className="total-row">
          <span>合计</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <button
          className="primary-button"
          disabled={!cartItems.length || submitting}
          onClick={submitOrder}
        >
          <Check size={18} />
          {submitting ? "提交中..." : "下单"}
        </button>
        {notice ? <p className="notice">{notice}</p> : null}
      </aside>
    </main>
  );
}

function AdminApp() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    auth.getLoginState().then((loginState) => {
      setSession(isEmailLoginState(loginState) ? loginState : null);
    });
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setAuthError("");
    try {
      await auth.signInWithEmailAndPassword(email, password);
      const loginState = await auth.getLoginState();
      setSession(loginState || { email });
    } catch (error) {
      setAuthError(error.message);
    }
  }

  if (!session) {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={signIn}>
          <ChefHat size={34} />
          <h1>管理员登录</h1>
          <label>
            邮箱
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primary-button" type="submit">
            登录
          </button>
          {authError ? <p className="notice error">{authError}</p> : null}
        </form>
      </main>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyDish);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef(null);

  useEffect(() => {
    loadAdminData();
    const timer = window.setInterval(checkForNewOrders, 8000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadAdminData() {
    try {
      const [dishResult, orderResult] = await Promise.all([
        db.collection("dishes").orderBy("created_at", "desc").get(),
        db.collection("orders").orderBy("created_at", "desc").limit(50).get(),
      ]);
      setDishes((dishResult.data || []).map(normalizeDish));
      setOrders((orderResult.data || []).map(normalizeOrder));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function checkForNewOrders() {
    try {
      const { data } = await db
        .collection("orders")
        .orderBy("created_at", "desc")
        .limit(10)
        .get();
      const latestNewOrders = (data || []).map(normalizeOrder);
      setOrders((current) => {
        const known = new Set(current.map((order) => order.id));
        const incoming = latestNewOrders.filter((order) => !known.has(order.id));
        if (incoming.length) {
          setMessage(`收到新订单：${formatMoney(incoming[0].total_amount)}`);
          playNotification();
        }
        return [...incoming, ...current].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  function enableSound() {
    audioContextRef.current = new window.AudioContext();
    setSoundEnabled(true);
  }

  function playNotification() {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  }

  function editDish(dish) {
    setEditingId(dish.id);
    setImageFile(null);
    setForm({
      name: dish.name,
      category: dish.category,
      price: String(dish.price),
      image_url: dish.image_url || "",
      is_available: dish.is_available,
    });
  }

  function resetForm() {
    setEditingId(null);
    setImageFile(null);
    setForm(emptyDish);
  }

  async function uploadImage() {
    if (!imageFile) return form.image_url || null;
    const extension = imageFile.name.split(".").pop() || "jpg";
    const cloudPath = `dish-images/${createUploadId()}.${extension}`;
    const uploadResult = await cloudbaseApp.uploadFile({
      cloudPath,
      filePath: imageFile,
    });
    const fileId = uploadResult.fileID;
    const urlResult = await cloudbaseApp.getTempFileURL({
      fileList: [fileId],
    });
    return urlResult.fileList?.[0]?.tempFileURL || fileId;
  }

  async function saveDish(event) {
    event.preventDefault();
    setMessage("");
    try {
      const imageUrl = await uploadImage();
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        image_url: imageUrl,
        is_available: form.is_available,
        updated_at: nowIso(),
      };
      if (editingId) {
        await db.collection("dishes").doc(editingId).update(payload);
      } else {
        await db.collection("dishes").add({
          ...payload,
          created_at: nowIso(),
        });
      }
      setMessage(editingId ? "菜品已更新" : "菜品已新增");
      resetForm();
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteDish(dishId) {
    try {
      await db.collection("dishes").doc(dishId).remove();
      setMessage("菜品已删除");
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleDish(dish) {
    try {
      await db.collection("dishes").doc(dish.id).update({
        is_available: !dish.is_available,
        updated_at: nowIso(),
      });
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function markHandled(orderId) {
    try {
      await db.collection("orders").doc(orderId).update({
        status: "handled",
        updated_at: nowIso(),
      });
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function signOut() {
    await auth.signOut();
    window.location.reload();
  }

  return (
    <main className="admin-layout">
      <section className="admin-main">
        <div className="page-heading">
          <div>
            <p>后台</p>
            <h1>菜品管理</h1>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-button"
              onClick={enableSound}
              disabled={soundEnabled}
            >
              <Bell size={18} />
              {soundEnabled ? "提醒音已启用" : "启用提醒音"}
            </button>
            <button className="icon-button" onClick={signOut} title="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <form className="dish-form" onSubmit={saveDish}>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="菜品名称"
            required
          />
          <input
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            placeholder="分类"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) =>
              setForm({ ...form, price: event.target.value })
            }
            placeholder="价格"
            required
          />
          <label className="file-button">
            <ImagePlus size={18} />
            <span>{imageFile ? imageFile.name : "上传图片"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm({ ...form, is_available: event.target.checked })
              }
            />
            上架
          </label>
          <button className="primary-button" type="submit">
            <Check size={18} />
            {editingId ? "保存修改" : "新增菜品"}
          </button>
          {editingId ? (
            <button className="secondary-button" type="button" onClick={resetForm}>
              取消
            </button>
          ) : null}
        </form>

        {message ? <p className="notice">{message}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>菜品</th>
                <th>分类</th>
                <th>价格</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((dish) => (
                <tr key={dish.id}>
                  <td>
                    <div className="table-dish">
                      <div className="thumb">
                        {dish.image_url ? (
                          <img src={dish.image_url} alt={dish.name} />
                        ) : (
                          <ImagePlus size={18} />
                        )}
                      </div>
                      <strong>{dish.name}</strong>
                    </div>
                  </td>
                  <td>{dish.category}</td>
                  <td>{formatMoney(dish.price)}</td>
                  <td>{dish.is_available ? "上架" : "下架"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        onClick={() => toggleDish(dish)}
                        title={dish.is_available ? "下架" : "上架"}
                      >
                        {dish.is_available ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => editDish(dish)}
                        title="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        onClick={() => deleteDish(dish.id)}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="orders-panel">
        <div className="panel-title">
          <Bell size={20} />
          <h2>订单</h2>
        </div>
        <div className="orders-list">
          {orders.map((order) => (
            <article className={`order-card ${order.status}`} key={order.id}>
              <div className="order-head">
                <div>
                  <strong>{formatMoney(order.total_amount)}</strong>
                  <span>
                    {new Date(order.created_at).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <span className="status-pill">
                  {order.status === "handled" ? "已处理" : "新单"}
                </span>
              </div>
              <ul>
                {(order.order_items || []).map((item) => (
                  <li key={item.id}>
                    {item.dish_name} x {item.quantity}
                  </li>
                ))}
              </ul>
              {order.remark ? <p className="remark">{order.remark}</p> : null}
              {order.status !== "handled" ? (
                <button
                  className="secondary-button"
                  onClick={() => markHandled(order.id)}
                >
                  <Check size={18} />
                  标记已处理
                </button>
              ) : null}
            </article>
          ))}
          {!orders.length ? <div className="empty-state compact">暂无订单</div> : null}
        </div>
      </aside>
    </main>
  );
}

function QuantityControl({ value, onMinus, onPlus }) {
  return (
    <div className="qty-control">
      <button onClick={onMinus} disabled={!value} title="减少" type="button">
        <Minus size={16} />
      </button>
      <span>{value}</span>
      <button onClick={onPlus} title="增加" type="button">
        <Plus size={16} />
      </button>
    </div>
  );
}

export default App;
