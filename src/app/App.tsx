import { useState } from 'react';
import { publicDemo } from '../demo/public-demo';
import { PreviewGame } from '../features/crossword/PreviewGame';

export function App() {
  const [attempt, setAttempt] = useState(0);
  return <PreviewGame key={attempt} puzzle={publicDemo} audience="public-demo" onRestart={() => setAttempt(value => value + 1)} />;
}
