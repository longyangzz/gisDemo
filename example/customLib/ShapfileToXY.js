var Cesium;

var outname = "defaultName";

 ShapfileToXY.prototype.methodSelectAndExport = function() {
     outname = this._name.split(".")[0];
     //整个表格拷贝到EXCEL中
    //!测试数据
     var test = [{one:'一行一列',two:'一行二列'},{one:'二行一列',two:'二行二列'}];

     //! excel导出选项配置
     var optionfileName = outname;   //! 输出文件名
     var optionsheetFilter = ['one','two'];  //! 导出的数据列编号
     var optionsheetHeader = ['RVCD','xy'];   //! 与数据列对应的在excel中显示的表头名称,同时RVCD必须是json数据中的字段名称


    //!生成sheetdata,对应导出的excel中sheet表
    var sheetData = [];

    //!添加纪录
    var len = this._data.features.length;
     for(var i = 0; i != len; ++i){
         //！ json中获取当前元素集
         var curFeatures = this._data.features[i];

         //! 定义当前excel中将要添加的一条记录
         var curRecordforExcel = {};

         //!1、 第一列存储行政区划
         curRecordforExcel[optionsheetFilter[0] ] = curFeatures.properties[optionsheetHeader[0]];

         //!2、 处理第二列xy数据，生成指定格式字符串
         var xyLenth = curFeatures.geometry.coordinates.length;
         var xyValue = "[";
         for(var j = 0; j != xyLenth; ++j){
            //!逐条追加
             var temp = "[" + curFeatures.geometry.coordinates[j][0] + "," + curFeatures.geometry.coordinates[j][1] + "]"
            if(j != xyLenth-1){
                temp += ",";
            }
             xyValue += temp;
         }
         xyValue += "]"
         curRecordforExcel[optionsheetFilter[1] ] = xyValue;
         sheetData.push(curRecordforExcel);
     }

     var option={};
     option.fileName = optionfileName;
     option.datas=[
        {
            sheetData:sheetData,
            sheetName:'sheet',
            sheetFilter:optionsheetFilter,
            sheetHeader:optionsheetHeader,

        }
    ];
    var toExcel=new ExportJsonExcel(option);
    toExcel.saveExcel();
}

function startup(cesium) {
    'use strict';

    Cesium = cesium;

    //! 初始化加载数据
    var dataSource = new ShapfileToXY();

    //!2、 后续接口，从url中读取json时间序列数据。
    //!2.1 测试成功subspace案例数据
    //-75.62898254394531, 40.02804946899414, 1.0 * i
    var url = '../../dclw/data/hainan/santan.json';

    dataSource.loadUrl(url);
}

function ShapfileToXY(name) {
    //All public configuration is defined as ES5 properties
    //These are just the "private" variables and their defaults.
    this._name = name;
}

Object.defineProperties(ShapfileToXY.prototype, {
    //The below properties must be implemented by all DataSource instances

    /**
     * Gets a human-readable name for this instance.
     * @memberof ShapfileToXY.prototype
     * @type {String}
     */
    name : {
        get : function() {
            return this._name;
        }
    }
});

/**
 * 异步加载.
 * @param {Object} url 文件链接
 * @returns {Promise} a promise that will resolve when the GeoJSON is loaded.
 */
ShapfileToXY.prototype.loadUrl = function(url) {

    //Create a name based on the url
    var name = Cesium.getFilenameFromUri(url);

    //Set the name if it is different than the current name.
    if (this._name !== name) {
        this._name = name;
    }

    //Use 'when' to load the URL into a json object
    //and then process is with the `load` function.
    var that = this;
    return Cesium.when(Cesium.loadJson(url), function(json) {
        return that.load(json, url);
    }).otherwise(function(error) {

    });
};

//! 该函数主要用来初始化数据，时间节点序列数据
ShapfileToXY.prototype.load = function(data) {
    this._data = data;

    //! 加载成功后导出
    this.methodSelectAndExport();
};
