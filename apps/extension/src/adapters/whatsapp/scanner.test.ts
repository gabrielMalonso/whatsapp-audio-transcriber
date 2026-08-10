import { describe, expect, it } from 'vitest';
import { calculateWidgetGeometry } from './scanner';

describe('WhatsApp transcript widget geometry', () => {
  it('places the trigger after the duration and before message metadata', () => {
    expect(
      calculateWidgetGeometry(
        { left: 876, top: 534, width: 336, height: 67 },
        574,
        { right: 1019, top: 583 },
        { left: 1141 },
      ),
    ).toEqual({
      triggerLeft: 148,
      triggerTop: 47,
      panelWidth: 574,
      bubbleWidth: 336,
    });
  });

  it('keeps the trigger inside compact bubbles', () => {
    const geometry = calculateWidgetGeometry(
      { left: 20, top: 50, width: 90, height: 40 },
      288,
      { right: 95, top: 82 },
      { left: 78 },
    );

    expect(geometry.triggerLeft).toBe(35);
    expect(geometry.triggerTop).toBe(20);
    expect(geometry.panelWidth).toBe(288);
  });

  it('fills the WhatsApp message lane for outgoing transcripts', () => {
    const geometry = calculateWidgetGeometry(
      { left: 960, top: 50, width: 320, height: 64 },
      574,
      { right: 1100, top: 92 },
    );

    expect(geometry.panelWidth).toBe(574);
    expect(geometry.bubbleWidth).toBe(320);
  });

  it('caps transcript width on large screens', () => {
    const geometry = calculateWidgetGeometry(
      { left: 40, top: 50, width: 320, height: 64 },
      1600,
      { right: 180, top: 92 },
    );

    expect(geometry.panelWidth).toBe(920);
  });
});
