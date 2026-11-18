'use client';

import { useState, type ReactNode } from 'react';

type Tab = { id: string; label: string; panel: ReactNode };

// Tabs for the install methods. The panels are rendered on the server and passed in.
export const Install = ({ tabs }: { tabs: Tab[] }) => {
  const [active, setActive] = useState(tabs[0].id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.id === active);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setActive(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="install">
      <div className="tabs" role="tablist" aria-label="Install method" onKeyDown={handleKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={t.id !== active}>
          {t.panel}
        </div>
      ))}
    </div>
  );
};
