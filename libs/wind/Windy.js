
//define([ 'windy/Particle', 'windy/WindField'], function ( Particle, WindField) {
var _primitives = null;
var BRIGHTEN = 1.5;

//! 多久更新一次
var FRAME_RATE = 140;                      // desired milliseconds per frame
//! 速率 xt = x + SPEED_RATE * v
var SPEED_RATE = 1.0;

var MAX_PARTICLE_AGE = 8;               // max number of frames a particle is drawn before regeneration

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
    this.custom_polygonOutlineModel = null;
    this.scale = null;
    this._init();
};
Windy.prototype = {
    constructor: Windy,
    _init: function () {
        // 创建风场网格
        this.windField = this.createField();

        this.scale = {
                bounds: [0, 100],
                gradient: function (v, a) {
                    return extendedSinebowColor(Math.min(v, 100) / 100, a);
                }
        }
    },
    createField: function () {
        var data = this._parseWindJson();
        return new WindField(data);
    },

    createMask : function () {

        var width = 500, height = 500;

        var ramp = document.createElement('canvas');
        ramp.width = width;
        ramp.height = height;
        var context = ramp.getContext('2d');


        context.fillStyle = "rgba(255, 0, 0, 1)";
        context.fill();

        var imageData = context.getImageData(0, 0, width, height);
        var data = imageData.data;  // layout: [r, g, b, a, r, g, b, a, ...]
        return ramp;
        // return {
        //     imageData: imageData,
        //     isVisible: function(x, y) {
        //         var i = (y * width + x) * 4;
        //         return data[i + 3] > 0;  // non-zero alpha means pixel is visible
        //     },
        //     // set: function(x, y, rgba) {
        //     //     var i = (y * width + x) * 4;
        //     //     data[i    ] = rgba[0];
        //     //     data[i + 1] = rgba[1];
        //     //     data[i + 2] = rgba[2];
        //     //     data[i + 3] = rgba[3];
        //     //     return this;
        //     // }
        //     set: function(x, y, rgba) {
        //         var i = (y * width + x) * 4;
        //         data[i    ] = 0;
        //         data[i + 1] = 0;
        //         data[i + 2] = 0;
        //         data[i + 3] = 0;
        //         return this;
        //     }
        // };
    },

    drawBoundsWithMask: function(extent, mask)
    {
        if(this.custom_polygonOutlineModel)
        {
            this.cesiumViewer.scene.primitives.remove(this.custom_polygonOutlineModel);
        }

        this.custom_polygonOutlineModel = this.cesiumViewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances : new Cesium.GeometryInstance({
                geometry : new Cesium.RectangleGeometry({
                    rectangle : Cesium.Rectangle.fromDegrees(extent.southwest.lng, extent.southwest.lat, extent.northeast.lng, extent.northeast.lat),
                    vertexFormat : Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
                })
            }),
            appearance : new Cesium.EllipsoidSurfaceAppearance({
                aboveGround : false
            })
        }));

        this.custom_polygonOutlineModel.appearance.material = new Cesium.Material({
            fabric : {
                type : 'Image',
                uniforms : {
                    // image : '../../resources/images/2.png'
                    image: mask
                }
            }
        });

        var bb= Cesium.Rectangle.fromDegrees(extent.southwest.lng, extent.southwest.lat, extent.northeast.lng, extent.northeast.lat);
        var aa = this.cesiumViewer.camera.viewMatrix;
    },

    getbounds: function()
    {
        // 创建风场粒子根据当前视野大小
        var rectangle = this.cesiumViewer.camera.computeViewRectangle();
        // 弧度转为经纬度，west为左（西）侧边界的经度，以下类推
        //! 经度范围转为0-360
        var west =rectangle.west / Math.PI * 180 + 180;
        var north = rectangle.north / Math.PI * 180;
        var east = rectangle.east / Math.PI * 180 + 180;
        var south = rectangle.south / Math.PI * 180 ;

        //！ 初始化可视区域
        // 110.35320584700008,31.38437711000006,116.64388570600008,36.36653865000006
        var west = 73.35320584700008;
        var north = 53.36653865000006;
        var east = 135.64388570600008;
        var south = 3.38437711000006;

        field = this.windField;
        var dx = field.dx;
        var dy = field.dy;
        var stwest = field.west;
        var stsouth = field.south;
        this.windField.cloumnMin = Math.floor((west-stwest) / dx);
        this.windField.cloumnMax = Math.floor((east-stwest) / dx);;
        this.windField.rowMin = Math.floor((south-stsouth) / dy);;
        this.windField.rowMax = Math.floor((north-stsouth) / dy);;

        // this.windField.cloumnMin = 200;
        // this.windField.cloumnMax = 400;;
        // this.windField.rowMin = 100;;
        // this.windField.rowMax = 300;
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

            if (particle.age >= 0) {
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

    setMaskValue: function(x, y,width, imageData, rgba) {
        var i = (y * width + x) * 4;
        imageData[i    ] = rgba[0];
        imageData[i + 1] = rgba[1];
        imageData[i + 2] = rgba[2];
        imageData[i + 3] = rgba[3];
    },

    //！ 传入经纬度矩形边界，生成风场数据中的行列坐标，取出值，更新颜色，写道canvas 的image中
    createBoundMask :function(bounds) {
        var bdWidth = Math.floor( (this.windField.cloumnMax - this.windField.cloumnMin) / this.windField.dx ) ;
        var bdHeight = Math.floor( (this.windField.rowMax - this.windField.rowMin) / this.windField.dy );

        var canvas = document.createElement('canvas');
        canvas.width = bdWidth;
        canvas.height = bdHeight;
        var context = canvas.getContext('2d');

        var c = context.getImageData(0, 0, canvas.width, canvas.height);
        for(var row = 0; row < c.height; ++row){
            for(var col = 0; col < c.width; ++col){

                //! 根据当前行列号，转换为在wind grid中的行列号，取出数值
                var rgba = [255,0,0,150];
                var uv = this.windField.getIn(col, row);
                var scalar = uv[2];
                var color = this.scale.gradient(scalar, OVERLAY_ALPHA);
                 //！ 取出当前边界范围，对应的行列号从风场中取出观测值，转换为rgba值，
                 this.setMaskValue(col, row, c.width, c.data, color);
            }
        }

        context.putImageData(c,0,0,10,10,canvas.width, canvas.height);

        return canvas.toDataURL();
    },

    animate: function (globe, field, grids) {
        //if (!globe || !field || !grids) return;
        _primitives.removeAll();
        this.particles = [];

        //! 更新边界
        var bounds = this.getbounds();

        //! 更新底图
        //updateMaterial(viewer);
        var bMask = this.createBoundMask(bounds);


        //! 绘制带底图的边界
        this.drawBoundsWithMask(bounds, bMask);


        //！ 生成粒子绘制风场
        var width = bounds.northeast.lng - bounds.southwest.lng;

        //! 计算当前范围内的粒子个数
        var particleCount = Math.round(width * PARTICLE_MULTIPLIER);
         particleCount = 1000
         console.log(particleCount);

        //! 初始化粒子数据
        for (var i = 0; i < particleCount; i++) {
            this.particles.push(this.randomParticle(new Particle()));
        }

        var self = this,
            field = self.windField,
            particles = self.particles;

        //！ 更新位置
        this.cesiumViewer.camera.setView({
            destination : Cesium.Rectangle.fromDegrees(bounds.southwest.lng, bounds.southwest.lat, bounds.northeast.lng, bounds.northeast.lat)
        });

        (function frame() {

            //windy.evolveDraw();
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
            south = field.south,
            newArr = [];
        for (var i = 0; i <= length - 2; i += 2) {
            newArr.push(
                west + arr[i] * dx,
                south + arr[i + 1] * dy
            )
        }
        return newArr;
    },
    _createLineInstance: function (positions, ageRate) {
        var colors = [],
            length = positions.length,
            count = length / 2;
        for (var i = 0; i < length; i++) {
            //colors.push(Cesium.Color.WHITE.withAlpha(i / count * ageRate * BRIGHTEN));
            colors.push(Cesium.Color.WHITE);
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

        //! xy根据当前视野所属的bound行列号创建
        do {

            x = Math.floor(Math.random() * (this.windField.cloumnMax - this.windField.cloumnMin) + this.windField.cloumnMin );
            y = Math.floor(Math.random() * (this.windField.rowMax - this.windField.rowMin) + this.windField.rowMin);
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

