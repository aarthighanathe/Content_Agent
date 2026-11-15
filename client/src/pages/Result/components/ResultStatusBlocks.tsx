import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingView } from './LoadingView';
import type { ContentJob } from '../../../types/job';

interface Props {
  jobId: string | undefined;
  loadError: 'not_found' | 'error' | 'lost' | null;
  regenerating: boolean;
  showEmptyDone: boolean;
  showLoading: boolean;
  isFailed: boolean;
  actionError: string | null;
  currentStage: string;
  stageMessage: string;
  progress: number;
  jobData: ContentJob | null;
  onLoadJob: () => void;
  onRegenerate: () => void;
}

export function ResultStatusBlocks({
  jobId,
  loadError,
  regenerating,
  showEmptyDone,
  showLoading,
  isFailed,
  actionError,
  currentStage,
  stageMessage,
  progress,
  jobData,
  onLoadJob,
  onRegenerate,
}: Props): ReactElement {
  return (
    <>
      {loadError && !regenerating && (
        <ErrorState
          title={
            loadError === 'not_found'
              ? 'Job not found'
              : loadError === 'lost'
                ? 'Generation lost'
                : 'Could not load job'
          }
          message={
            loadError === 'not_found'
              ? 'This job may have been deleted or you may not have access to it.'
              : loadError === 'lost'
                ? 'This generation was lost after a server restart. Please create it again.'
                : 'We could not load this job. Check your connection and try again.'
          }
          retryLabel={loadError === 'lost' ? undefined : 'Retry'}
          onRetry={loadError === 'lost' ? undefined : onLoadJob}
        />
      )}
      {(loadError === 'not_found' || loadError === 'lost') && (
        <p style={{ textAlign: 'center', marginTop: '-0.5rem' }}>
          <Link to={loadError === 'lost' ? '/create' : '/library'}>
            {loadError === 'lost' ? 'Create again' : 'Back to Library'}
          </Link>
        </p>
      )}

      {showEmptyDone && (
        <>
          <ErrorState
            title="Content unavailable"
            message="This job finished but no final content was saved. Try regenerating, or create a new job."
            retryLabel="Try again"
            onRetry={onRegenerate}
          />
          <p style={{ textAlign: 'center', marginTop: '-0.5rem' }}>
            <Link to="/create">Create again</Link>
          </p>
        </>
      )}
      {showLoading && (
        // WHY: remount on jobId so elapsed timer resets when navigating Result A→B
        // while both are still generating (deps on regenerating alone kept A's clock).
        <LoadingView
          key={jobId}
          regenerating={regenerating}
          currentStage={currentStage}
          stageMessage={stageMessage}
          progress={progress}
          agentLogs={jobData?.agentLogs}
        />
      )}
      {/* WHY: outside content gate: regenerate 409 must show even if loading/failed is active. */}
      {actionError && !regenerating && (
        <div className="toast toast-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} role="alert">
          {actionError}
        </div>
      )}
      {/* WHY: !loadError: lost/not_found already rendered ErrorState (avoid stacked regen). */}
      {isFailed && !loadError && (
        <ErrorState
          title="Generation failed"
          message={jobData?.error || 'An error occurred. Please try again.'}
          retryLabel="Try again"
          onRetry={onRegenerate}
        />
      )}
    </>
  );
}
