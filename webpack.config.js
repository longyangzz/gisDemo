var webpack=require('webpack');
var path = require('path')
function resolve (dir) {
    return path.join(__dirname, '..', dir)
}
module.exports = {
    entry: "./js/app.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        rules:  [
            {
                test: /\.css$/,
                use: "style-loader!css-loader"
            },
            {
                test: /\.js|jsx$/, use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins:[
        new webpack.BannerPlugin('菜鸟教程 webpack 实例')
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "/"),
        },
        // 启动gzip压缩使得 访问更快
        compress: true,
        // 配置启动服务器的端口号
        port: 3000,
        // 配置是否自动打开浏览器 false(否)
        open: false
    }
};