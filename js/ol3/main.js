import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import {Fill, Stroke, Style} from 'ol/style';

const style = new Style({
    fill: new Fill({
        color: '#eeeeee',
    }),
});

const vectorLayer = new VectorLayer({
    background: '#1a2b39',
    source: new VectorSource({
        url: 'http://192.168.1.231:8200/huaihe/test.json',
        format: new GeoJSON(),
    }),
    style: function (feature) {
        const color = feature.get('COLOR') || '#eeeeee';
        style.getFill().setColor(color);
        return style;
    },
});

const map = new Map({
    layers: [vectorLayer],
    target: 'map',
    view: new View({
        center: [0, 0],
        zoom: 1,
    }),
});

const featureOverlay = new VectorLayer({
    source: new VectorSource(),
    map: map,
    style: new Style({
        stroke: new Stroke({
            color: 'rgba(255, 255, 255, 0.7)',
            width: 2,
        }),
    }),
});

let highlight;
const displayFeatureInfo = function (pixel) {
    const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });

    const info = document.getElementById('info');
    if (feature) {
        info.innerHTML = feature.get('ECO_NAME') || '&nbsp;';
    } else {
        info.innerHTML = '&nbsp;';
    }

    if (feature !== highlight) {
        if (highlight) {
            featureOverlay.getSource().removeFeature(highlight);
        }
        if (feature) {
            featureOverlay.getSource().addFeature(feature);
        }
        highlight = feature;
    }
};

map.on('pointermove', function (evt) {
    if (evt.dragging) {
        return;
    }
    const pixel = map.getEventPixel(evt.originalEvent);
    displayFeatureInfo(pixel);
});

map.on('click', function (evt) {
    displayFeatureInfo(evt.pixel);
});
