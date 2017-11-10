import Base from './base.js';

// This is a hacky solution to make SVG work
// https://github.com/brainly/html-sketchapp/issues/4
class SVG extends Base {
  constructor({rawSVGString, width, height, x, y}) {
    super();
    this._rawSVGString = rawSVGString;
    this._width = width;
    this._height = height;
    this._x = x;
    this._y = y;
  }

  toJSON() {
    return {
      isSVG: true,
      rawSVGString: this._rawSVGString,
      width: this._width,
      height: this._height,
      x: this._x,
      y: this._y
    };
  }
}

export default SVG;
