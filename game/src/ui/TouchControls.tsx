import React, { useState, useCallback, useRef } from 'react';
import { InputManager } from '../game/input/InputManager';
import type { InputAction } from '../game/input/InputManager';
import './TouchControls.css';

interface TouchControlsProps {
  visible?: boolean;
  disabled?: boolean;
}

interface TouchButtonProps {
  action: InputAction;
  label: string;
  sublabel?: string;
  colorTheme?: 'green' | 'red' | 'blue' | 'yellow' | 'neutral' | 'accent';
  className?: string;
  isPill?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  visible = true,
  disabled = false,
}) => {
  if (!visible) return null;

  return (
    <div className={`psp-touch-layer ${disabled ? 'disabled' : ''}`}>
      {/* LEFT SIDE: PSP D-PAD */}
      <div className="psp-dpad-cluster" aria-label="Directional Pad">
        <div className="psp-dpad-cross">
          <TouchBtn action="MOVE_UP" label="▲" className="dpad-up" colorTheme="neutral" />
          <TouchBtn action="MOVE_LEFT" label="◀" className="dpad-left" colorTheme="neutral" />
          <div className="dpad-center-hub" />
          <TouchBtn action="MOVE_RIGHT" label="▶" className="dpad-right" colorTheme="neutral" />
          <TouchBtn action="MOVE_DOWN" label="▼" className="dpad-down" colorTheme="neutral" />
        </div>
      </div>

      {/* CENTER BOTTOM: SELECT & START */}
      <div className="psp-center-cluster">
        <TouchBtn action="CANCEL" label="SELECT" sublabel="MENU" isPill colorTheme="neutral" />
        <TouchBtn action="PAUSE" label="START" sublabel="PAUSE" isPill colorTheme="accent" />
      </div>

      {/* RIGHT SIDE: PSP / CONSOLE DIAMOND BUTTONS */}
      <div className="psp-action-cluster" aria-label="Action Buttons">
        <div className="psp-action-diamond">
          {/* TOP: Y */}
          <TouchBtn
            action="CONFIRM"
            label="Y"
            sublabel="CONFIRM"
            className="action-top"
            colorTheme="yellow"
          />
          {/* LEFT: X */}
          <TouchBtn
            action="ATTACK_SPECIAL"
            label="X"
            sublabel="SPECIAL"
            className="action-left"
            colorTheme="blue"
          />
          {/* RIGHT: B */}
          <TouchBtn
            action="ATTACK_HEAVY"
            label="B"
            sublabel="HEAVY"
            className="action-right"
            colorTheme="red"
          />
          {/* BOTTOM: A */}
          <TouchBtn
            action="ATTACK_BASIC"
            label="A"
            sublabel="BASIC"
            className="action-bottom"
            colorTheme="green"
          />
        </div>
      </div>
    </div>
  );
};

const TouchBtn: React.FC<TouchButtonProps> = ({
  action,
  label,
  sublabel,
  colorTheme = 'neutral',
  className = '',
  isPill = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const startAction = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsPressed(true);

    const inputMgr = InputManager.getInstance();
    inputMgr.setTouchActionHeld(action, true);
  }, [action]);

  const endAction = useCallback((e: React.PointerEvent) => {
    if (activePointerId.current !== null && activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setIsPressed(false);

    const inputMgr = InputManager.getInstance();
    inputMgr.setTouchActionHeld(action, false);
  }, [action]);

  return (
    <button
      type="button"
      className={`psp-btn ${isPill ? 'psp-pill-btn' : 'psp-round-btn'} ${colorTheme} ${className} ${
        isPressed ? 'pressed' : ''
      }`}
      onPointerDown={startAction}
      onPointerUp={endAction}
      onPointerCancel={endAction}
      onPointerLeave={endAction}
      aria-label={`${label} ${sublabel || ''}`}
      tabIndex={-1}
    >
      <span className="psp-btn-primary">{label}</span>
      {sublabel && <span className="psp-btn-sub">{sublabel}</span>}
    </button>
  );
};

export default TouchControls;
