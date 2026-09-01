import { useState } from 'react';

/**
 * Lightweight tab strip. Only the active tab's element is mounted, so
 * embedding several data-fetching pages as tabs stays cheap.
 *
 * The active tab's page can render its search / action buttons into the
 * `#erp-tab-actions` slot on the right of the tab strip via <PageToolbar>.
 *
 * tabs: [{ key, label, icon?, element }]
 */
export default function Tabs({ tabs, initial, storageKey }) {
  const [active, setActive] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && tabs.some((t) => t.key === saved)) return saved;
      } catch {
        /* ignore */
      }
    }
    return initial || tabs[0]?.key;
  });

  const select = (key) => {
    setActive(key);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, key);
      } catch {
        /* ignore */
      }
    }
  };

  const current = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <>
      <div className="erp-tabbar">
        <ul className="nav nav-tabs erp-tabs mb-0">
          {tabs.map((t) => (
            <li className="nav-item" key={t.key}>
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-1 ${active === t.key ? 'active' : ''}`}
                onClick={() => select(t.key)}
              >
                {t.icon ? <t.icon size={14} /> : null}
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        <div id="erp-tab-actions" className="erp-tabbar-actions" />
      </div>
      <div>{current?.element}</div>
    </>
  );
}
