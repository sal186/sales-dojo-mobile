'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x26A0;&#xFE0F;</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '300px' }}>The app hit an unexpected error. Your data is safe.</p>
          <button onClick={function() { window.location.href = '/'; }} style={{ padding: '14px 32px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Back to Home</button>
        </div>
      );
    }
    return this.props.children;
  }
}
