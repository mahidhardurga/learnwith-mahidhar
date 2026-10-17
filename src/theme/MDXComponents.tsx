import MDXComponents from '@theme-original/MDXComponents';
import {LevelIntro, LevelIntroBody, LevelQA, LevelSection} from '@site/src/components/LevelContent';
import {Checkpoint, Outcomes} from '@site/src/components/Interactive/Checkpoint';
import {HashMapLab} from '@site/src/components/Interactive/HashMapLab';
import {SagaLab} from '@site/src/components/Interactive/SagaLab';
import {KafkaLab} from '@site/src/components/Interactive/KafkaLab';
import {CircuitBreakerLab} from '@site/src/components/Interactive/CircuitBreakerLab';
import {TokenBucketLab} from '@site/src/components/Interactive/TokenBucketLab';
import {IsolationLab} from '@site/src/components/Interactive/IsolationLab';

export default {
  ...MDXComponents,
  LevelSection,
  LevelQA,
  LevelIntro,
  LevelIntroBody,
  Checkpoint,
  Outcomes,
  HashMapLab,
  SagaLab,
  KafkaLab,
  CircuitBreakerLab,
  TokenBucketLab,
  IsolationLab,
};
