'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 20, readonly = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div
      style={{ display: 'inline-flex', gap: 2, cursor: readonly ? 'default' : 'pointer' }}
      onMouseLeave={() => !readonly && setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          style={{
            color: star <= displayValue ? '#f59e0b' : 'var(--crm-text-disabled)',
            fill: star <= displayValue ? '#f59e0b' : 'none',
            transition: 'color 0.15s, fill 0.15s',
          }}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onClick={() => {
            if (!readonly && onChange) {
              onChange(star);
            }
          }}
        />
      ))}
    </div>
  );
}
