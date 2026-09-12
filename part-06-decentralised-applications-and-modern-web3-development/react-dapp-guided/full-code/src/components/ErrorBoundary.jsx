/**
 * The last line of defence against a blank page.
 *
 * If any component below this one throws while rendering, React unmounts the
 * entire tree and the user sees white. That is the failure they report as "the
 * site is broken", and it is indistinguishable to them from the server being
 * down. A boundary catches it and renders something honest instead.
 *
 * This must be a class component: as of React 19 there is still no hook form
 * of componentDidCatch. That is the only reason for the older syntax here.
 *
 * A boundary catches errors thrown during *render*. It does not catch errors
 * inside event handlers or async callbacks -- those never reach React -- which
 * is why the click handlers in this project catch their own.
 */
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="panel error">
        <h1>This page stopped working</h1>
        <p>
          The interface hit an error it could not recover from. Nothing was sent
          to the network by this failure, and no funds are affected.
        </p>
        <pre>{String(this.state.error?.message ?? this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })}>Try again</button>
      </main>
    );
  }
}
