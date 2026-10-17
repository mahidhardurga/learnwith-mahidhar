import React from 'react';
import Layout from '@theme/Layout';
import Flashcards from '@site/src/components/Flashcards';
import LevelPicker from '@site/src/components/LevelPicker';

export default function Quiz(): React.JSX.Element {
  return (
    <Layout title="Quiz" description="A quick flashcard quiz on Java, Spring, microservices, databases, Kafka and system design, tuned to your experience level.">
      <main className="container" style={{maxWidth: 820, padding: '2.5rem 1rem 4rem'}}>
        <h1 style={{marginBottom: '0.4rem'}}>Quick quiz</h1>
        <p style={{color: 'var(--lw-text-soft)', marginBottom: '1.2rem'}}>
          Read the question, answer in your head, flip the card, and mark whether you knew it. Cards follow your level.
        </p>
        <div style={{marginBottom: '2rem'}}>
          <LevelPicker compact />
        </div>
        <Flashcards />
      </main>
    </Layout>
  );
}
