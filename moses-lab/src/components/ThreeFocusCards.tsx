import React, { useState, useEffect } from 'react';
import { Shield, Network, Eye } from 'lucide-react';

interface FocusCardData {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tags: string[];
  themeClass: 'light' | 'blue' | 'dark';
}

export const ThreeFocusCards: React.FC = () => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Rotating topics list matching kingjboy.tech screenshots (OSINT -> Cryptography -> Threat Intel -> Security Research)
  const rotatingTopics = [
    'Threat Intel',
    'OSINT',
    'Cryptography',
    'Security Research',
    'Timeseries Trading'
  ];
  const [topicIndex, setTopicIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTopicIndex((prev) => (prev + 1) % rotatingTopics.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [rotatingTopics.length]);

  const cards: FocusCardData[] = [
    {
      id: 'ethical-hacking',
      icon: <Shield className="w-6 h-6" />,
      title: 'Ethical Hacking',
      description: 'Learning offensive fundamentals: understanding how attackers spot weaknesses in systems, network architectures, and how proactive security protects infrastructure.',
      tags: ['Security Basics', 'Reconnaissance', 'Vulnerabilities'],
      themeClass: 'light'
    },
    {
      id: 'pentesting',
      icon: <Network className="w-6 h-6" />,
      title: 'Penetration Testing',
      description: 'Practicing step-by-step security testing in virtual labs: port scanning, service enumeration, spotting common misconfigurations, and drafting findings.',
      tags: ['Network Auditing', 'Port Scanning', 'Virtual Labs'],
      themeClass: 'blue'
    },
    {
      id: 'vision-ai',
      icon: <Eye className="w-6 h-6" />,
      title: 'Robotics & AI Engineering',
      description: 'Exploring autonomous hardware, embedded applied intelligence, computer vision models, and integrating code with the physical world.',
      tags: ['Deep Learning', 'Computer Vision', 'Pluto HCI'],
      themeClass: 'dark'
    }
  ];

  // At first (before hover): shows ONLY ONE FACE (center card Penetration Testing in front, others tucked directly behind)
  // After hover: expands and spreads cards out so all contents are 100% visible and legible
  const getCardTransform = (cardId: string) => {
    // 1. Hovering Ethical Hacking (Left Card)
    if (hoveredCardId === 'ethical-hacking') {
      if (cardId === 'ethical-hacking') {
        return {
          transform: 'rotate(-2deg) translateX(-260px) translateY(-24px) scale(1.05)',
          zIndex: 50,
          opacity: 1,
          boxShadow: '0 28px 65px rgba(0, 0, 0, 0.75), 0 0 0 1.5px rgba(255, 255, 255, 0.2)'
        };
      }
      if (cardId === 'pentesting') {
        return {
          transform: 'rotate(3deg) translateX(70px) translateY(10px) scale(0.95)',
          zIndex: 10,
          opacity: 0.92
        };
      }
      if (cardId === 'vision-ai') {
        return {
          transform: 'rotate(7deg) translateX(290px) translateY(18px) scale(0.92)',
          zIndex: 5,
          opacity: 0.86
        };
      }
    }

    // 2. Hovering Vision AI (Right Card)
    if (hoveredCardId === 'vision-ai') {
      if (cardId === 'vision-ai') {
        return {
          transform: 'rotate(2deg) translateX(260px) translateY(-24px) scale(1.05)',
          zIndex: 50,
          opacity: 1,
          boxShadow: '0 28px 65px rgba(0, 0, 0, 0.75), 0 0 0 1.5px rgba(0, 229, 255, 0.3)'
        };
      }
      if (cardId === 'pentesting') {
        return {
          transform: 'rotate(-3deg) translateX(-70px) translateY(10px) scale(0.95)',
          zIndex: 10,
          opacity: 0.92
        };
      }
      if (cardId === 'ethical-hacking') {
        return {
          transform: 'rotate(-7deg) translateX(-290px) translateY(18px) scale(0.92)',
          zIndex: 5,
          opacity: 0.86
        };
      }
    }

    // 3. Hovering Penetration Testing (Center Card)
    if (hoveredCardId === 'pentesting') {
      if (cardId === 'pentesting') {
        return {
          transform: 'rotate(0deg) translateX(0px) translateY(-26px) scale(1.05)',
          zIndex: 50,
          opacity: 1,
          boxShadow: '0 30px 70px rgba(37, 99, 235, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.3)'
        };
      }
      if (cardId === 'ethical-hacking') {
        return {
          transform: 'rotate(-5deg) translateX(-280px) translateY(12px) scale(0.95)',
          zIndex: 10,
          opacity: 0.92
        };
      }
      if (cardId === 'vision-ai') {
        return {
          transform: 'rotate(5deg) translateX(280px) translateY(12px) scale(0.95)',
          zIndex: 10,
          opacity: 0.92
        };
      }
    }

    // 4. AT FIRST (Resting state before hover): ONLY ONE FACE IS VISIBLE!
    // Center card (Penetration Testing) is the ONLY visible card.
    // The side cards are completely hidden (opacity 0) directly behind it with zero peeking edges.
    if (cardId === 'pentesting') {
      return {
        transform: 'rotate(0deg) translateX(0px) translateY(0px) scale(1.0)',
        zIndex: 20,
        opacity: 1,
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)'
      };
    }
    if (cardId === 'ethical-hacking') {
      return {
        transform: 'rotate(0deg) translateX(0px) translateY(0px) scale(0.95)',
        zIndex: 5,
        opacity: 0,
        pointerEvents: 'none' as const
      };
    }
    if (cardId === 'vision-ai') {
      return {
        transform: 'rotate(0deg) translateX(0px) translateY(0px) scale(0.95)',
        zIndex: 5,
        opacity: 0,
        pointerEvents: 'none' as const
      };
    }

    return { zIndex: 1 };
  };

  return (
    <section className="section-wrapper" id="focus" style={{ overflow: 'visible' }}>
      <div className="section-header">
        <div>
          <h2 className="section-heading" style={{ fontSize: '2.4rem', fontWeight: 700 }}>
            What I'm learning & interested in
          </h2>
        </div>
        <p className="section-desc" style={{ maxWidth: '420px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          As a 200-level student, I'm early in my degree. These are the primary fields I'm curious about and actively exploring.
        </p>
      </div>

      {/* Calm, Overlapping Playing Cards Deck - Shows ONLY 1 face at first, fans out on hover */}
      <div 
        className="fan-deck-container"
        onMouseEnter={() => {
          if (!hoveredCardId) setHoveredCardId('pentesting');
        }}
        onMouseLeave={() => setHoveredCardId(null)}
      >
        {cards.map((card) => {
          const isElevated = hoveredCardId === card.id || (!hoveredCardId && card.id === 'pentesting');
          const dynamicStyle = getCardTransform(card.id);

          return (
            <div
              key={card.id}
              className={`fan-card fan-card-${card.themeClass} ${isElevated ? 'active-front' : ''}`}
              style={dynamicStyle}
              onMouseEnter={() => setHoveredCardId(card.id)}
            >
              <div className="fan-card-icon-wrap">
                {card.icon}
              </div>

              <h3 className="fan-card-title">{card.title}</h3>
              <p className="fan-card-desc">{card.description}</p>

              <div className="fan-card-tags">
                {card.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="fan-card-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rotating Topic Text (Exact Match to kingjboy.tech screenshots) */}
      <div className="other-topics-row" style={{ marginTop: '24px' }}>
        <span>Other topics covered in coursework & self-study: </span>
        <button 
          className="rotating-topic-link mono"
          onClick={() => setTopicIndex((prev) => (prev + 1) % rotatingTopics.length)}
          title="Click to cycle next topic"
        >
          {rotatingTopics[topicIndex]}
        </button>
      </div>
    </section>
  );
};
