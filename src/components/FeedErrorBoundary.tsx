export class FeedErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Alert severity="error">Failed to load feed</Alert>;
    }
    return this.props.children;
  }
} 