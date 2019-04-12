var Particle = function () {
    this.x = null;
    this.dx = null;
    this.dx = null;
    this.y = null;
    this.age = null;
    this.birthAge = null;
    this.path = null;
    this.sx = null;
    this.sy = null;
};

/*
 * 投影变换算法。用于地方坐标系
 */
function Point2D() {
    var x;
    var y;
}

function ProjectionTransfor(TuoqiuCanshu, CentralMeridian, OriginLatitude, EastOffset, NorthOffset) {
    /* '说明: 用于初始化转换参数
     'TuoqiuCanshu  枚举类型，提供北京54、西安80和WGS84三个椭球参数
     'CentralMeridian 中央经线
     OriginLatitude 原点纬度，如果是标准的分幅，则该参数是0
     'EastOffset东偏移
     NorthOffset 北偏移
     */
    ///'基本变量定义
    var a;//'椭球体长半轴
    var b;// '椭球体短半轴
    var f; //'扁率
    var e;// '第一偏心率
    var e1; //'第二偏心率
    var FE;//'东偏移
    var FN;//'北偏移
    var L0;//'中央经度
    var W0;//'原点纬线
    var k0;//'比例因子

    var PI = 3.14159265358979;
    /*
     *  Canshu
     *  Beijing54 = 0
     Xian80 = 1
     WGS84 = 2
     *
     */
    /*'Krassovsky （北京54采用） 6378245 6356863.0188
     'IAG 75（西安80采用） 6378140 6356755.2882
     'WGS 84 6378137 6356752.3142
     */
    if (TuoqiuCanshu == 0)//北京五四
    {
        a = 6378245.0;
        b = 6356863.0188;
    }
    else if (TuoqiuCanshu == 1)// '西安八零
    {
        a = 6378140.0;
        b = 6356755.2882;
    }
    if (TuoqiuCanshu == 2)//'WGS84
    {
        a = 6378137.0;
        b = 6356752.3142;
    }
    f = (a - b) / a;//扁率
    //e = Math.sqrt(1 - Math.pow((b / a) ,2));//'第一偏心率
    e = Math.sqrt(2 * f - Math.pow(f, 2));//'第一偏心率

    //eq = Math.sqrt(Math.pow((a / b) , 2) - 1);//'第二偏心率
    e1 = e / Math.sqrt(1 - Math.pow(e, 2));//'第二偏心率

    L0 = CentralMeridian;//中央经
    W0 = OriginLatitude;//原点纬线
    k0 = 1;//'比例因子
    FE = EastOffset;//东偏移
    FN = NorthOffset;//北偏移
    /*
     * 输入参数分别是：经度、纬度
     */
    this.BLtoXY = function (J, W) {
        //'给出经纬度坐标，转换为高克投影坐标
        var resultP = new Point2D();
        var BR = (W - W0) * PI / 180;//纬度弧长
        var lo = (J - L0) * PI / 180; //经差弧度

        var N = a / Math.sqrt(1 - Math.pow((e * Math.sin(BR)), 2)) //卯酉圈曲率半径
        //求解参数s
        var B0;
        var B2;
        var B4;
        var B6;
        var B8;
        var C = Math.pow(a, 2) / b;
        B0 = 1 - 3 * Math.pow(e1, 2) / 4 + 45 * Math.pow(e1, 4) / 64 - 175 * Math.pow(e1, 6) / 256 + 11025 * Math.pow(e1, 8) / 16384;
        B2 = B0 - 1
        B4 = 15 / 32 * Math.pow(e1, 4) - 175 / 384 * Math.pow(e1, 6) + 3675 / 8192 * Math.pow(e1, 8);
        B6 = 0 - 35 / 96 * Math.pow(e1, 6) + 735 / 2048 * Math.pow(e1, 8);
        B8 = 315 / 1024 * Math.pow(e1, 8);
        s = C * (B0 * BR + Math.sin(BR) * (B2 * Math.cos(BR) + B4 * Math.pow((Math.cos(BR)), 3) + B6 * Math.pow((Math.cos(BR)), 5) + B8 * Math.pow((Math.cos(BR)), 7)))

        var t = Math.tan(BR);
        var g = e1 * Math.cos(BR);

        var XR = s + Math.pow(lo, 2) / 2 * N * Math.sin(BR) * Math.cos(BR) + Math.pow(lo, 4) * N * Math.sin(BR) * Math.pow((Math.cos(BR)), 3) / 24 * (5 - Math.pow(t, 2) + 9 * Math.pow(g, 2) + 4 * Math.pow(g, 4)) + Math.pow(lo, 6) * N * Math.sin(BR) * Math.pow((Math.cos(BR)), 5) * (61 - 58 * Math.pow(t, 2) + Math.pow(t, 4)) / 720;
        var YR = lo * N * Math.cos(BR) + Math.pow(lo, 3) * N / 6 * Math.pow((Math.cos(BR)), 3) * (1 - Math.pow(t, 2) + Math.pow(g, 2)) + Math.pow(lo, 5) * N / 120 * Math.pow((Math.cos(BR)), 5) * (5 - 18 * Math.pow(t, 2) + Math.pow(t, 4) + 14 * Math.pow(g, 2) - 58 * Math.pow(g, 2) * Math.pow(t, 2));
        resultP.x = YR + FE;
        resultP.y = XR + FN;
        return resultP;
    }
    /*
     * 输入参数分别为：X、Y
     */
    this.XYtoBL = function (X, Y) {
        //'给出高克投影坐标，转换为经纬度坐标
        var resultP = new Point2D();
        var El1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
        var Mf = (Y - FN) / k0;//真实坐标值

        var Q = Mf / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));//角度
        Bf = Q + (3 * El1 / 2 - 27 * Math.pow(El1, 3) / 32) * Math.sin(2 * Q) + (21 * Math.pow(El1, 2) / 16 - 55 * Math.pow(El1, 4) / 32) * Math.sin(4 * Q) + (151 * Math.pow(El1, 3) / 96) * Math.sin(6 * Q) + 1097 / 512 * Math.pow(El1, 4) * Math.sin(8 * Q);
        Rf = a * (1 - Math.pow(e, 2)) / Math.sqrt(Math.pow((1 - Math.pow((e * Math.sin(Bf)), 2)), 3));
        Nf = a / Math.sqrt(1 - Math.pow((e * Math.sin(Bf)), 2));//卯酉圈曲率半径
        Tf = Math.pow((Math.tan(Bf)), 2);
        D = (X - FE) / (k0 * Nf);

        Cf = Math.pow(e1, 2) * Math.pow((Math.cos(Bf)), 2);

        var B = Bf - Nf * Math.tan(Bf) / Rf * (Math.pow(D, 2) / 2 - (5 + 3 * Tf + 10 * Cf - 9 * Tf * Cf - 4 * Math.pow(Cf, 2) - 9 * Math.pow(e1, 2)) * Math.pow(D, 4) / 24 + (61 + 90 * Tf + 45 * Math.pow(Tf, 2) - 256 * Math.pow(e1, 2) - 3 * Math.pow(Cf, 2)) * Math.pow(D, 6) / 720);
        var L = CentralMeridian * PI / 180 + 1 / Math.cos(Bf) * (D - (1 + 2 * Tf + Cf) * Math.pow(D, 3) / 6 + (5 - 2 * Cf + 28 * Tf - 3 * Math.pow(Cf, 2) + 8 * Math.pow(e1, 2) + 24 * Math.pow(Tf, 2)) * Math.pow(D, 5) / 120);
        var Bangle = B * 180 / PI;
        var Langle = L * 180 / PI;


        resultP.x = Langle;//RW * 180 / PI;
        resultP.y = Bangle + W0;//RJ * 180 / PI;
        return resultP;
    }
};



