import { useContext, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { AuthContext } from "../App";

interface SidebarItem {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  items: SidebarItem[];
  onLogout: () => void;
  username: string;
  onSelect?: (label: string) => void;
}

export default function Sidebar({ items, onLogout, username, onSelect }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useContext(AuthContext)!;

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (onSelect) {
      onSelect(item.label);
    }
  };

  return (
    <aside className="sidebar" style={{ width: collapsed ? 60 : 240 }}>
      <div className="sidebar-brand">
        {collapsed ? "🛠️" : "Akka Dev"}
      </div>
      <nav className="sidebar-nav">
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((item) => (
            <li key={item.label}>
              {item.onClick ? (
                <button
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.6rem 1.5rem",
                    color: "rgba(255, 255, 255, 0.7)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    transition: "all 0.15s",
                    backgroundColor: item.active ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    borderRight: item.active ? "3px solid #8b5cf6" : "3px solid transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (collapsed) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (collapsed && !item.active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  to={item.href || "/dashboard"}
                  style={{
                    display: "block",
                    padding: "0.6rem 1.5rem",
                    color: "rgba(255, 255, 255, 0.7)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    transition: "all 0.15s",
                    backgroundColor: item.active ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    borderRight: item.active ? "3px solid #8b5cf6" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (collapsed) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (collapsed && !item.active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem"}}>{username[0]}</span>
          {!collapsed && <span style={{ fontSize: "0.85rem" }}>{username}</span>}
        </div>
        {!collapsed && (
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "0.4rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginTop: "0.5rem",
            width: "100%",
            padding: "0.4rem",
            background: "transparent",
            border: "none",
            borderRadius: "6px",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {collapsed ? "▶" : "◁"}
        </button>
      </div>
      <Outlet />
    </aside>
  );
}