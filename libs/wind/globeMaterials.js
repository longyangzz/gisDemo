function getElevationContourMaterial() {
    // Creates a composite material with both elevation shading and contour lines
    return new Cesium.Material({
        fabric: {
            type: 'ElevationColorContour',
            materials: {
                contourMaterial: {
                    type: 'ElevationContour'
                },
                elevationRampMaterial: {
                    type: 'ElevationRamp'
                }
            },
            components: {
                diffuse: 'contourMaterial.alpha == 0.0 ? elevationRampMaterial.diffuse : contourMaterial.diffuse',
                alpha: 'max(contourMaterial.alpha, elevationRampMaterial.alpha)'
            }
        },
        translucent: false
    });
}

function getSlopeContourMaterial() {
    // Creates a composite material with both slope shading and contour lines
    return new Cesium.Material({
        fabric: {
            type: 'SlopeColorContour',
            materials: {
                contourMaterial: {
                    type: 'ElevationContour'
                },
                slopeRampMaterial: {
                    type: 'SlopeRamp'
                }
            },
            components: {
                diffuse: 'contourMaterial.alpha == 0.0 ? slopeRampMaterial.diffuse : contourMaterial.diffuse',
                alpha: 'max(contourMaterial.alpha, slopeRampMaterial.alpha)'
            }
        },
        translucent: false
    });
}

function getAspectContourMaterial() {
    // Creates a composite material with both aspect shading and contour lines
    return new Cesium.Material({
        fabric: {
            type: 'AspectColorContour',
            materials: {
                contourMaterial: {
                    type: 'ElevationContour'
                },
                aspectRampMaterial: {
                    type: 'AspectRamp'
                }
            },
            components: {
                diffuse: 'contourMaterial.alpha == 0.0 ? aspectRampMaterial.diffuse : contourMaterial.diffuse',
                alpha: 'max(contourMaterial.alpha, aspectRampMaterial.alpha)'
            }
        },
        translucent: false
    });
}

var elevationRamp = [0.0, 0.045, 0.1, 0.15, 0.37, 0.54, 1.0];
var slopeRamp = [0.0, 0.29, 0.5, Math.sqrt(2)/2, 0.87, 0.91, 1.0];
var aspectRamp = [0.0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0];
function getColorRamp(selectedShading) {
    var ramp = document.createElement('canvas');
    ramp.width = 100;
    ramp.height = 1;
    var ctx = ramp.getContext('2d');

    var values;
    if (selectedShading === 'elevation') {
        values = elevationRamp;
    } else if (selectedShading === 'slope') {
        values = slopeRamp;
    } else if (selectedShading === 'aspect') {
        values = aspectRamp;
    }

    var grd = ctx.createLinearGradient(0, 0, 100, 0);
    grd.addColorStop(values[0], '#000000'); //black
    grd.addColorStop(values[1], '#2747E0'); //blue
    grd.addColorStop(values[2], '#D33B7D'); //pink
    grd.addColorStop(values[3], '#D33038'); //red
    grd.addColorStop(values[4], '#FF9742'); //orange
    grd.addColorStop(values[5], '#ffd700'); //yellow
    grd.addColorStop(values[6], '#ffffff'); //white

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 100, 1);

    return ramp;
}

function createMask(selectedShading) {
    var width = 100, height = 1;

    var ramp = document.createElement('canvas');
    ramp.width = width;
    ramp.height = height;
    var context = ramp.getContext('2d');


     context.fillStyle = "rgba(255, 0, 0, 1)";
    // context.fillRect(0, 0, width, height);

    var imageData = context.getImageData(0, 0, width, height);
    var data = imageData.data;  // layout: [r, g, b, a, r, g, b, a, ...]
    var c = imageData;
    for(var i = 0; i < c.height; ++i){
        for(var j = 0; j < c.width; ++j){
            var x = i*4*c.width + 4*j,
                r = c.data[x],
                g = c.data[x+1],
                b = c.data[x+2];
            c.data[x+3] = 150;
            //ͼƬ���ࣺ
            c.data[x] = 0;
            c.data[x+1] = 255-g;
            c.data[x+2] = 0;
        }
    }
    context.putImageData(imageData, 0,0,width, height ,width, height, );
    // context.fill();
    return ramp;
}

var minHeight = -414.0; // approximate dead sea elevation
var maxHeight = 8777.0; // approximate everest elevation
var contourColor = Cesium.Color.RED.clone();
var contourUniforms = {};
var shadingUniforms = {};

// The viewModel tracks the state of our mini application.
var viewModel = {
    enableContour: false,
    contourSpacing: 150.0,
    contourWidth: 2.0,
    selectedShading: 'elevation',
    changeColor: function() {
        contourUniforms.color = Cesium.Color.fromRandom({alpha: 1.0}, contourColor);
    }
};

// Convert the viewModel members into knockout observables.
Cesium.knockout.track(viewModel);

function updateMaterial(viewer) {
    var hasContour = viewModel.enableContour;
    var selectedShading = viewModel.selectedShading;
    var globe = viewer.scene.globe;
    var material;
    if (hasContour) {
        if (selectedShading === 'elevation') {
            material = getElevationContourMaterial();
            shadingUniforms = material.materials.elevationRampMaterial.uniforms;
            shadingUniforms.minHeight = minHeight;
            shadingUniforms.maxHeight = maxHeight;
            contourUniforms = material.materials.contourMaterial.uniforms;
        } else if (selectedShading === 'slope') {
            material = getSlopeContourMaterial();
            shadingUniforms = material.materials.slopeRampMaterial.uniforms;
            contourUniforms = material.materials.contourMaterial.uniforms;
        } else if (selectedShading === 'aspect') {
            material = getAspectContourMaterial();
            shadingUniforms = material.materials.aspectRampMaterial.uniforms;
            contourUniforms = material.materials.contourMaterial.uniforms;
        } else {
            material = Cesium.Material.fromType('ElevationContour');
            contourUniforms = material.uniforms;
        }
        contourUniforms.width = viewModel.contourWidth;
        contourUniforms.spacing = viewModel.contourSpacing;
        contourUniforms.color = contourColor;
    } else if (selectedShading === 'elevation') {
        material = Cesium.Material.fromType('Image');
        shadingUniforms = material.uniforms;
        //shadingUniforms.minHeight = minHeight;
        //shadingUniforms.maxHeight = maxHeight;
    } else if (selectedShading === 'slope') {
        material = Cesium.Material.fromType('SlopeRamp');
        shadingUniforms = material.uniforms;
    } else if (selectedShading === 'aspect') {
        material = Cesium.Material.fromType('AspectRamp');
        shadingUniforms = material.uniforms;
    }
    if (selectedShading !== 'none') {
        shadingUniforms.image = getColorRamp(selectedShading);
    }

    globe.material = material;
}