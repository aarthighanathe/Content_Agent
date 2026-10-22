import { Link } from 'react-router-dom';
import { CheckSquare, Plus, BarChart2, BookMarked } from 'lucide-react';

interface LibraryHeaderProps {
  total: number;
  manageMode: boolean;
  onToggleManageMode: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
}

export function LibraryHeader({
  total, manageMode, onToggleManageMode, showAnalytics, onToggleAnalytics,
}: LibraryHeaderProps): React.JSX.Element {
  return (
    <header className="lib-page-hd">
      <div className="lib-page-hd-main">
        <div className="lib-page-hd-icon" aria-hidden="true">
          <BookMarked size={18} />
        </div>
        <div className="lib-page-hd-copy">
          <h1 className="lib-page-title">Content Library</h1>
          <p className="lib-page-sub">
            {total} generation{total !== 1 ? 's' : ''} · browse, filter, and reopen any result
          </p>
        </div>
      </div>
      <div className="lib-page-actions">
        <button
          type="button"
          className={`lib-hd-btn${showAnalytics ? ' on' : ''}`}
          onClick={onToggleAnalytics}
        >
          <BarChart2 size={13} /> Analytics
        </button>
        <button
          type="button"
          className={`lib-hd-btn${manageMode ? ' on accent' : ''}`}
          onClick={onToggleManageMode}
        >
          <CheckSquare size={13} /> {manageMode ? 'Done' : 'Manage'}
        </button>
        <Link to="/create" className="btn-primary lib-hd-create">
          <Plus size={13} /> New content
        </Link>
      </div>
    </header>
  );
}
