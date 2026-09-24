import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';

interface ToolItem {
  id: string;
  name: string;
  code: string;
  category: string;
  summary: string;
  tags: string[];
  indicatorColor: string;
}

export const PhysicalFolderPocket: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFanned, setIsFanned] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [isResetPulse, setIsResetPulse] = useState<boolean>(false);

  const tools: ToolItem[] = [
    {
      id: 'linux',
      name: 'Linux',
      code: 'Daily Driver // 01',
      category: 'SYS // 01',
      summary: 'My daily OS for lab setups, network forensics, terminal navigation, and virtual machines.',
      tags: ['Daily Driver OS', 'Kali / Debian'],
      indicatorColor: '#10b981'
    },
    {
      id: 'python',
      name: 'Python',
      code: 'Scripting & Automation // 02',
      category: 'SCRIPT // 02',
      summary: 'Writing automation scripts, network scanners, log parsers, and custom security tooling.',
      tags: ['Scripting & Automation', 'AsyncIO'],
      indicatorColor: '#f59e0b'
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      code: 'Agentic Coding & CLI // 03',
      category: 'AI.CLI // 03',
      summary: 'Terminal agentic coding workflow routed through custom CLI harnesses and autonomous pair engineering.',
      tags: ['Agentic Coding & CLI', 'Terminal Harness'],
      indicatorColor: '#f97316'
    },
    {
      id: 'antigravity',
      name: 'Google Gemini / Antigravity',
      code: 'Agentic Workflows & IDE // 04',
      category: 'AGENT // 04',
      summary: 'Pair programming and autonomous agent architectures using Google Antigravity and multi-modal models.',
      tags: ['Agentic Workflows & IDE', 'Multimodal'],
      indicatorColor: '#6366f1'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek Harness',
      code: 'Model Testing & Eval // 05',
      category: 'EVAL // 05',
      summary: 'Hands-on experimentation with open-weight models, reasoning benchmarks, and evaluation harnesses.',
      tags: ['Model Testing & Eval', 'Local Inference'],
      indicatorColor: '#10b981'
    }
  ];

  // Fanned arc angles matching reference screenshots with comfortable vertical offset
  const cardFannedPositions = [
    { rotate: -15, x: -140, y: -24 },
    { rotate: -7.5, x: -70, y: -42 },
    { rotate: 0, x: 0, y: -50 },
    { rotate: 7.5, x: 70, y: -42 },
    { rotate: 15, x: 140, y: -24 }
  ];

  // Hovering fans out the cards initially if not fanned yet
  const handleMouseEnter = () => {
    if (!isFanned) {
      setIsFanned(true);
    }
  };

  // The ONLY thing that resets the pocket if it has already been fanned is clicking the folder box
  const handleFolderBoxClick = () => {
    if (isFanned) {
      // Reset all cards back into pocket and close the fan
      setResetKey((prev) => prev + 1);
      setIsFanned(false);
      setIsResetPulse(true);
      setTimeout(() => setIsResetPulse(false), 450);
    } else {
      // If closed, clicking fans them out
      setIsFanned(true);
    }
  };

  return (
    <section 
      className="section-wrapper" 
      id="tools" 
      style={{ overflow: 'visible', position: 'relative' }}
      ref={containerRef}
    >
      {/* Section Header: Minimal clean heading matching reference */}
      <div className="section-header" style={{ marginBottom: '35px' }}>
        <div>
          <h2 className="section-heading" style={{ fontSize: '2.4rem', fontWeight: 700 }}>
            Tools I work with right now
          </h2>
        </div>
      </div>

      {/* The Physical 3D Skeuomorphic Folder Pocket Scene: Moved down so it never blocks header text */}
      <div 
        className="folder-pocket-scene" 
        key={resetKey}
        style={{ marginTop: '95px', marginBottom: '65px' }}
        onMouseEnter={handleMouseEnter}
      >
        {/* The 5 Cards Stacked & Draggable */}
        <div className="pocket-cards-container">
          {tools.map((item, idx) => {
            const fanPos = cardFannedPositions[idx];
            // Only the front card (DeepSeek, idx 4) is visible when closed/resting
            const isTopCard = idx === tools.length - 1;
            const cardOpacity = isFanned ? 1 : (isTopCard ? 1 : 0);

            return (
              <motion.div
                key={item.id}
                drag
                dragConstraints={{ top: -35, bottom: 250, left: -420, right: 420 }}
                dragElastic={0.2}
                whileDrag={{ scale: 1.06, zIndex: 90, cursor: 'grabbing' }}
                initial={
                  isFanned
                    ? { rotate: fanPos.rotate, x: fanPos.x, y: fanPos.y, opacity: 1 }
                    : { rotate: 0, x: 0, y: 15, opacity: cardOpacity }
                }
                animate={
                  isFanned
                    ? { rotate: fanPos.rotate, x: fanPos.x, y: fanPos.y, opacity: 1 }
                    : { rotate: 0, x: 0, y: 15, opacity: cardOpacity }
                }
                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                className="draggable-tool-card"
                style={{ zIndex: 10 + idx, pointerEvents: isFanned || isTopCard ? 'auto' : 'none' }}
              >
                {/* Header with Title and Code */}
                <div className="d-card-header">
                  <div className="d-card-title-group">
                    <span className="d-card-name">{item.name}</span>
                  </div>
                  <div className="d-card-code mono">{item.category}</div>
                </div>

                {/* Body Summary */}
                <p className="d-card-summary">{item.summary}</p>

                {/* Footer with Pill and Indicator Dot */}
                <div className="d-card-footer">
                  <span className="d-card-pill mono">{item.tags[0]}</span>
                  <span 
                    className="d-card-dot" 
                    style={{ backgroundColor: item.indicatorColor }} 
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Physical Front Leather/Folder Box Sleeve: Clicking this is the ONLY reset action */}
        <div 
          className={`physical-pocket-sleeve ${isResetPulse ? 'pocket-pulse' : ''}`}
          onClick={handleFolderBoxClick}
          title={isFanned ? "Click folder to reset pocket" : "Click folder to open"}
        >
          <div className="sleeve-top-edge" />
          <div className="sleeve-body">
            <div className="sleeve-stitch-groove" />
            
            {/* Clean 'Folder' Label - Directly on folder box, NOT in a pill */}
            <div className="sleeve-folder-label">
              <Folder className="w-3.5 h-3.5 text-accent" />
              <span className="sleeve-folder-text">Folder</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
