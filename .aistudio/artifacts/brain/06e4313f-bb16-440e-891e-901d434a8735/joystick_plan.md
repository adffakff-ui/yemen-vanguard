# Implementation Plan: Semi-Transparent Circular Joystick

To implement a joystick controller matching the style of modern tactical mobile shooters (as requested), we will build a custom, semi-transparent, circular virtual joystick component in React, optimized for low-latency touch input.

## 1. Components
*   **`src/components/Joystick.tsx`**: The main virtual joystick controller.
    *   It will consist of two circular elements:
        *   **Base**: A large, static, semi-transparent circle.
        *   **Knob**: A smaller, opaque or semi-transparent circle that moves within the base.
    *   Uses touch events (`touchstart`, `touchmove`, `touchend`) for responsiveness.
    *   Calculates relative movement vectors (`x`, `y`) within the joystick's deadzone.

## 2. Technical Approach
*   **Styling**: Utilize Tailwind CSS for translucency (`bg-white/20`, `backdrop-blur-sm`, `border-white/30`) to achieve the semi-transparent "tactical" look.
*   **Logic**:
    *   Track touch start coordinates.
    *   Update knob position based on `touchmove` delta.
    *   Normalize movement to a `-1 to 1` range for engine input.
    *   Reset knob position to center on `touchend`.

## 3. Integration Plan
1.  **Create `src/components/Joystick.tsx`**: Implementation of the joystick component with touch event handling.
2.  **Update `src/components/TouchControls.tsx`**: Replace existing directional input UI with the new `Joystick` component.
3.  **Engine Binding**: Pass the normalized joystick input to `YemenCombatEngine` to control player movement.

## 4. Verification
*   Compile with `compile_applet`.
*   Verify smooth visual feedback and responsive movement on mobile touch simulation in the browser.
