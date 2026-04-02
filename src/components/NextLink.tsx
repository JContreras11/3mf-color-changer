'use client';

import Link, { type LinkProps } from 'next/link';
import React from 'react';

type NextLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const NextLink = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  function NextLink(props, ref) {
    return <Link ref={ref} {...props} />;
  }
);

export default NextLink;
