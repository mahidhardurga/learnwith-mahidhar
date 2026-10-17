import React from 'react';
import Link from '@theme-original/DocSidebarItem/Link';
import type LinkType from '@theme/DocSidebarItem/Link';
import type {WrapperProps} from '@docusaurus/types';
import {useProgress} from '@site/src/components/progress';

type Props = WrapperProps<typeof LinkType>;

/** Adds a tick to pages the reader marked as done. */
export default function LinkWrapper(props: Props): React.JSX.Element {
  const {done} = useProgress();
  const isDone = done.has(props.item.href);
  const item = isDone ? {...props.item, className: `${props.item.className ?? ''} lw-done`.trim()} : props.item;
  return <Link {...props} item={item} />;
}
