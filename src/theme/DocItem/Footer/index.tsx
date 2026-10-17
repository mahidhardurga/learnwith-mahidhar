import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import MarkComplete from '@site/src/components/MarkComplete';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): React.JSX.Element {
  return (
    <>
      <MarkComplete />
      <Footer {...props} />
    </>
  );
}
