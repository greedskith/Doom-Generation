import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CompositionDoodle } from './CompositionDoodle';

describe('CompositionDoodle Component', () => {
  it('renders nothing when analysis is not provided', () => {
    const { container } = render(<CompositionDoodle visible={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when visible is false', () => {
    const analysis = { lines: [{ x1: 0, y1: 0, x2: 100, y2: 100 }], focalPoints: [{ x: 50, y: 50 }] };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when analysis lines and focalPoints are empty', () => {
    const analysis = { lines: [], focalPoints: [] };
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when analysis does not contain lines or focalPoints arrays', () => {
    const analysis = {};
    const { container } = render(<CompositionDoodle analysis={analysis} visible={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders lines and focal points correctly', () => {
    const analysis = {
      lines: [
        { x1: 10, y1: 20, x2: 30, y2: 40 },
        { x1: 50, y1: 60, x2: 70, y2: 80 },
      ],
      focalPoints: [
        { x: 25, y: 35 },
      ],
    };

    render(<CompositionDoodle analysis={analysis} visible={true} />);

    // Check that the container overlay is rendered
    const overlay = document.querySelector('.doodle-overlay');
    expect(overlay).toBeInTheDocument();

    // Check that lines are rendered
    const lines = document.querySelectorAll('line');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute('x1', '10');
    expect(lines[0]).toHaveAttribute('y1', '20');
    expect(lines[0]).toHaveAttribute('x2', '30');
    expect(lines[0]).toHaveAttribute('y2', '40');

    expect(lines[1]).toHaveAttribute('x1', '50');
    expect(lines[1]).toHaveAttribute('y1', '60');

    // Check that focal points are rendered
    const circles = document.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('cx', '25');
    expect(circles[0]).toHaveAttribute('cy', '35');
    expect(circles[0]).toHaveAttribute('r', '1.2');
  });
});
