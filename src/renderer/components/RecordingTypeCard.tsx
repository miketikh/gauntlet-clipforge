import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface RecordingTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const RecordingTypeCard: React.FC<RecordingTypeCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: disabled ? '#1e293b' : isHovered ? '#334155' : '#1e293b',
        border: `2px solid ${disabled ? '#334155' : isHovered ? '#a855f7' : '#475569'}`,
        borderRadius: '12px',
        padding: '32px 24px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered && !disabled ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered && !disabled
          ? '0 12px 24px rgba(168, 85, 247, 0.2)'
          : '0 4px 8px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          backgroundColor: disabled ? '#334155' : isHovered ? '#a855f7' : '#475569',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <Icon size={32} color={disabled ? '#64748b' : '#ffffff'} />
      </div>

      <div>
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: disabled ? '#64748b' : '#f1f5f9',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: disabled ? '#475569' : '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>

      {disabled && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            fontStyle: 'italic',
            marginTop: '8px',
          }}
        >
          Coming soon
        </div>
      )}
    </div>
  );
};

export default RecordingTypeCard;
