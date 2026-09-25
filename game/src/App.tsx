import React, { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { createGame } from './game/Game';
import { TouchControls } from './ui/TouchControls';
import { SettingsMenu } from './ui/SettingsMenu';
import { InputManager } from './game/input/InputManager';
import './App.css';

export const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('fat-brawl-touch-controls');
    if (saved !== null) return saved === 'true';
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  });

  const handleTouchControlsChange = (enabled: boolean) => {
    setShowTouchControls(enabled);
    window.localStorage.setItem('fat-brawl-touch-controls', String(enabled));
  };

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    gameRef.current = createGame('phaser-container');

    const inputMgr = InputManager.getInstance();
    const unsubToast = inputMgr.onToast((msg) => {
      setControllerConnected(msg.includes('CONNECTED') && !msg.includes('DISCONNECTED'));
    });

    return () => {
      unsubToast();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="app-root">
      {/* Title bar */}
      <header className="title-bar">
        <div className="title-branding">
          <span className="title-icon">🐾</span>
          <span className="title-text">FAT BRAWL</span>
          <span className="title-badge">CHOREOGRAPHY RECREATION</span>
        </div>

        <div className="title-controls">
          {controllerConnected && (
            <span className="controller-badge">🎮 Gamepad Connected</span>
          )}

          <button
            type="button"
            className={`touch-toggle-btn ${showTouchControls ? 'active' : ''}`}
            onClick={() => handleTouchControlsChange(!showTouchControls)}
            title="Toggle PSP On-Screen Touch Controls"
          >
            🕹️ Touch: {showTouchControls ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings(prev => !prev)}
            title="Settings & Test Mode"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="game-wrapper">
        <div id="phaser-container" ref={containerRef} className="phaser-container" />

        {/* PSP-Style Handheld Console Touch Controls Overlay */}
        <TouchControls visible={showTouchControls} />
      </main>

      {/* Bottom Controls Bar */}
      <footer className="footer-bar">
        <div className="control-capsule">
          <span className="pill-key">WASD / ↑←↓→</span> Move
        </div>
        <div className="control-capsule">
          <span className="pill-key">J</span> Bite
        </div>
        <div className="control-capsule">
          <span className="pill-key">K</span> Scratch
        </div>
        <div className="control-capsule">
          <span className="pill-key">L</span> Tackle
        </div>
        <div className="control-capsule">
          <span className="pill-key">SPACE</span> Confirm
        </div>
        <div className="control-capsule">
          <span className="pill-key">ESC</span> Pause
        </div>
        <div className="control-capsule">
          <span className="pill-key">F3</span> Debug Mode
        </div>
      </footer>

      {/* Settings & Mode Modal */}
      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onTouchControlsChange={handleTouchControlsChange}
        />
      )}
    </div>
  );
};

export default App;
