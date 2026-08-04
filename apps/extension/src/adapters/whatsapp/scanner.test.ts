import { describe, expect, it } from 'vitest';
import { calculateWidgetGeometry } from './scanner';

describe('WhatsApp transcript widget geometry', () => {
  it('places the trigger after the duration and before message metadata', () => {
    expect(
      calculateWidgetGeometry(
        { left: 876, top: 534, width: 336, height: 67 },
        { right: 1019, top: 583 },
        { left: 1141 },
      ),
    ).toEqual({
      triggerLeft: 148,
      triggerTop: 47,
      panelWidth: 336,
    });
  });

  it('keeps the trigger inside compact bubbles', () => {
    const geometry = calculateWidgetGeometry(
      { left: 20, top: 50, width: 90, height: 40 },
      { right: 95, top: 82 },
      { left: 78 },
    );

    expect(geometry.triggerLeft).toBe(35);
    expect(geometry.triggerTop).toBe(20);
  });
});
