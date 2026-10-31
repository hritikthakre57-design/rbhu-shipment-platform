import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useNotifications } from "../context/NotificationContext";
import Icon, { type IconName } from "./Icon";

const navigation: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/customers", label: "Customers", icon: "customers" },
  { to: "/shipments", label: "Shipments", icon: "shipments" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/assistant", label: "Assistant", icon: "assistant" },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/20"><Icon name="package" size={22} /></div>
      <div><p className="text-sm font-extrabold tracking-tight text-white">Shipflow</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Operations</p></div>
    </div>
  );
}

function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((current) => !current);
    if (!open) markAllRead();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
        className={`relative rounded-xl p-2 transition ${open ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/8 hover:text-white"}`}
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#101827] bg-rose-500 px-0.5 text-[9px] font-extrabold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 w-[min(88vw,340px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><p className="text-sm font-extrabold">Notifications</p><p className="text-[11px] text-slate-400">Recent shipment activity</p></div>
            {notifications.length > 0 && <button type="button" onClick={clearNotifications} className="text-[11px] font-bold text-slate-400 hover:text-rose-600">Clear all</button>}
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {notifications.length === 0 ? <div className="px-3 py-8 text-center"><div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon name="bell" size={17} /></div><p className="text-xs font-bold text-slate-600">No recent notifications</p><p className="mt-1 text-[11px] text-slate-400">Shipment updates will appear here.</p></div> : notifications.map((notification) => <div key={notification.id} className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50"><div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600"><Icon name="shipments" size={15} /></div><div className="min-w-0"><p className="text-xs font-bold leading-5 text-slate-700">Shipment <span className="font-extrabold text-slate-900">{notification.shipmentId}</span> is now <span className="text-blue-700">{notification.status}</span></p><p className="mt-1 text-[10px] text-slate-400">{new Date(notification.receivedAt).toLocaleString()}</p></div></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Primary navigation">
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Workspace</p>
      {navigation.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20" : "text-slate-400 hover:bg-white/8 hover:text-white"}`}>
          {({ isActive }) => <><Icon name={item.icon} size={18} className={isActive ? "text-blue-100" : "text-slate-500 group-hover:text-slate-300"} /><span>{item.label}</span></>}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#101827] px-4 py-6 text-white lg:flex">
      <div className="flex items-start justify-between gap-2 px-2"><Brand /><NotificationCenter /></div>
      <div className="mt-12 flex-1"><Navigation /></div>
      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">{user?.name?.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{user?.name}</p><p className="text-xs text-slate-400">{user?.role ?? "Operator"}</p></div></div>
        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/8 hover:text-white"><Icon name="logout" size={18} /> Log out</button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Sidebar onLogout={logout} />
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex h-full w-[min(82vw,280px)] flex-col bg-[#101827] px-4 py-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-2 px-2"><Brand /><div className="flex items-center gap-1"><NotificationCenter /><button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><Icon name="close" size={20} /></button></div></div>
            <div className="mt-12 flex-1"><Navigation onNavigate={() => setMobileNavOpen(false)} /></div>
            <button onClick={logout} className="flex items-center gap-3 border-t border-white/10 px-3 pt-4 text-sm font-semibold text-slate-400"><Icon name="logout" size={18} /> Log out</button>
          </aside>
        </div>
      )}
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6"><button aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Icon name="menu" size={22} /></button><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Icon name="package" size={17} /></div><span className="text-sm font-extrabold text-slate-900">Shipflow</span></div><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{user?.name?.slice(0, 1).toUpperCase()}</div></div>
        </header>
        <main className="mx-auto min-w-0 max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><Outlet /></main>
      </div>
    </div>
  );
}
