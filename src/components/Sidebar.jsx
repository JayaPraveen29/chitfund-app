import { NavLink } from "react-router-dom";
import { HiChartBar, HiChartPie } from "react-icons/hi2";
import { useState } from "react";
import "./Sidebar.css";

const navItems = [
  {
    icon: <HiChartBar />,
    label: "Chit Creation",
    to: "/chit-creation",
  },
  {
    icon: <HiChartBar />,
    label: "View Chit Data",
    to: "/view-data",
  },
  {
    icon: <HiChartPie />,
    label: "Generate Reports",
    to: "/reports",
    children: [
      { label: "Monthly Report", to: "/reports/monthly" },
      { label: "Annual Report", to: "/reports/annual" },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
       <div className="sidebar-brand">SRI KOMMAREDDI <br/> CHITFUNDS PVT LTD</div>
        <hr className="sidebar-divider" />
        <nav className="sidebar-nav">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="sidebar-group">
                <button
                  className="sidebar-item sidebar-item--toggle"
                  onClick={() => toggleMenu(item.label)}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                  <span className={`sidebar-arrow ${openMenus[item.label] ? "sidebar-arrow--open" : ""}`}>▼</span>
                </button>
                {openMenus[item.label] && (
                  <div className="sidebar-submenu">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.label}
                        to={child.to}
                        className={({ isActive }) =>
                          `sidebar-subitem ${isActive ? "sidebar-subitem--active" : ""}`
                        }
                        onClick={onClose}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "sidebar-item--active" : ""}`
                }
                onClick={onClose}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}