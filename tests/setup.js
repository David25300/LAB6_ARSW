import '@testing-library/jest-dom/vitest'

const noop = () => {}

HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  stroke: noop,
  arc: noop,
  fill: noop,
})
