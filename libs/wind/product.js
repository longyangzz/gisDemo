function ensureNumber(num, fallback) {
    return _.isFinite(num) || num === Infinity || num === -Infinity ? num : fallback;
}

/**
 * @param bounds the projection bounds: [[x0, y0], [x1, y1]]
 * @param view the view bounds {width:, height:}
 * @returns {Object} the projection bounds clamped to the specified view.
 */
function clampedBounds(bounds, view) {
    var upperLeft = bounds[0];
    var lowerRight = bounds[1];
    var x = Math.max(Math.floor(ensureNumber(upperLeft[0], 0)), 0);
    var y = Math.max(Math.floor(ensureNumber(upperLeft[1], 0)), 0);
    var xMax = Math.min(Math.ceil(ensureNumber(lowerRight[0], view.width)), view.width - 1);
    var yMax = Math.min(Math.ceil(ensureNumber(lowerRight[1], view.height)), view.height - 1);
    return {x: x, y: y, xMax: xMax, yMax: yMax, width: xMax - x + 1, height: yMax - y + 1};
}

function asColorStyle(r, g, b, a) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}

/**
 * @returns {Array} of wind colors and a method, indexFor, that maps wind magnitude to an index on the color scale.
 */
function windIntensityColorScale(step, maxWind) {
    var result = [];
    for (var j = 85; j <= 255; j += step) {
        result.push(asColorStyle(j, j, j, 1.0));
    }
    result.indexFor = function(m) {  // map wind speed to a style
        return Math.floor(Math.min(m, maxWind) / maxWind * (result.length - 1));
    };
    return result;
}


/**
 * Produces a color style in a rainbow-like trefoil color space. Not quite HSV, but produces a nice
 * spectrum. See http://krazydad.com/tutorials/makecolors.php.
 *
 * @param hue the hue rotation in the range [0, 1]
 * @param a the alpha value in the range [0, 255]
 * @returns {Array} [r, g, b, a]
 */
function sinebowColor(hue, a) {
    // Map hue [0, 1] to radians [0, 5/6τ]. Don't allow a full rotation because that keeps hue == 0 and
    // hue == 1 from mapping to the same color.
    var rad = hue * τ * 5/6;
    rad *= 0.75;  // increase frequency to 2/3 cycle per rad

    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var r = Math.floor(Math.max(0, -c) * 255);
    var g = Math.floor(Math.max(s, 0) * 255);
    var b = Math.floor(Math.max(c, 0, -s) * 255);
    return [r, g, b, a];
}

var BOUNDARY = 0.45;
var fadeToWhite = colorInterpolator(sinebowColor(1.0, 0), [255, 255, 255]);

/**
 * Interpolates a sinebow color where 0 <= i <= j, then fades to white where j < i <= 1.
 *
 * @param i number in the range [0, 1]
 * @param a alpha value in range [0, 255]
 * @returns {Array} [r, g, b, a]
 */
function extendedSinebowColor(i, a) {
    return i <= BOUNDARY ?
        sinebowColor(i / BOUNDARY, a) :
        fadeToWhite((i - BOUNDARY) / (1 - BOUNDARY), a);
}