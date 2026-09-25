// InputManager.ts
// Unified Input Abstraction for Keyboard, Gamepad, and PSP-Style Touch Controls

export type InputAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_UP'
  | 'MOVE_DOWN'
  | 'ATTACK_BASIC'
  | 'ATTACK_HEAVY'
  | 'ATTACK_SPECIAL'
  | 'PAUSE'
  | 'CONFIRM'
  | 'CANCEL';

export type InputCallback = (action: InputAction) => void;

export interface KeyboardBindings {
  moveLeft: string[];
  moveRight: string[];
  moveUp: string[];
  moveDown: string[];
  attackBasic: string[];
  attackHeavy: string[];
  attackSpecial: string[];
  confirm: string[];
  pause: string[];
  cancel: string[];
}

export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  moveUp: ['ArrowUp', 'KeyW'],
  moveDown: ['ArrowDown', 'KeyS'],
  attackBasic: ['KeyJ', 'Digit1'],
  attackHeavy: ['KeyK', 'Digit2'],
  attackSpecial: ['KeyL', 'Digit3'],
  confirm: ['Space', 'Enter'],
  pause: ['Escape'],
  cancel: ['Backspace', 'Escape'],
};

export interface GamepadToastListener {
  (message: 'CONTROLLER CONNECTED' | 'CONTROLLER DISCONNECTED'): void;
}

export class InputManager {
  private static instance: InputManager | null = null;
  private callbacks: InputCallback[] = [];
  private toastListeners: GamepadToastListener[] = [];
  private enabled = true;

  // Key tracking
  private bindings: KeyboardBindings = { ...DEFAULT_KEYBOARD_BINDINGS };
  private activeKeys: Set<string> = new Set();

  // Action states
  private actionHeld: Record<InputAction, boolean> = {
    MOVE_LEFT: false,
    MOVE_RIGHT: false,
    MOVE_UP: false,
    MOVE_DOWN: false,
    ATTACK_BASIC: false,
    ATTACK_HEAVY: false,
    ATTACK_SPECIAL: false,
    PAUSE: false,
    CONFIRM: false,
    CANCEL: false,
  };

  private prevActionHeld: Record<InputAction, boolean> = {
    MOVE_LEFT: false,
    MOVE_RIGHT: false,
    MOVE_UP: false,
    MOVE_DOWN: false,
    ATTACK_BASIC: false,
    ATTACK_HEAVY: false,
    ATTACK_SPECIAL: false,
    PAUSE: false,
    CONFIRM: false,
    CANCEL: false,
  };

  // Gamepad state
  private gamepadConnected = false;

  constructor() {
    InputManager.instance = this;
    this.setupWindowListeners();
  }

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  private setupWindowListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scrolling on game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.activeKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.activeKeys.delete(e.code);
  };

  private handleGamepadConnected = (e: GamepadEvent) => {
    this.gamepadConnected = true;
    console.log('Gamepad connected:', e.gamepad.id);
    this.dispatchToast('CONTROLLER CONNECTED');
  };

  private handleGamepadDisconnected = (e: GamepadEvent) => {
    this.gamepadConnected = false;
    console.log('Gamepad disconnected:', e.gamepad.id);
    this.dispatchToast('CONTROLLER DISCONNECTED');
  };

  private dispatchToast(msg: 'CONTROLLER CONNECTED' | 'CONTROLLER DISCONNECTED') {
    this.toastListeners.forEach(listener => listener(msg));
  }

  onToast(listener: GamepadToastListener) {
    this.toastListeners.push(listener);
    return () => {
      this.toastListeners = this.toastListeners.filter(l => l !== listener);
    };
  }

  // Subscribe to action events
  on(cb: InputCallback) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(c => c !== cb);
    };
  }

  enable() { this.enabled = true; }
  disable() {
    this.enabled = false;
    // Clear all action held states
    (Object.keys(this.actionHeld) as InputAction[]).forEach(act => {
      this.actionHeld[act] = false;
      this.prevActionHeld[act] = false;
    });
  }
  isEnabled() { return this.enabled; }

  setBindings(newBindings: Partial<KeyboardBindings>) {
    this.bindings = { ...this.bindings, ...newBindings };
  }

  getBindings(): KeyboardBindings {
    return { ...this.bindings };
  }

  // External trigger (used by PSP Touch Controls or scripted test sequences)
  emitAction(action: InputAction) {
    if (!this.enabled) return;
    this.callbacks.forEach(cb => cb(action));
  }

  // Set action held state directly (for touch directional buttons)
  setTouchActionHeld(action: InputAction, isHeld: boolean) {
    if (!this.enabled && isHeld) return;
    const wasHeld = this.actionHeld[action];
    this.actionHeld[action] = isHeld;
    if (isHeld && !wasHeld) {
      this.callbacks.forEach(cb => cb(action));
    }
  }

  isActionHeld(action: InputAction): boolean {
    return this.enabled && this.actionHeld[action];
  }

  isActionJustPressed(action: InputAction): boolean {
    return this.enabled && this.actionHeld[action] && !this.prevActionHeld[action];
  }

  // Per-frame polling update (called by Phaser scene update loop)
  update() {
    // 1. Copy previous states
    (Object.keys(this.actionHeld) as InputAction[]).forEach(act => {
      this.prevActionHeld[act] = this.actionHeld[act];
    });

    if (!this.enabled) return;

    // 2. Poll Keyboard
    const checkKeyHeld = (codes: string[]) => codes.some(code => this.activeKeys.has(code));

    const kbActions: Record<InputAction, boolean> = {
      MOVE_LEFT: checkKeyHeld(this.bindings.moveLeft),
      MOVE_RIGHT: checkKeyHeld(this.bindings.moveRight),
      MOVE_UP: checkKeyHeld(this.bindings.moveUp),
      MOVE_DOWN: checkKeyHeld(this.bindings.moveDown),
      ATTACK_BASIC: checkKeyHeld(this.bindings.attackBasic),
      ATTACK_HEAVY: checkKeyHeld(this.bindings.attackHeavy),
      ATTACK_SPECIAL: checkKeyHeld(this.bindings.attackSpecial),
      CONFIRM: checkKeyHeld(this.bindings.confirm),
      PAUSE: checkKeyHeld(this.bindings.pause),
      CANCEL: checkKeyHeld(this.bindings.cancel),
    };

    // 3. Poll Gamepad (Physical Game Controller)
    const gpActions: Record<InputAction, boolean> = {
      MOVE_LEFT: false,
      MOVE_RIGHT: false,
      MOVE_UP: false,
      MOVE_DOWN: false,
      ATTACK_BASIC: false,
      ATTACK_HEAVY: false,
      ATTACK_SPECIAL: false,
      CONFIRM: false,
      PAUSE: false,
      CANCEL: false,
    };

    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find(pad => pad !== null && pad.connected);

      if (gp) {
        if (!this.gamepadConnected) {
          this.gamepadConnected = true;
          this.dispatchToast('CONTROLLER CONNECTED');
        }

        const isStandard = gp.mapping === 'standard';

        // Helper to check button index
        const isBtn = (idx: number) => {
          if (idx < gp.buttons.length) {
            return gp.buttons[idx].pressed || gp.buttons[idx].value > 0.5;
          }
          return false;
        };

        if (isStandard) {
          // Standard mapping:
          // Buttons:
          // 0: A / Cross
          // 1: B / Circle
          // 2: X / Square
          // 3: Y / Triangle
          // 8: Back / Select
          // 9: Start
          // 12: D-pad Up, 13: Down, 14: Left, 15: Right
          gpActions.ATTACK_BASIC = isBtn(0);
          gpActions.ATTACK_HEAVY = isBtn(1);
          gpActions.ATTACK_SPECIAL = isBtn(2);
          gpActions.CONFIRM = isBtn(3) || isBtn(0);
          gpActions.CANCEL = isBtn(8) || isBtn(1);
          gpActions.PAUSE = isBtn(9);

          // D-pad
          gpActions.MOVE_UP = isBtn(12);
          gpActions.MOVE_DOWN = isBtn(13);
          gpActions.MOVE_LEFT = isBtn(14);
          gpActions.MOVE_RIGHT = isBtn(15);
        } else {
          // Non-standard fallback
          gpActions.ATTACK_BASIC = isBtn(0);
          gpActions.ATTACK_HEAVY = isBtn(1);
          gpActions.ATTACK_SPECIAL = isBtn(2);
          gpActions.CONFIRM = isBtn(3);
          gpActions.CANCEL = isBtn(4);
          gpActions.PAUSE = isBtn(7) || isBtn(9);
        }

        // Left analog stick (axes 0: X, 1: Y) with 0.3 deadzone
        if (gp.axes.length >= 2) {
          const axisX = gp.axes[0];
          const axisY = gp.axes[1];
          const deadzone = 0.3;
          if (axisX < -deadzone) gpActions.MOVE_LEFT = true;
          if (axisX > deadzone) gpActions.MOVE_RIGHT = true;
          if (axisY < -deadzone) gpActions.MOVE_UP = true;
          if (axisY > deadzone) gpActions.MOVE_DOWN = true;
        }
      } else if (this.gamepadConnected) {
        this.gamepadConnected = false;
        this.dispatchToast('CONTROLLER DISCONNECTED');
      }
    }

    // 4. Merge all sources (Keyboard, Gamepad, Touch held)
    (Object.keys(this.actionHeld) as InputAction[]).forEach(act => {
      const isNowHeld = kbActions[act] || gpActions[act] || this.actionHeld[act];
      const wasHeld = this.prevActionHeld[act];

      this.actionHeld[act] = isNowHeld;

      // If just went down, trigger unified event callback!
      if (isNowHeld && !wasHeld) {
        this.callbacks.forEach(cb => cb(act));
      }
    });

  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    this.callbacks = [];
    this.toastListeners = [];
    InputManager.instance = null;
  }
}
