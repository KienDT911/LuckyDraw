import { Component, type ReactNode } from 'react';
import { t } from '../i18n';
import { Icon } from './Icon';

/** Last line of defence during a live event: a crash shows a recovery card instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="gate">
        <div className="gate-card">
          <span className="monogram">
            <Icon name="refresh" size={24} />
          </span>
          <h1>{t('errorTitle')}</h1>
          <p className="muted">{t('errorHint')}</p>
          <code className="error-detail">{this.state.error.message}</code>
          <button className="btn btn-primary btn-lg gate-btn" onClick={() => location.reload()}>
            <Icon name="refresh" />
            {t('reload')}
          </button>
        </div>
      </div>
    );
  }
}
