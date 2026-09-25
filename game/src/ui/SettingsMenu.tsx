import React, { useState } from 'react';
import { getAudioManager } from '../game/audio/AudioManager';

interface SettingsMenuProps {
  onClose: () => void;
  onTouchControlsChange: (enabled: boolean) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose, onTouchControlsChange }) => {
  const audio = getAudioManager();
  const [masterVol, setMasterVol] = useState(audio.getMasterVolume());
  const [sfxVol, setSfxVol] = useState(audio.getSFXVolume());
  const [musicVol, setMusicVol] = useState(audio.getMusicVolume());
  const [muted, setMuted] = useState(audio.isMuted());
  const [screenShake, setScreenShake] = useState(() => localStorage.getItem('fat-brawl-screen-shake') !== 'false');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('fat-brawl-reduced-motion') === 'true');
  const [touchControls, setTouchControls] = useState(() => localStorage.getItem('fat-brawl-touch-controls') === 'true');
  const [refTest, setRefTest] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('referenceTest') === 'true';
  });

  const handleMasterVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setMasterVol(v);
    audio.setMasterVolume(v);
  };

  const handleSfxVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSfxVol(v);
    audio.setSFXVolume(v);
  };

  const handleMute = () => {
    audio.toggleMute();
    setMuted(audio.isMuted());
  };

  const handleMusicVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setMusicVol(v);
    audio.setMusicVolume(v);
  };

  const toggleSetting = (key: string, value: boolean, setter: (next: boolean) => void) => {
    const next = !value;
    setter(next);
    localStorage.setItem(key, String(next));
    if (key === 'fat-brawl-touch-controls') onTouchControlsChange(next);
  };

  const toggleRefTest = () => {
    const nextVal = !refTest;
    setRefTest(nextVal);
    const url = new URL(window.location.href);
    if (nextVal) {
      url.searchParams.set('referenceTest', 'true');
    } else {
      url.searchParams.delete('referenceTest');
    }
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 14, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#121624',
        border: '2px solid rgba(255, 221, 0, 0.6)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255, 221, 0, 0.2)',
        borderRadius: '16px',
        padding: '28px 36px',
        width: '380px',
        maxWidth: '92vw',
        color: '#ffffff',
        fontFamily: '"Impact", "Arial Black", sans-serif',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '30px', color: '#ffdd00', textAlign: 'center', letterSpacing: '1px' }}>
          SETTINGS
        </h2>

        {/* Volume controls */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', color: '#90a0d9' }}>
            <span>Master Volume</span>
            <span>{Math.round(masterVol * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVol}
            onChange={handleMasterVol}
            style={{ width: '100%', accentColor: '#ffdd00' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', color: '#90a0d9' }}>
            <span>SFX Volume</span>
            <span>{Math.round(sfxVol * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVol}
            onChange={handleSfxVol}
            style={{ width: '100%', accentColor: '#ffdd00' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', color: '#90a0d9' }}>
            <span>Music Volume</span>
            <span>{Math.round(musicVol * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={musicVol}
            onChange={handleMusicVol}
            style={{ width: '100%', accentColor: '#ffdd00' }}
          />
        </div>

        <button
          onClick={handleMute}
          type="button"
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '14px',
            background: muted ? '#7a1f26' : '#1e382b',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {muted ? '🔇 SOUND MUTED (CLICK TO UNMUTE)' : '🔊 SOUND ACTIVE (CLICK TO MUTE)'}
        </button>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
          {[
            ['Screen Shake', screenShake, setScreenShake, 'fat-brawl-screen-shake'],
            ['Reduced Motion', reducedMotion, setReducedMotion, 'fat-brawl-reduced-motion'],
            ['Touch Controls', touchControls, setTouchControls, 'fat-brawl-touch-controls'],
          ].map(([label, value, setter, key]) => (
            <button
              key={key as string}
              type="button"
              onClick={() => toggleSetting(key as string, value as boolean, setter as (next: boolean) => void)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
              }}
            >
              <span>{label as string}</span>
              <strong style={{ color: value ? '#38ef7d' : '#ff8c8c' }}>{value ? 'ON' : 'OFF'}</strong>
            </button>
          ))}
        </div>

        {/* Reference Test Mode */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '12px 14px',
          borderRadius: '8px',
          marginBottom: '18px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#ffdd00' }}>Reference Test Mode</div>
              <div style={{ fontSize: '10px', color: '#888899', fontFamily: 'sans-serif' }}>Deterministic 6-step video reproduction</div>
            </div>
            <button
              type="button"
              onClick={toggleRefTest}
              style={{
                background: refTest ? '#38ef7d' : '#33384a',
                color: refTest ? '#082014' : '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {refTest ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          style={{
            width: '100%',
            padding: '12px',
            background: '#ffdd00',
            border: 'none',
            borderRadius: '8px',
            color: '#121624',
            fontSize: '18px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(255, 221, 0, 0.4)',
          }}
        >
          APPLY & CLOSE
        </button>
      </div>
    </div>
  );
};

export default SettingsMenu;
