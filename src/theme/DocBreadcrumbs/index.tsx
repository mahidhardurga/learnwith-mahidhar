import React from 'react';
import DocBreadcrumbs from '@theme-original/DocBreadcrumbs';
import type DocBreadcrumbsType from '@theme/DocBreadcrumbs';
import type {WrapperProps} from '@docusaurus/types';
import LessonBar from '@site/src/components/LessonBar';

type Props = WrapperProps<typeof DocBreadcrumbsType>;

export default function DocBreadcrumbsWrapper(props: Props): React.JSX.Element {
  return (
    <>
      <DocBreadcrumbs {...props} />
      <LessonBar />
    </>
  );
}
