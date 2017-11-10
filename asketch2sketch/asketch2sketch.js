import {fromSJSONDictionary} from 'sketchapp-json-plugin';
import {fixTextLayer, fixSharedTextStyle} from './helpers/fixFont';
import fixImageFill from './helpers/fixImageFill';

function removeExistingLayers(context) {
  if (context.containsLayers()) {
    const loop = context.children().objectEnumerator();
    let currLayer = loop.nextObject();

    while (currLayer) {
      if (currLayer !== context) {
        currLayer.removeFromParent();
      }
      currLayer = loop.nextObject();
    }
  }
}

function fixLayer(layer) {
  if (layer.isSVG) {
    return;
  }
  if (layer['_class'] === 'text') {
    fixTextLayer(layer);
  } else {
    fixImageFill(layer);
  }

  if (layer.layers) {
    layer.layers.forEach(fixLayer);
  }
}

function removeSharedTextStyles(document) {
  document
    .documentData()
    .layerTextStyles()
    .setObjects([]);
}

function addSharedTextStyle(document, style) {
  const textStyles = document.documentData().layerTextStyles();

  textStyles.addSharedStyleWithName_firstInstance(style.name, fromSJSONDictionary(style.value));
}

function removeSharedColors(document) {
  const assets = document.documentData().assets();

  assets.removeAllColors();
}

function addSharedColor(document, colorJSON) {
  const assets = document.documentData().assets();
  const color = fromSJSONDictionary(colorJSON);

  assets.addColor(color);
}

function getLayerFromSVGString(rawSVGString) {
  const svgString = NSString.stringWithString(rawSVGString);
  // eslint-disable-next-line no-undef
  const svgData = svgString.dataUsingEncoding(NSUTF8StringEncoding);
  // eslint-disable-next-line no-undef
  const svgImporter = MSSVGImporter.svgImporter();

  svgImporter.prepareToImportFromData(svgData);
  const svgLayer = svgImporter.importAsLayer();

  return svgLayer;
}

// eslint-disable-next-line
export default function(context) {
  const document = context.document;
  const page = document.currentPage();

  let asketchDocument = null;
  let asketchPage = null;

  const panel = NSOpenPanel.openPanel();

  panel.setCanChooseDirectories(false);
  panel.setCanChooseFiles(true);
  panel.setAllowsMultipleSelection(true);
  panel.setTitle('Choose a asketch.json files');
  panel.setPrompt('Choose');
  panel.setAllowedFileTypes(['json']);

  if (panel.runModal() !== NSModalResponseOK || panel.URLs().length === 0) {
    return;
  }

  const urls = panel.URLs();

  urls.forEach(url => {
    const data = NSData.dataWithContentsOfURL(url);
    const content = NSString.alloc().initWithData_encoding_(data, NSUTF8StringEncoding);

    let asketchFile = null;

    try {
      asketchFile = JSON.parse(content);
    } catch (e) {
      const alert = NSAlert.alloc().init();

      alert.setMessageText('File is not a valid JSON.');
      alert.runModal();
    }

    if (asketchFile && asketchFile._class === 'document') {
      asketchDocument = asketchFile;
    } else if (asketchFile && asketchFile._class === 'page') {
      asketchPage = asketchFile;
    }
  });

  if (asketchDocument) {
    removeSharedColors(document);
    removeSharedTextStyles(document);

    if (asketchDocument.assets.colors) {
      asketchDocument.assets.colors.forEach(color => addSharedColor(document, color));

      console.log('Shared colors added: ' + asketchDocument.assets.colors.length);
    }

    if (asketchDocument.layerTextStyles && asketchDocument.layerTextStyles.objects) {
      asketchDocument.layerTextStyles.objects.forEach(style => {
        fixSharedTextStyle(style);
        addSharedTextStyle(document, style);
      });

      console.log('Shared text styles added: ' + asketchDocument.layerTextStyles.objects.length);
    }
  }

  if (asketchPage) {
    removeExistingLayers(page);

    page.name = asketchPage.name;

    asketchPage.layers.forEach(layer => {
      // Deal with the raw SVG string
      // https://github.com/brainly/html-sketchapp/issues/4
      let svgData;

      if (layer.layers && layer.layers[0] && layer.layers[0].isSVG) {
        svgData = layer.layers[0];
        layer.layers = [];
      }

      if (svgData) {
        try {
          const svgLayer = getLayerFromSVGString(svgData.rawSVGString);

          svgLayer.frame().setX(svgData.x || layer.frame.x);
          svgLayer.frame().setY(svgData.y || layer.frame.y);
          svgLayer.frame().setHeight(svgData.height || layer.frame.height);
          svgLayer.frame().setWidth(svgData.width || layer.frame.width);
          page.addLayer(svgLayer);
        } catch (e) {
          const alert = NSAlert.alloc().init();

          alert.setMessageText('SVG is invalid.');
          alert.runModal();
        }
      } else {
        try {
          fixLayer(layer);
          page.addLayer(fromSJSONDictionary(layer));
        } catch (e) {
          // const alert = NSAlert.alloc().init();
          //
          // alert.setMessageText('JSON is invalid.');
          // alert.runModal();
        }
      }
    });

    console.log('Layers added: ' + asketchPage.layers.length);
  }
}
