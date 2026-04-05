'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Image from 'next/image';
import React from 'react';

const BRAND_LINKS_URL = 'https://linktr.ee/3dxav';

export default function FloatingInstagramLogo() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Tooltip title="Open 3DXAV links" arrow enterDelay={160}>
      <Box
        component="a"
        href={BRAND_LINKS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open 3DXAV Linktree"
        sx={{
          position: 'fixed',
          right: { xs: 18, sm: 22, md: 28 },
          bottom: { xs: 18, sm: 22, md: 28 },
          width: { xs: 62, sm: 72, md: 84 },
          height: { xs: 62, sm: 72, md: 84 },
          display: 'grid',
          placeItems: 'center',
          borderRadius: '24px',
          background: alpha('#0f0f0f', 0.88),
          border: `1px solid ${alpha('#dbe4f5', 0.96)}`,
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          zIndex: (theme) => theme.zIndex.appBar - 1,
          transition:
            'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
          '&:hover': {
            transform: 'translateY(-3px) scale(1.03)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.20)',
            borderColor: alpha('#9cb8eb', 0.98),
          },
          '&:focus-visible': {
            outline: '3px solid rgba(0, 88, 188, 0.36)',
            outlineOffset: '3px',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background:
                'linear-gradient(180deg, rgba(15,15,15,0.76) 0%, rgba(15,15,15,0.22) 27%, rgba(15,15,15,0) 46%)',
              pointerEvents: 'none',
            }}
          />
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: { xs: 7, sm: 8, md: 9 },
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              color: alpha('#ffffff', 0.94),
              fontSize: { xs: 6.6, sm: 7.4, md: 8.1 },
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              textShadow: '0 2px 10px rgba(0,0,0,0.35)',
              pointerEvents: 'none',
            }}
          >
            Created by
          </Box>
          <Image
            src="/logo-3dxav.png"
            alt="3DXAV"
            fill
            sizes="(max-width: 600px) 62px, (max-width: 900px) 72px, 84px"
            style={{
              objectFit: 'cover',
              objectPosition: 'center 54%',
            }}
            priority
          />
        </Box>
      </Box>
    </Tooltip>
  );
}
