    var point = [];

    var WindField = function (obj) {
        this.west = null;
        this.east = null;
        this.south = null;
        this.north = null;
        this.rows = null;
        this.cols = null;
        this.dx = null;
        this.dy = null;
        this.unit = null;
        this.date = null;

        this.grid = null;
        this._init(obj);
    };

    WindField.prototype = {
        constructor: WindField,
        _init: function (obj) {
            var header = obj.header,
                uComponent = obj['uComponent'],
                vComponent = obj['vComponent'];

            this.west = +header['lo1'];
            this.east = +header['lo2'];
            this.south = +header['la2'];
            this.north = +header['la1'];
            this.rows = +header['ny'];
            this.cols = +header['nx'];
            this.dx = +header['dx'];
            this.dy = +header['dy'];
            this.unit = header['parameterUnit'];
            this.date = header['refTime'];

            this.cloumnMin = 0;
            this.cloumnMax = 0;
            this.rowMin = 0;
            this.rowMax = 0;
            this.grid = [];
            this.columns = [];
            this.extent = null;
            var k = 0,
                rows = null,
                uv = null;
            for (var j = 0; j < this.rows; j++) {
                rows = [];
                for (var i = 0; i < this.cols; i++, k++) {
                    uv = this.calcUV(uComponent[k], vComponent[k]);
                    rows.push(uv);
                }
                this.grid.push(rows);
            }
        },
        calcUV: function (u, v) {
            return [+u, +v, Math.sqrt(u * u + v * v)];
        },


        bilinearInterpolateVector : function(x, y, g00, g10, g01, g11) {
            var rx = (1 - x);
            var ry = (1 - y);
            var a = rx * ry,  b = x * ry,  c = rx * y,  d = x * y;
            var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
            var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
            return [u, v, Math.sqrt(u * u + v * v)];
        },

        interpolate: function(λ, φ) {
            var i = µ.floorMod(λ - this.west, 360) / this.dx;  // calculate longitude index in wrapped range [0, 360)
            var j = (this.north - φ) / this.dy;                 // calculate latitude index in direction +90 to -90

            //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
            //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
            //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
            //      ---G--|---G--- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
            //    j ___|_ .   |           (1, 9) and (2, 9).
            //  =8.3   |      |
            //      ---G------G--- cj 9   Note that for wrapped grids, the first column is duplicated as the last
            //         |      |           column, so the index ci can be used without taking a modulo.

            var fi = Math.floor(i), ci = fi + 1;
            var fj = Math.floor(j), cj = fj + 1;

            var row;
            if ((row = this.grid[fj])) {
                var g00 = row[fi];
                var g10 = row[ci];
                if (µ.isValue(g00) && µ.isValue(g10) && (row = this.grid[cj])) {
                    var g01 = row[fi];
                    var g11 = row[ci];
                    if (µ.isValue(g01) && µ.isValue(g11)) {
                        // All four points found, so interpolate the value.
                        return this.bilinearInterpolateVector(i - fi, j - fj, g00, g10, g01, g11);
                    }
                }
            }
            // console.log("cannot interpolate: " + λ + "," + φ + ": " + fi + " " + ci + " " + fj + " " + cj);
            return null;
        },

        distort: function (projection, λ, φ, x, y, scale, wind) {
            var u = wind[0] * scale;
            var v = wind[1] * scale;
            // var d = µ.distortion(projection, λ, φ, x, y);
            var d= [0.2697523332221087, -0, 0.38301513348591876, -3.8055672872714137];
            // Scale distortion vectors by u and v, then add.
            wind[0] = d[0] * u + d[2] * v;
            wind[1] = d[1] * u + d[3] * v;
            return wind;
        },

        interpolateColumn: function(x, mask) {
            var column = [];
            var velocityScale = pixelboundx.height * 1/ 6000;
            for (var y = pixelboundx.y; y <= pixelboundx.yMax; y += 2) {

                point[0] = x; point[1] = y;
                var coord = this.projectionpixelToLonlat(point);
                var color = TRANSPARENT_BLACK;
                var wind = null;
                if (coord) {
                    var λ = coord[0], φ = coord[1];
                    if (isFinite(λ)) {
                        wind = this.interpolate(λ, φ);
                        var scalar = null;
                        if (wind) {
                            var projection = [-0.03921065394444267, 2.9619717605938263, 0.6173005920749751, -4.599962060246475];
                            // wind = this.distort(projection, λ, φ, x, y, velocityScale, wind);
                            scalar = wind[2];
                        }

                        if (µ.isValue(scalar)) {
                            color = windy.scale.gradient(scalar, OVERLAY_ALPHA);
                        }
                    }
                }
                column[y+1] = column[y] = wind || HOLE_VECTOR;
                mask.set(x, y, color).set(x+1, y, color).set(x, y+1, color).set(x+1, y+1, color);

            }
            this.columns[x+1] = this.columns[x] = column;
        },

        field: function (px, py) {
            var column = this.columns[Math.round(px)];
            return column && column[Math.round(py)] || NULL_WIND_VECTOR;
        },

        projectionpixelToLonlat: function (point) {
            //！像素位置，转换为经纬度位置pixelbounds与   this.windField.cloumnMin坐标转换
            //! 返回浮点数经纬度
            //! 0---height  0-width  转换为【minCol - maxCol】 [minheight-maxHeight]
            var tempLon = this.extent.southwest.lng + (point[0] - pixelboundx.x) * ( (this.extent.northeast.lng - this.extent.southwest.lng)/pixelboundx.width );
            var tempLat = this.extent.southwest.lat + (point[1] - pixelboundx.y) * ( (this.extent.northeast.lat - this.extent.southwest.lat)/pixelboundx.height );

            return [tempLon, tempLat];
        },
    };

