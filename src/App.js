/**
 * EntryShield AI – Smart Society Gate Management System
 * 
 * Architecture:
 * - React functional components with hooks
 * - Firebase Auth + Firestore (simulated for demo)
 * - Gemini API OCR simulation
 * - Role-based access: Guard (full) | Admin (view-only)
 * - Tailwind CSS via CDN (inline styles used for artifact compatibility)
 * 
 * Collections (Firestore schema):
 *   users       : { uid, name, email, role: 'guard'|'admin', societyId, createdAt }
 *   vehicles    : { plateNumber, ownerName, flatNumber, phone, type, createdAt }
 *   visitors    : { name, phone, flatNumber, vehicleNumber, purpose, entryTime, exitTime, status, guardId }
 *   entryLogs   : { type:'resident'|'visitor'|'unknown', plateNumber, timestamp, action, guardId }
 *   alerts      : { plateNumber, timestamp, type, status:'active'|'resolved', message, guardId }
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── MOCK DATA & SIMULATION LAYER ───────────────────────────────────────────

const MOCK_REGISTERED_VEHICLES = [
  { plateNumber: "DL3CAB1234", ownerName: "Rajesh Kumar", flatNumber: "A-101", phone: "9876543210", type: "Car" },
  { plateNumber: "HR26DN5678", ownerName: "Priya Sharma", flatNumber: "B-205", phone: "9876543211", type: "SUV" },
  { plateNumber: "UP16BT9012", ownerName: "Amit Singh", flatNumber: "C-302", phone: "9876543212", type: "Motorcycle" },
  { plateNumber: "MH02CD3456", ownerName: "Sunita Verma", flatNumber: "D-410", phone: "9876543213", type: "Car" },
  { plateNumber: "DL8CXB7890", ownerName: "Vikram Malhotra", flatNumber: "A-204", phone: "9876543214", type: "Car" },
];

const INITIAL_VISITORS = [
  { id: "v1", name: "Rohit Gupta", phone: "9812345670", flatNumber: "A-101", vehicleNumber: "DL9CAA0001", purpose: "Delivery", entryTime: new Date(Date.now() - 3600000).toISOString(), status: "inside" },
  { id: "v2", name: "Meena Devi", phone: "9812345671", flatNumber: "B-205", vehicleNumber: "HR51BZ1122", purpose: "Domestic Help", entryTime: new Date(Date.now() - 7200000).toISOString(), status: "exited" },
];

const INITIAL_ALERTS = [
  { id: "a1", plateNumber: "PB11X9999", timestamp: new Date(Date.now() - 1800000).toISOString(), type: "unknown_vehicle", status: "active", message: "Unknown vehicle attempted entry" },
  { id: "a2", plateNumber: "RJ14GB4321", timestamp: new Date(Date.now() - 5400000).toISOString(), type: "unknown_vehicle", status: "resolved", message: "Unknown vehicle – resolved by guard" },
];

const INITIAL_LOGS = [
  { id: "l1", type: "resident", plateNumber: "DL3CAB1234", ownerName: "Rajesh Kumar", flatNumber: "A-101", timestamp: new Date(Date.now() - 900000).toISOString(), action: "Entry Granted" },
  { id: "l2", type: "visitor", plateNumber: "DL9CAA0001", visitorName: "Rohit Gupta", flatNumber: "A-101", timestamp: new Date(Date.now() - 3600000).toISOString(), action: "Visitor Entry" },
  { id: "l3", type: "unknown", plateNumber: "PB11X9999", timestamp: new Date(Date.now() - 1800000).toISOString(), action: "Alert Triggered" },
];

// Simulated plate scan sequences
const MOCK_SCAN_PLATES = [
  "DL3CAB1234", "HR26DN5678", "PB11X9999", "UP16BT9012",
  "KA05MN3344", "MH02CD3456", "TN09ZZ8877", "DL8CXB7890"
];

// ─── FIREBASE SIMULATION ──────────────────────────────────────────────────────

const firebaseDB = {
  vehicles: [...MOCK_REGISTERED_VEHICLES],
  visitors: [...INITIAL_VISITORS],
  alerts: [...INITIAL_ALERTS],
  logs: [...INITIAL_LOGS],
  users: [
    { uid: "guard001", name: "Rajan Patil", email: "guard@entryshield.com", role: "guard", password: "guard123" },
    { uid: "admin001", name: "Deepak Saxena", email: "admin@entryshield.com", role: "admin", password: "admin123" },
  ]
};

const auth = {
  currentUser: null,
  signIn: (email, password) => {
    const user = firebaseDB.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid credentials");
    auth.currentUser = user;
    return user;
  },
  signOut: () => { auth.currentUser = null; },
  signUp: (email, password, name, role) => {
    const uid = "user_" + Date.now();
    const newUser = { uid, name, email, role, password };
    firebaseDB.users.push(newUser);
    auth.currentUser = newUser;
    return newUser;
  }
};

const db = {
  checkVehicle: (plate) => firebaseDB.vehicles.find(v => v.plateNumber.toUpperCase() === plate.toUpperCase()) || null,
  addVisitor: (data) => {
    const visitor = { id: "v" + Date.now(), ...data, entryTime: new Date().toISOString(), status: "inside" };
    firebaseDB.visitors.unshift(visitor);
    return visitor;
  },
  addAlert: (plate) => {
    const alert = { id: "a" + Date.now(), plateNumber: plate, timestamp: new Date().toISOString(), type: "unknown_vehicle", status: "active", message: `Unknown vehicle ${plate} attempted entry` };
    firebaseDB.alerts.unshift(alert);
    return alert;
  },
  resolveAlert: (id) => {
    const a = firebaseDB.alerts.find(x => x.id === id);
    if (a) a.status = "resolved";
  },
  addLog: (entry) => {
    const log = { id: "l" + Date.now(), ...entry, timestamp: new Date().toISOString() };
    firebaseDB.logs.unshift(log);
    return log;
  },
  getAll: (col) => [...firebaseDB[col]],
};

// ─── OCR SIMULATION via Gemini-style API ──────────────────────────────────────

const simulateOCR = async (imageSrc) => {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  const plate = MOCK_SCAN_PLATES[Math.floor(Math.random() * MOCK_SCAN_PLATES.length)];
  return { plate, confidence: 85 + Math.floor(Math.random() * 14) };
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const C = {
  bg: "#0A0F1E",
  bgCard: "#111827",
  bgCardAlt: "#1A2236",
  bgInput: "#1E2D40",
  border: "#2A3650",
  borderLight: "#3D4F6E",
  primary: "#3B82F6",
  primaryHover: "#2563EB",
  primaryGlow: "rgba(59,130,246,0.15)",
  accent: "#06B6D4",
  success: "#10B981",
  successBg: "rgba(16,185,129,0.1)",
  warning: "#F59E0B",
  warningBg: "rgba(245,158,11,0.1)",
  danger: "#EF4444",
  dangerBg: "rgba(239,68,68,0.1)",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  gradPrimary: "linear-gradient(135deg, #1E3A5F 0%, #0A0F1E 100%)",
  gradAccent: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  gradCard: "linear-gradient(135deg, #111827 0%, #1A2236 100%)",
};

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────

const Badge = ({ children, variant = "default", style = {} }) => {
  const colors = {
    default: { bg: C.bgCardAlt, color: C.textMuted, border: C.border },
    success: { bg: C.successBg, color: C.success, border: "rgba(16,185,129,0.3)" },
    danger: { bg: C.dangerBg, color: C.danger, border: "rgba(239,68,68,0.3)" },
    warning: { bg: C.warningBg, color: C.warning, border: "rgba(245,158,11,0.3)" },
    info: { bg: C.primaryGlow, color: C.primary, border: "rgba(59,130,246,0.3)" },
    cyan: { bg: "rgba(6,182,212,0.1)", color: C.accent, border: "rgba(6,182,212,0.3)" },
  };
  const s = colors[variant] || colors.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", background: s.bg, color: s.color, border: `1px solid ${s.border}`, ...style }}>
      {children}
    </span>
  );
};

const Card = ({ children, style = {}, glow = false }) => (
  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", position: "relative", overflow: "hidden", boxShadow: glow ? `0 0 30px ${C.primaryGlow}` : "0 4px 20px rgba(0,0,0,0.4)", ...style }}>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, variant = "default", sub }) => {
  const colors = { default: C.primary, success: C.success, warning: C.warning, danger: C.danger, cyan: C.accent };
  const col = colors[variant] || C.primary;
  return (
    <Card style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: "4px 0 0", lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: C.textDim, margin: "6px 0 0" }}>{sub}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${col}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
      </div>
    </Card>
  );
};

const Input = ({ label, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
    <input {...props} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", ...style }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
    <select {...props} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", appearance: "none" }}>{children}</select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style = {}, disabled }) => {
  const styles = {
    primary: { background: C.gradAccent, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
    danger: { background: C.dangerBg, color: C.danger, border: `1px solid rgba(239,68,68,0.3)` },
    success: { background: C.successBg, color: C.success, border: `1px solid rgba(16,185,129,0.3)` },
    ghost: { background: "transparent", color: C.textMuted, border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
};

const formatTime = (iso) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const Dot = ({ color }) => <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

function LandingPage({ onLogin, onSignup }) {
  const features = [
    { icon: "📷", title: "AI-Powered OCR", desc: "Automatically reads vehicle number plates using advanced OCR — no manual input needed." },
    { icon: "🔐", title: "Role-Based Access", desc: "Guards manage entries while admins get real-time view-only oversight dashboards." },
    { icon: "🚨", title: "Instant Alerts", desc: "Unknown vehicles trigger immediate alerts to both guard and admin dashboards." },
    { icon: "📊", title: "Entry Analytics", desc: "Complete log of every vehicle — residents, visitors, and unknowns — with timestamps." },
    { icon: "📱", title: "Mobile Responsive", desc: "Works flawlessly on tablets and phones for on-the-go security management." },
    { icon: "🌐", title: "Firebase Backend", desc: "Real-time Firestore database with secure authentication and instant sync." },
  ];
  const contacts = [
    { role: "Society Secretary", name: "Deepak Saxena", phone: "+91 98765 43200" },
    { role: "Security Office", name: "24/7 Helpline", phone: "+91 98765 43201" },
    { role: "Emergency", name: "Police / Fire / Medical", phone: "112 / 101 / 108" },
    { role: "Gate Guard (Day)", name: "Rajan Patil", phone: "+91 98765 43202" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,15,30,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡</div>
          <span style={{ fontWeight: 800, fontSize: 20, background: C.gradAccent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EntryShield AI</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Btn variant="secondary" onClick={onLogin}>Login</Btn>
          <Btn onClick={onSignup}>Get Started</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "6rem 2rem 4rem", textAlign: "center", maxWidth: 800, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Badge variant="cyan" style={{ marginBottom: "1.5rem" }}>✦ AI-Powered Security</Badge>
        <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 1.5rem" }}>
          Smart Gate Security<br />
          <span style={{ background: C.gradAccent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>for Modern Societies</span>
        </h1>
        <p style={{ fontSize: 18, color: C.textMuted, lineHeight: 1.8, margin: "0 0 2.5rem", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          Automate vehicle verification at your society gate with AI number plate recognition. Reduce guard workload by 80% while improving security.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={onSignup} style={{ padding: "14px 32px", fontSize: 16, borderRadius: 12 }}>🚀 Start Free Trial</Btn>
          <Btn variant="secondary" onClick={onLogin} style={{ padding: "14px 32px", fontSize: 16, borderRadius: 12 }}>👁 View Demo</Btn>
        </div>
        <p style={{ fontSize: 13, color: C.textDim, marginTop: "1rem" }}>Demo: guard@entryshield.com / guard123 · admin@entryshield.com / admin123</p>
      </section>

      {/* How it works */}
      <section id="about" style={{ padding: "4rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, marginBottom: "3rem" }}>How EntryShield Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
          {[
            { step: "01", icon: "📷", title: "Camera Detects", desc: "Camera captures vehicle entering gate" },
            { step: "02", icon: "🤖", title: "AI Reads Plate", desc: "OCR engine extracts number plate text" },
            { step: "03", icon: "🔍", title: "DB Lookup", desc: "System matches plate against resident DB" },
            { step: "04", icon: "✅", title: "Decision Made", desc: "Auto-approve resident or alert for unknown" },
          ].map(s => (
            <Card key={s.step} style={{ textAlign: "center", padding: "2rem 1.25rem" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", marginBottom: 8 }}>STEP {s.step}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.text }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "4rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, marginBottom: "3rem" }}>Key Features</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {features.map(f => (
            <Card key={f.title} style={{ display: "flex", gap: 16, padding: "1.25rem" }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Contacts */}
      <section id="contact" style={{ padding: "4rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, marginBottom: "3rem" }}>Society Contacts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem" }}>
          {contacts.map(c => (
            <Card key={c.role} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Badge variant="info">{c.role}</Badge>
              <p style={{ fontWeight: 700, color: C.text, margin: 0, fontSize: 15 }}>{c.name}</p>
              <p style={{ color: C.accent, margin: 0, fontSize: 14, fontWeight: 600 }}>{c.phone}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "2rem", textAlign: "center", color: C.textDim, fontSize: 13 }}>
        <p>© 2025 EntryShield AI · Smart Society Gate Management System · Powered by Firebase + Gemini</p>
      </footer>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────

function AuthPage({ mode, onSuccess, onToggle, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "guard" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "login") {
        const user = auth.signIn(form.email, form.password);
        onSuccess(user);
      } else {
        if (!form.name || !form.email || !form.password) throw new Error("All fields required");
        const user = auth.signUp(form.email, form.password, form.name, form.role);
        onSuccess(user);
      }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <Card style={{ width: "100%", maxWidth: 420, padding: "2.5rem" }} glow>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 1rem" }}>🛡</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>EntryShield AI · Gate Management</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "signup" && <Input label="Full Name" placeholder="Rajan Patil" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
          <Input label="Email" type="email" placeholder="guard@entryshield.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          {mode === "signup" && (
            <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="guard">Guard</option>
              <option value="admin">Admin</option>
            </Select>
          )}
          {err && <div style={{ background: C.dangerBg, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13 }}>⚠ {err}</div>}
          <Btn onClick={handle} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 4 }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </Btn>
        </div>
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: 13, color: C.textDim }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={onToggle} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12 }}>← Back to Home</button>
        </div>
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: C.bgCardAlt, borderRadius: 10, fontSize: 12, color: C.textDim, lineHeight: 1.8 }}>
          <strong style={{ color: C.textMuted }}>Demo credentials:</strong><br />
          Guard: guard@entryshield.com / guard123<br />
          Admin: admin@entryshield.com / admin123
        </div>
      </Card>
    </div>
  );
}

// ─── CAMERA / OCR MODULE ──────────────────────────────────────────────────────

function CameraPanel({ onDetected }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef(null);

  // Animate fake camera feed
  useEffect(() => {
    if (scanning) {
      intervalRef.current = setInterval(() => setFrame(f => f + 1), 100);
      return () => clearInterval(intervalRef.current);
    }
  }, [scanning]);

  const startScan = async () => {
    setResult(null);
    setScanning(true);
    setProgress(0);
    const ticker = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 150);
    try {
      const res = await simulateOCR();
      clearInterval(ticker);
      setProgress(100);
      setResult(res);
      setScanning(false);
      if (onDetected) onDetected(res.plate);
    } catch {
      clearInterval(ticker);
      setScanning(false);
    }
  };

  const registeredVehicle = result ? db.checkVehicle(result.plate) : null;

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>📷</span> Live Camera Feed
        {scanning && <Badge variant="warning" style={{ marginLeft: 8, animation: "pulse 1s infinite" }}>● SCANNING</Badge>}
      </h3>

      {/* Camera viewport */}
      <div style={{ aspectRatio: "16/9", background: "#050B18", borderRadius: 12, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden", marginBottom: 16 }}>
        {/* Fake camera noise / grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(59,130,246,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(59,130,246,0.04) 40px)` }} />

        {/* Animated scan line */}
        {scanning && (
          <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #3B82F6, transparent)", top: `${(frame * 3) % 100}%`, transition: "top 0.1s linear" }} />
        )}

        {/* Corner brackets */}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map(pos => {
          const [v, h] = pos.split("-");
          return (
            <div key={pos} style={{ position: "absolute", [v]: 16, [h]: 16, width: 24, height: 24, borderTop: v === "top" ? `2px solid ${C.accent}` : "none", borderBottom: v === "bottom" ? `2px solid ${C.accent}` : "none", borderLeft: h === "left" ? `2px solid ${C.accent}` : "none", borderRight: h === "right" ? `2px solid ${C.accent}` : "none" }} />
          );
        })}

        {/* Center reticle */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!result ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: scanning ? 1 : 0.3 }}>🚗</div>
              <p style={{ color: scanning ? C.primary : C.textDim, fontSize: 12, fontWeight: 500 }}>
                {scanning ? "Detecting number plate..." : "Position vehicle at gate"}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", background: "rgba(10,15,30,0.85)", padding: "1rem 2rem", borderRadius: 12, border: `1px solid ${registeredVehicle ? C.success : C.danger}` }}>
              <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 6px", letterSpacing: "0.1em" }}>DETECTED PLATE</p>
              <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.15em", color: C.text, margin: "0 0 8px", fontFamily: "monospace" }}>{result.plate}</p>
              <Badge variant={registeredVehicle ? "success" : "danger"}>
                {registeredVehicle ? "✓ Registered Resident" : "⚠ Unknown Vehicle"}
              </Badge>
              <p style={{ fontSize: 11, color: C.textDim, margin: "8px 0 0" }}>Confidence: {result.confidence}%</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {scanning && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: C.border }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.gradAccent, transition: "width 0.15s" }} />
          </div>
        )}

        {/* Timestamp */}
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: 6, fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Scan result details */}
      {result && registeredVehicle && (
        <div style={{ background: C.successBg, border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 12, padding: "1rem", marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: C.success, fontSize: 13, margin: "0 0 8px" }}>✓ Resident Verified</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["Owner", registeredVehicle.ownerName], ["Flat", registeredVehicle.flatNumber], ["Phone", registeredVehicle.phone], ["Vehicle", registeredVehicle.type]].map(([k, v]) => (
              <div key={k}><span style={{ fontSize: 11, color: C.textDim }}>{k}: </span><span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v}</span></div>
            ))}
          </div>
        </div>
      )}

      {result && !registeredVehicle && (
        <div style={{ background: C.dangerBg, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 12, padding: "1rem", marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: C.danger, fontSize: 13, margin: 0 }}>⚠ Unknown vehicle — Alert triggered. Guard action required.</p>
        </div>
      )}

      <Btn onClick={startScan} disabled={scanning} style={{ width: "100%", justifyContent: "center" }}>
        {scanning ? "⏳ Scanning..." : result ? "🔄 Scan Again" : "🔍 Scan Vehicle"}
      </Btn>
    </Card>
  );
}

// ─── VISITOR FORM ─────────────────────────────────────────────────────────────

function VisitorForm({ prefillPlate = "", onAdded }) {
  const [form, setForm] = useState({ name: "", phone: "", flatNumber: "", vehicleNumber: prefillPlate, purpose: "Delivery" });
  const [done, setDone] = useState(false);

  useEffect(() => { setForm(f => ({ ...f, vehicleNumber: prefillPlate })); }, [prefillPlate]);

  const submit = () => {
    if (!form.name || !form.phone || !form.flatNumber) return;
    const visitor = db.addVisitor(form);
    db.addLog({ type: "visitor", plateNumber: form.vehicleNumber, visitorName: form.name, flatNumber: form.flatNumber, action: "Visitor Entry" });
    setDone(true);
    if (onAdded) onAdded(visitor);
    setTimeout(() => { setDone(false); setForm({ name: "", phone: "", flatNumber: "", vehicleNumber: "", purpose: "Delivery" }); }, 3000);
  };

  if (done) return (
    <Card>
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ color: C.success, fontWeight: 700 }}>Visitor Logged!</h3>
        <p style={{ color: C.textMuted, fontSize: 14 }}>{form.name || "Visitor"} entry recorded successfully.</p>
      </div>
    </Card>
  );

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span>📝</span> Visitor Entry Form
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Input label="Visitor Name *" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Phone Number *" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label="Flat Number *" placeholder="A-101" value={form.flatNumber} onChange={e => setForm(f => ({ ...f, flatNumber: e.target.value }))} />
        <Input label="Vehicle Number" placeholder="DL3CAB1234" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))} />
        <div style={{ gridColumn: "1/-1" }}>
          <Select label="Purpose of Visit" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
            {["Delivery", "Domestic Help", "Guest", "Maintenance", "Medical", "Cab/Taxi", "Other"].map(p => <option key={p}>{p}</option>)}
          </Select>
        </div>
        <div style={{ gridColumn: "1/-1", background: C.bgCardAlt, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.textDim }}>
          🕐 Entry Time: <strong style={{ color: C.textMuted }}>{new Date().toLocaleString("en-IN")}</strong>
        </div>
      </div>
      <Btn onClick={submit} style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>
        ✅ Log Visitor Entry
      </Btn>
    </Card>
  );
}

// ─── ALERT PANEL ──────────────────────────────────────────────────────────────

function AlertPanel({ role, refreshKey }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => { setAlerts(db.getAll("alerts")); }, [refreshKey]);

  const resolve = (id) => {
    db.resolveAlert(id);
    setAlerts(db.getAll("alerts"));
  };

  const active = alerts.filter(a => a.status === "active");

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          🚨 Alerts
          {active.length > 0 && <Badge variant="danger">{active.length} Active</Badge>}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
        {alerts.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: "2rem 0" }}>No alerts</p>}
        {alerts.map(a => (
          <div key={a.id} style={{ padding: "12px 14px", borderRadius: 10, background: a.status === "active" ? C.dangerBg : C.bgCardAlt, border: `1px solid ${a.status === "active" ? "rgba(239,68,68,0.3)" : C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Dot color={a.status === "active" ? C.danger : C.textDim} />
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.text, fontSize: 14 }}>{a.plateNumber}</span>
                <Badge variant={a.status === "active" ? "danger" : "default"}>{a.status}</Badge>
              </div>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px" }}>{a.message}</p>
              <p style={{ fontSize: 11, color: C.textDim, margin: 0 }}>{formatTime(a.timestamp)}</p>
            </div>
            {role === "guard" && a.status === "active" && (
              <Btn variant="success" onClick={() => resolve(a.id)} style={{ padding: "6px 12px", fontSize: 12, flexShrink: 0 }}>Resolve</Btn>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── ENTRY LOGS TABLE ─────────────────────────────────────────────────────────

function EntryLogsTable({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => { setLogs(db.getAll("logs")); }, [refreshKey]);

  const filtered = filter === "all" ? logs : logs.filter(l => l.type === filter);

  const typeStyle = { resident: "success", visitor: "info", unknown: "danger" };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>📋 Entry Logs</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "resident", "visitor", "unknown"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${filter === t ? C.primary : C.border}`, background: filter === t ? C.primaryGlow : "transparent", color: filter === t ? C.primary : C.textMuted, fontSize: 12, cursor: "pointer", fontWeight: 600, textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Time", "Plate", "Person / Owner", "Flat", "Action", "Type"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textDim, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 20).map(l => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                <td style={{ padding: "10px 10px", color: C.textDim, whiteSpace: "nowrap" }}>{formatTime(l.timestamp)}</td>
                <td style={{ padding: "10px 10px", fontFamily: "monospace", fontWeight: 700, color: C.text }}>{l.plateNumber}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{l.ownerName || l.visitorName || "–"}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{l.flatNumber || "–"}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{l.action}</td>
                <td style={{ padding: "10px 10px" }}><Badge variant={typeStyle[l.type] || "default"}>{l.type}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: "center", color: C.textDim, padding: "2rem 0", fontSize: 13 }}>No entries found</p>}
      </div>
    </Card>
  );
}

// ─── REGISTERED VEHICLES ──────────────────────────────────────────────────────

function VehiclesPanel({ role }) {
  const [veh, setVeh] = useState(db.getAll("vehicles"));
  const [form, setForm] = useState({ plateNumber: "", ownerName: "", flatNumber: "", phone: "", type: "Car" });
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.plateNumber || !form.ownerName) return;
    firebaseDB.vehicles.push({ ...form, plateNumber: form.plateNumber.toUpperCase() });
    setVeh(db.getAll("vehicles"));
    setForm({ plateNumber: "", ownerName: "", flatNumber: "", phone: "", type: "Car" });
    setAdding(false);
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>🚗 Registered Vehicles</h3>
        {role === "guard" && (
          <Btn onClick={() => setAdding(!adding)} style={{ padding: "6px 14px", fontSize: 12 }}>
            {adding ? "✕ Cancel" : "+ Register"}
          </Btn>
        )}
      </div>

      {adding && (
        <div style={{ background: C.bgCardAlt, borderRadius: 12, padding: "1rem", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Plate Number" placeholder="DL3CAB1234" value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))} />
          <Input label="Owner Name" placeholder="Rajan Kumar" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} />
          <Input label="Flat Number" placeholder="A-101" value={form.flatNumber} onChange={e => setForm(f => ({ ...f, flatNumber: e.target.value }))} />
          <Input label="Phone" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {["Car", "SUV", "Motorcycle", "Truck", "Other"].map(t => <option key={t}>{t}</option>)}
          </Select>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Btn variant="success" onClick={add} style={{ width: "100%", justifyContent: "center" }}>✓ Add Vehicle</Btn>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
        {veh.map(v => (
          <div key={v.plateNumber} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.bgCardAlt, borderRadius: 10, gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.text, fontSize: 14 }}>{v.plateNumber}</span>
                <Badge variant="cyan">{v.type}</Badge>
              </div>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>{v.ownerName} · Flat {v.flatNumber}</p>
            </div>
            <span style={{ fontSize: 12, color: C.textDim }}>{v.phone}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── VISITORS TABLE ───────────────────────────────────────────────────────────

function VisitorsPanel({ refreshKey }) {
  const [visitors, setVisitors] = useState([]);
  useEffect(() => { setVisitors(db.getAll("visitors")); }, [refreshKey]);

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>👥 Visitor Log</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Name", "Phone", "Flat", "Vehicle", "Purpose", "Entry Time", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textDim, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visitors.map(v => (
              <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                <td style={{ padding: "10px 10px", color: C.text, fontWeight: 600 }}>{v.name}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{v.phone}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{v.flatNumber}</td>
                <td style={{ padding: "10px 10px", fontFamily: "monospace", color: C.text }}>{v.vehicleNumber || "–"}</td>
                <td style={{ padding: "10px 10px", color: C.textMuted }}>{v.purpose}</td>
                <td style={{ padding: "10px 10px", color: C.textDim, whiteSpace: "nowrap" }}>{formatTime(v.entryTime)}</td>
                <td style={{ padding: "10px 10px" }}><Badge variant={v.status === "inside" ? "success" : "default"}>{v.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visitors.length === 0 && <p style={{ textAlign: "center", color: C.textDim, padding: "2rem 0", fontSize: 13 }}>No visitors today</p>}
      </div>
    </Card>
  );
}

// ─── GUARD DASHBOARD ──────────────────────────────────────────────────────────

function GuardDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [detectedPlate, setDetectedPlate] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [alerts, setAlerts] = useState(db.getAll("alerts"));

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "camera", label: "Camera", icon: "📷" },
    { id: "visitor", label: "Add Visitor", icon: "➕" },
    { id: "logs", label: "Entry Logs", icon: "📋" },
    { id: "vehicles", label: "Vehicles", icon: "🚗" },
    { id: "alerts", label: "Alerts", icon: "🚨" },
  ];

  const handleDetected = (plate) => {
    const isRegistered = db.checkVehicle(plate);
    if (!isRegistered) {
      db.addAlert(plate);
      setAlerts(db.getAll("alerts"));
    }
    db.addLog({ type: isRegistered ? "resident" : "unknown", plateNumber: plate, ownerName: isRegistered?.ownerName, flatNumber: isRegistered?.flatNumber, action: isRegistered ? "Entry Granted" : "Alert Triggered" });
    setDetectedPlate(plate);
    setRefresh(r => r + 1);
  };

  const activeAlerts = alerts.filter(a => a.status === "active").length;
  const visitors = db.getAll("visitors").filter(v => v.status === "inside").length;
  const logs = db.getAll("logs");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top Nav */}
      <nav style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
          <span style={{ fontWeight: 800, fontSize: 16, background: C.gradAccent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EntryShield AI</span>
          <Badge variant="cyan" style={{ marginLeft: 4 }}>Guard</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {activeAlerts > 0 && <Badge variant="danger">🚨 {activeAlerts} Alert{activeAlerts > 1 ? "s" : ""}</Badge>}
          <span style={{ fontSize: 13, color: C.textMuted }}>👤 {user.name}</span>
          <Btn variant="ghost" onClick={onLogout} style={{ padding: "6px 12px", fontSize: 12 }}>Logout</Btn>
        </div>
      </nav>

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0, padding: "1.5rem 1rem", borderRight: `1px solid ${C.border}`, minHeight: "calc(100vh - 60px)", background: C.bgCard }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "none", background: activeTab === t.id ? C.primaryGlow : "transparent", color: activeTab === t.id ? C.primary : C.textMuted, cursor: "pointer", fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500, textAlign: "left", position: "relative" }}>
                <span>{t.icon}</span> {t.label}
                {t.id === "alerts" && activeAlerts > 0 && <Badge variant="danger" style={{ marginLeft: "auto", padding: "1px 7px" }}>{activeAlerts}</Badge>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "1.5rem", overflowX: "hidden" }}>
          {activeTab === "overview" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Guard Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <StatCard icon="🚗" label="Registered Vehicles" value={firebaseDB.vehicles.length} variant="default" />
                <StatCard icon="👥" label="Visitors Inside" value={visitors} variant="cyan" />
                <StatCard icon="📋" label="Total Logs Today" value={logs.length} variant="success" />
                <StatCard icon="🚨" label="Active Alerts" value={activeAlerts} variant={activeAlerts > 0 ? "danger" : "default"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <CameraPanel onDetected={handleDetected} />
                <AlertPanel role="guard" refreshKey={refresh} />
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <EntryLogsTable refreshKey={refresh} />
              </div>
            </div>
          )}
          {activeTab === "camera" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Camera & Detection</h2>
              <div style={{ maxWidth: 600 }}>
                <CameraPanel onDetected={handleDetected} />
              </div>
            </div>
          )}
          {activeTab === "visitor" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Add Visitor Entry</h2>
              <div style={{ maxWidth: 600 }}>
                <VisitorForm prefillPlate={detectedPlate} onAdded={() => setRefresh(r => r + 1)} />
              </div>
            </div>
          )}
          {activeTab === "logs" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Entry Logs</h2>
              <EntryLogsTable refreshKey={refresh} />
              <div style={{ marginTop: "1.5rem" }}>
                <VisitorsPanel refreshKey={refresh} />
              </div>
            </div>
          )}
          {activeTab === "vehicles" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Registered Vehicles</h2>
              <VehiclesPanel role="guard" />
            </div>
          )}
          {activeTab === "alerts" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Alert Management</h2>
              <AlertPanel role="guard" refreshKey={refresh} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [refresh] = useState(0);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "logs", label: "Entry Logs", icon: "📋" },
    { id: "visitors", label: "Visitors", icon: "👥" },
    { id: "vehicles", label: "Vehicles", icon: "🚗" },
    { id: "alerts", label: "Alerts", icon: "🚨" },
  ];

  const logs = db.getAll("logs");
  const alerts = db.getAll("alerts");
  const visitors = db.getAll("visitors");
  const activeAlerts = alerts.filter(a => a.status === "active").length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <nav style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
          <span style={{ fontWeight: 800, fontSize: 16, background: C.gradAccent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EntryShield AI</span>
          <Badge variant="warning" style={{ marginLeft: 4 }}>Admin</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Badge variant="default" style={{ fontSize: 11 }}>👁 View-Only Mode</Badge>
          <span style={{ fontSize: 13, color: C.textMuted }}>👤 {user.name}</span>
          <Btn variant="ghost" onClick={onLogout} style={{ padding: "6px 12px", fontSize: 12 }}>Logout</Btn>
        </div>
      </nav>

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto" }}>
        <aside style={{ width: 220, flexShrink: 0, padding: "1.5rem 1rem", borderRight: `1px solid ${C.border}`, minHeight: "calc(100vh - 60px)", background: C.bgCard }}>
          <div style={{ background: C.warningBg, border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: C.warning }}>
            ⚠ Admin accounts are view-only. Contact guard for entry management.
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "none", background: activeTab === t.id ? C.primaryGlow : "transparent", color: activeTab === t.id ? C.primary : C.textMuted, cursor: "pointer", fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500, textAlign: "left" }}>
                <span>{t.icon}</span> {t.label}
                {t.id === "alerts" && activeAlerts > 0 && <Badge variant="danger" style={{ marginLeft: "auto", padding: "1px 7px" }}>{activeAlerts}</Badge>}
              </button>
            ))}
          </nav>
        </aside>

        <main style={{ flex: 1, padding: "1.5rem" }}>
          {activeTab === "overview" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Admin Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <StatCard icon="🚗" label="Registered Vehicles" value={firebaseDB.vehicles.length} />
                <StatCard icon="👥" label="Visitors Today" value={visitors.length} variant="cyan" />
                <StatCard icon="📋" label="Total Log Entries" value={logs.length} variant="success" />
                <StatCard icon="🚨" label="Active Alerts" value={activeAlerts} variant={activeAlerts > 0 ? "danger" : "default"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <AlertPanel role="admin" refreshKey={refresh} />
                <Card>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>📈 Activity Summary</h3>
                  {[
                    { label: "Residents entered today", val: logs.filter(l => l.type === "resident").length, color: C.success },
                    { label: "Visitor entries today", val: logs.filter(l => l.type === "visitor").length, color: C.accent },
                    { label: "Unknown vehicle alerts", val: logs.filter(l => l.type === "unknown").length, color: C.danger },
                    { label: "Resolved alerts", val: alerts.filter(a => a.status === "resolved").length, color: C.textMuted },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}20` }}>
                      <span style={{ fontSize: 13, color: C.textMuted }}>{s.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}
          {activeTab === "logs" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Entry Logs (View Only)</h2>
              <EntryLogsTable refreshKey={refresh} />
            </div>
          )}
          {activeTab === "visitors" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Visitor Records (View Only)</h2>
              <VisitorsPanel refreshKey={refresh} />
            </div>
          )}
          {activeTab === "vehicles" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Registered Vehicles (View Only)</h2>
              <VehiclesPanel role="admin" />
            </div>
          )}
          {activeTab === "alerts" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.text }}>Security Alerts (View Only)</h2>
              <AlertPanel role="admin" refreshKey={refresh} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("landing"); // landing | login | signup | guard | admin
  const [user, setUser] = useState(null);

  const handleAuthSuccess = (u) => {
    setUser(u);
    setPage(u.role === "admin" ? "admin" : "guard");
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
    setPage("landing");
  };

  if (page === "landing") return <LandingPage onLogin={() => setPage("login")} onSignup={() => setPage("signup")} />;
  if (page === "login") return <AuthPage mode="login" onSuccess={handleAuthSuccess} onToggle={() => setPage("signup")} onBack={() => setPage("landing")} />;
  if (page === "signup") return <AuthPage mode="signup" onSuccess={handleAuthSuccess} onToggle={() => setPage("login")} onBack={() => setPage("landing")} />;
  if (page === "guard" && user) return <GuardDashboard user={user} onLogout={handleLogout} />;
  if (page === "admin" && user) return <AdminDashboard user={user} onLogout={handleLogout} />;
  return null;
}
