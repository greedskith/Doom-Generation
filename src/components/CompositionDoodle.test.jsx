import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CompositionDoodle } from './CompositionDoodle';

describe('CompositionDoodle', () => {
  it('returns null when analysis is undefined', () => {
    const { container } = render(<CompositionDoodle analysis={undefined} visible={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when analysis is null', () => {
    const { container } = render(<CompositionDoodle analysis={null} visible={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when visible is false', () => {
    const analysis = { lines: [], focalPoints: [] };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when lines and focalPoints are empty', () => {
    const analysis = { lines: [], focalPoints: [] };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when lines and focalPoints are missing from analysis', () => {
    const analysis = {};
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG with lines when lines are provided', () => {
    const analysis = {
      lines: [{ x1: 0, y1: 0, x2: 100, y2: 100 }],
      focalPoints: []
    };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(1);
    expect(lines[0].getAttribute('x1')).toBe('0');
  });

  it('renders SVG with circles when focalPoints are provided', () => {
    const analysis = {
      lines: [],
      focalPoints: [{ x: 50, y: 50 }]
    };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
    expect(circles[0].getAttribute('cx')).toBe('50');
  });

  it('renders SVG with both lines and focalPoints', () => {
    const analysis = {
      lines: [{ x1: 0, y1: 0, x2: 10, y2: 10 }],
      focalPoints: [{ x: 5, y: 5 }]
    };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelectorAll('line').length).toBe(1);
    expect(container.querySelectorAll('circle').length).toBe(1);
  });
});
