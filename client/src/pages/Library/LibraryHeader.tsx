import { Link } from 'react-router-dom';
import { CheckSquare, Plus, BarChart2 } from 'lucide-react';

interface LibraryHeaderProps {
  total: number;
  loading: boolean;
  loadError: boolean;
  manageMode: boolean;
  onToggleManageMode: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
}

function librarySubtitle(total: number, loading: boolean, loadError: boolean): string {
  if (loading) return 'Loading your library…';
  if (loadError) return 'Your saved generations';
  if (total === 0) return 'Nothing saved yet';
  return `${total} saved piece${total === 1 ? '' : 's'}`;
}

export function LibraryHeader({
  total, loading, loadError, manageMode, onToggleManageMode, showAnalytics, onToggleAnalytics,
}: LibraryHeaderProps): React.JSX.Element {
  return (
    <header className="lib-page-hd">
      <div className="lib-page-hd-main">
        <div className="lib-page-hd-copy">
          <h1 className="lib-page-title">Content Library</h1>
          <p className="lib-page-sub">{librarySubtitle(total, loading, loadError)}</p>
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
          title={manageMode
            ? 'Exit bulk select'
            : 'Select pieces to export as CSV or delete in bulk'}
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
