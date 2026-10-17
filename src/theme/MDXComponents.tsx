import MDXComponents from '@theme-original/MDXComponents';
import InterviewQA from '@site/src/components/InterviewQA';
import {LessonDefinition, LessonDesign, LessonSlot, LessonWhen, LessonWhy, NextTopic} from '@site/src/components/Lesson';
import {Checkpoint, Outcomes} from '@site/src/components/Interactive/Checkpoint';
import {HashMapLab} from '@site/src/components/Interactive/HashMapLab';
import {SagaLab} from '@site/src/components/Interactive/SagaLab';
import {KafkaLab} from '@site/src/components/Interactive/KafkaLab';
import {CircuitBreakerLab} from '@site/src/components/Interactive/CircuitBreakerLab';
import {TokenBucketLab} from '@site/src/components/Interactive/TokenBucketLab';
import {IsolationLab} from '@site/src/components/Interactive/IsolationLab';

export default {
  ...MDXComponents,
  InterviewQA,
  LessonSlot,
  LessonDefinition,
  LessonWhy,
  LessonDesign,
  LessonWhen,
  NextTopic,
  Checkpoint,
  Outcomes,
  HashMapLab,
  SagaLab,
  KafkaLab,
  CircuitBreakerLab,
  TokenBucketLab,
  IsolationLab,
};
