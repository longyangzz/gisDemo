# cesium渲染流程分析

## 一、主流程

三维引擎的设计，一般包括几个大的代码模块：

1. 核心库core：基本算法及接口，例如矩阵、矢量、坐标系

2. GUI组件库widget：基本的窗口相关的，例如viewer的div、进度条div、时间条div、帮助信息div等

3. 场景库scene：基本的图元库、树结构图元管理类。图元就是点、线、面等，就是包含了一系列顶点坐标及纹理坐标的类

4. 渲染库render：渲染库，封装webgl，通过GUI库的div获取canvas组件，封装为glcontext，封装帧状态、shade、program、vao、vbo等

5. 第三方依赖：依赖库

6. 资源文件：例如shaders、img等

7. 异步控制：workers

   其中主要的渲染流程，简单来说就是对我们组装好的图元类场景树进行webgl渲染，进而实现可视化。

   那么cesium是怎么通过new 一个viewer，这么简单的一行代码，我们就能在浏览器上看到一个三维球，及瓦片数据呢？

   当我们写下new viewer后，立马会根据我们传入的div，为该div 创建widget组件div，并在这个widget的div里继续创建canvas标签。有了这个标签，我们就能根据封装的context类，记录存储这个webgl上下文接口。然后在widget的构造中，继续根据这个canvas创建scene场景对象（scene中就是管理了三颗树this._globe、this._primitives、this._groundPrimitives），创建globle对象，管理地形和影像切片的类，创建datasource类，管理普通图元的，基础的图元管理类创建完毕后，useDefaultRenderLoop通过使用这个值，触发帧循环。

   startRenderLoop：

   ![image-20201214130510942](H:\3.open\5.openGis\gisDemo\screenshot\cesium\帧循环入口.png)

至此，则开启了无穷无尽的更新渲染循环。可见widget是我们的三维引擎的核心，用viewer包装了一层widget是为了在viewer上既在中心区域集成widget，又在header上集成工具按钮，又能在底部集成时间进度条。

我们的重点是分析widget是如何，让这个三维引擎保持循环及数据更新呢？

在事件循环中，周而复始的调用的是一个widget的render函数，这个函数会调用成员scene的render(time)函数，对time进行帧数计数处理后，调用render（scene）函数，开始对这个周而复始的过程中的数据进行更新和加载移除。如下图所示，是该函数做的所有工作：

![image-20201214142100928](H:\3.open\5.openGis\gisDemo\screenshot\cesium\scenerender.png)

矩形框中是关键的三行代码，堆栈如下图，会调用globe的四叉树类，获取需要渲染的tiles，如下图：

![image-20201214142918433](H:\3.open\5.openGis\gisDemo\screenshot\cesium\sceneupdate.png)

selectFilesForRendering为我们获取需要加载的tile，添加到渲染列表中:

![image-20201214143202814](H:\3.open\5.openGis\gisDemo\screenshot\cesium\selecttile.png)

添加到渲染列表后，会在后边的执行command中，创建vao、创建program，使用gl.context执行draw函数，将数据渲染到canvas上。至此数据渲染完成。

随着缩放层级的变化，endframe函数，如下图，帮我们判断需要加载的tile编号,准备数据，添加到队列中，在下一帧中判断是否要加载，重复上边的过程。

![image-20201214144003834](H:\3.open\5.openGis\gisDemo\screenshot\cesium\endframe.png)

## 二、细节流程