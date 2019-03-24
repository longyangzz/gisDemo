
//define([ 'windy/Particle', 'windy/WindField'], function ( Particle, WindField) {
var _primitives = null;
var BRIGHTEN = 1.5;

//! 多久更新一次
var FRAME_RATE = 140;                      // desired milliseconds per frame
//! 速率 xt = x + SPEED_RATE * v
var SPEED_RATE = 1.0;

var MAX_PARTICLE_AGE = 20;               // max number of frames a particle is drawn before regeneration

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var MAX_TASK_TIME = 100;                  // amount of time before a task yields control (millis)
var MIN_SLEEP_TIME = 25;                  // amount of time a task waits before resuming (millis)
var MIN_MOVE = 4;                         // slack before a drag operation beings (pixels)
var MOVE_END_WAIT = 1000;                 // time to wait for a move operation to be considered done (millis)

var OVERLAY_ALPHA = Math.floor(0.4*255);  // overlay transparency (on scale [0, 255])
var INTENSITY_SCALE_STEP = 10;            // step size of particle intensity color scale

var PARTICLE_LINE_WIDTH = 1.0;            // line width of a drawn particle
var PARTICLE_MULTIPLIER = 7;              // particle count scalar (completely arbitrary--this values looks nice)
var PARTICLE_REDUCTION = 0.75;            // reduce particle count to this much of normal for mobile devices
var FRAME_RATE = 40;                      // desired milliseconds per frame

var NULL_WIND_VECTOR = [NaN, NaN, null];  // singleton for undefined location outside the vector field [u, v, mag]
var HOLE_VECTOR = [NaN, NaN, null];       // singleton that signifies a hole in the vector field
var TRANSPARENT_BLACK = [0, 0, 0, 0];     // singleton 0 rgba
var REMAINING = "▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫";   // glyphs for remaining progress bar
var COMPLETED = "▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪";   // glyphs for completed progress bar

var Windy = function (json, cesiumViewer) {
    this.windData = json;
    this.windField = null;
    this.particles = [];
    this.lines = null;
    _primitives = cesiumViewer.scene.primitives;
    this.cesiumViewer = cesiumViewer;
    this._init();
};
Windy.prototype = {
    constructor: Windy,
    _init: function () {
        // 创建风场网格
        this.windField = this.createField();
        // 创建风场粒子
        // for (var i = 0; i < PARTICLES_NUMBER; i++) {
        //     this.particles.push(this.randomParticle(new Particle()));
        // }
    },
    createField: function () {
        var data = this._parseWindJson();
        return new WindField(data);
    },

    getbounds: function()
    {
        // 创建风场粒子根据当前视野大小
        var rectangle = this.cesiumViewer.camera.computeViewRectangle();
        // 弧度转为经纬度，west为左（西）侧边界的经度，以下类推
        var west =rectangle.west / Math.PI * 180;
        var north = rectangle.north / Math.PI * 180;
        var east = rectangle.east / Math.PI * 180;
        var south = rectangle.south / Math.PI * 180;
        // 鉴于高德、leaflet获取的边界都是southwest和northeast字段来表示，本例保持一致性
        var extent = {
            southwest: {
                lng: west,
                lat: south
            },
            northeast: {
                lng: east,
                lat: north
            }
        }




        // var mapArea = (extent.south - extent.north) * (extent.west - extent.east);
        // var particleCount = Math.round(bounds.width * bounds.height * PARTICLE_MULTIPLIER * Math.pow(mapArea, 0.24));

        return extent;
    },


    evolveDraw: function()
    {
        //this.removeLines();
        var self = this;
        var instances = [],
            nextX = null,
            nextY = null,
            xy = null,
            uv = null;
        this.particles.forEach(function (particle) {

            var field = self.windField;
            if (particle.age >= MAX_PARTICLE_AGE) {
                self.randomParticle(particle);
            }

            if (particle.age > 0) {
                var x = particle.x,
                    y = particle.y;
                if (!field.isInBound(x, y)) {
                    particle.age = MAX_PARTICLE_AGE;
                } else {
                    var path = [];
                    // path.push(x, y);
                    uv = field.getIn(x, y);
                    nextX = x +  SPEED_RATE * uv[0];
                    nextY = y +  SPEED_RATE * uv[1];
                    particle.path.push(nextX, nextY);
                    // path.push(nextX, nextY);
                    particle.x = nextX;
                    particle.y = nextY;
                    instances.push(self._createLineInstance(self._map(particle.path), particle.age / particle.birthAge));
                    // instances.push(self._createLineInstance(path, particle.age / particle.birthAge));
                    particle.age++;
                }
            }
        });
        if (instances.length <= 0) this.removeLines();
        self._drawLines(instances);
    },

    animate: function (globe, field, grids) {
        //if (!globe || !field || !grids) return;
        _primitives.removeAll();
        this.particles = [];
        //! 更新边界
        var bounds = this.getbounds();
        var width = bounds.northeast.lng - bounds.southwest.lng;

        //! 计算当前范围内的粒子个数
        var particleCount = Math.round(width * PARTICLE_MULTIPLIER);
        particleCount = 4000
        // console.log(particleCount);

        //! 初始化粒子数据
        for (var i = 0; i < particleCount; i++) {
            this.particles.push(this.randomParticle(new Particle()));
        }

        var self = this,
            field = self.windField,
            particles = self.particles;

        //！ 更新粒子数据渲染绘制
        //this.evolveDraw();

        (function frame() {

            windy.evolveDraw();
            setTimeout(frame, FRAME_RATE);

        })();
    },
    _parseWindJson: function () {
        var uComponent = null,
            vComponent = null,
            header = null;
        this.windData.forEach(function (record) {
            var type = record.header.parameterCategory + "," + record.header.parameterNumber;
            switch (type) {
                case "2,2":
                    uComponent = record['data'];
                    header = record['header'];
                    break;
                case "2,3":
                    vComponent = record['data'];
                    break;
                default:
                    break;
            }
        });
        return {
            header: header,
            uComponent: uComponent,
            vComponent: vComponent
        };
    },
    removeLines: function () {
        if (this.lines) {
            _primitives.remove(this.lines);
            this.lines.destroy();
        }
    },
    //求路径上点
    _map: function (arr) {
        var length = arr.length,
            field = this.windField,
            dx = field.dx,
            dy = field.dy,
            west = field.west,
            south = field.north,
            newArr = [];
        for (var i = 0; i <= length - 2; i += 2) {
            newArr.push(
                west + arr[i] * dx,
                south - arr[i + 1] * dy
            )
        }
        return newArr;
    },
    _createLineInstance: function (positions, ageRate) {
        var colors = [],
            length = positions.length,
            count = length / 2;
        for (var i = 0; i < length; i++) {
            colors.push(Cesium.Color.WHITE.withAlpha(i / count * ageRate * BRIGHTEN));
        }
        return new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
                positions: Cesium.Cartesian3.fromDegreesArray(positions),
                colors: colors,
                width: 1.5,
                colorsPerVertex: true
            })
        });
    },
    _drawLines: function (lineInstances) {
        this.removeLines();
        var linePrimitive = new Cesium.Primitive({
            appearance: new Cesium.PolylineColorAppearance({
                translucent: true
            }),
            geometryInstances: lineInstances,
            asynchronous: false
        });
        this.lines = _primitives.add(linePrimitive);
    },
    randomParticle: function (particle) {
        var safe = 30,x, y;

        do {
            x = Math.floor(Math.random() * (this.windField.cols - 2));
            y = Math.floor(Math.random() * (this.windField.rows - 2));
        } while (this.windField.getIn(x, y)[2] <= 0 && safe++ < 30);

        particle.x = x;
        particle.y = y;
        particle.age = Math.round(Math.random() * MAX_PARTICLE_AGE);//每一次生成都不一样
        particle.birthAge = particle.age;
        particle.path = [x, y];
        return particle;
    }
};

//return Windy;
//})

