/**
 * One place that turns an error object into something a person can act on.
 *
 * Every failure in this application is routed through here, so that the
 * classification in src/errors.js is applied consistently and no component
 * invents its own wording. A cancelled request is rendered as a neutral note
 * rather than an error, because the user did it deliberately.
 */
import { classify, browserThinksItIsOnline } from '../errors.js';

export function StatusBanner({ error, onRetry }) {
  if (!error) return null;
  const { kind, title, detail, costsGas } = classify(error);
  const tone = kind === 'rejected' ? 'note' : 'error';

  return (
    <div className={`banner ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      <p>{detail}</p>
      {costsGas && <p className="small">This attempt did consume gas, because the contract ran before refusing.</p>}
      {kind === 'offline' && !browserThinksItIsOnline() && (
        <p className="small">Your browser also reports no connection at all.</p>
      )}
      {/* A retry button matters most in exactly the cases a spinner would hang:
          the request is not coming back on its own, and the user needs a way
          out that is not reloading the page. */}
      {onRetry && kind !== 'rejected' && <button onClick={onRetry}>Retry</button>}
    </div>
  );
}
