import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders search / action controls. When the page is inside a <Tabs> strip
 * it portals them into the `#erp-tab-actions` slot (right of the tabs, level
 * with the page title). Otherwise it falls back to an inline toolbar row.
 */
export default function PageToolbar({ children }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    setHost(document.getElementById('erp-tab-actions'));
  }, []);

  const inner = <div className="d-flex align-items-center gap-2 flex-nowrap">{children}</div>;

  if (host) return createPortal(inner, host);
  return <div className="erp-toolbar">{inner}</div>;
}
