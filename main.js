var file; //uploaded .gpx file
var myp5;
let formSubmitted = false; // Global variable

function saveDivAsImage(divId, filename) {
  const divElement = document.getElementById(divId);
  html2canvas(divElement).then((canvas) => {
      // Create an image
      const image = canvas.toDataURL("image/jpeg");

      // Create a link to download the image
      const link = document.createElement('a');
      link.href = image;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  });
}

const merinoColors = [
  '#1b8d5e',  '#c0d675', '#9ec2da', '#393389', '#8f65a8', '#722066',  '#f7c0bf',  '#ec633a',
  // '#',  '#', '#',  '#', '#',  '#',  '#',  '#',
];

const cottonColors = [
  '#56c787',  '#ffea40', '#6e8da9',  '#216bb0', '#a785bb',  '#b8b0d7',  '#f0e0e8',  '#d68ba0',
  // '#0a6e6b',  '#f0f0f0'
  // '#',  '#', '#',  '#', '#',  '#',  '#',  '#',
];

function initializeColorPickerWithPalette(colors) {
  Coloris({
    alpha: false,
    swatchesOnly: true,
    swatches: colors,
    theme: 'polaroid',
    themeMode: 'light',
  });
}

$(document).ready(function() {

  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('#color1Picker').prop('readonly', true);
        $('#color2Picker').prop('readonly', true);
    }

  $("#FAQ").click(function(event){
    $(".FAQ").toggle();
    event.stopPropagation();
  });
  $(document).click(function(event) {
    var $target = $(event.target);
    if(!$target.closest('.FAQ').length && $('.FAQ').is(":visible")) {
        $('.FAQ').hide();
    }
  });
  $('#exit_faq').click(function() {
      $('.FAQ').hide();
  });

  $('.circle').click(function() {
    $('#settings').toggleClass('visible');

    // Check if the #settings div is visible to determine the rotation of image
    if ($('#settings').hasClass('visible')) {
      $('#scroll').css('transform', 'rotate(0deg)'); // Rotate arrow image upwards
    } else {
      $('#scroll').css('transform', 'rotate(180deg)'); // Rotate arrow image to original position
    }
  });

  var generated = false;
  $('#dataInput').val('');
  $('.container').hide();
  $('#generate').prop('disabled', false);
  $('.fileMessages').hide();

  var fileLoaded = false; // Track if the file is loaded

  $('#dataInput').change(function() {
    var inputFile = this.files;
    var inputLabel = $('label[for="dataInput"]');

    if (inputFile.length > 0) {
      $('#noFileMessage').hide();
      fileLoaded = false;
      var reader = new FileReader();
      reader.onload = function(e) {
          fileLoaded = true;
      };
      reader.readAsDataURL(inputFile[0]);

      var fileName = inputFile[0].name;
      inputLabel.text(fileName);
    } else {
      inputLabel.text('Choose file');
      fileLoaded = false;
    }
  });

  $('#generate').click(function() {
    var inputFile = $('#dataInput')[0];
    if (!fileLoaded || inputFile.files.length === 0) {
      $('#noFileMessage').show();
      return;
    }
    $('#noFileMessage').hide();
    file = inputFile.files[0];
    if (!myp5) {
      myp5 = new p5(sketch);
    } else {
      myp5.loadFile(file);
    }
    $('.container').css('display', 'flex');
    $('#background').hide();
    $('.intro_container').hide();
    $('.nav').hide();
    generated = true;
  });

  initializeColorPickerWithPalette(cottonColors);

  document.querySelectorAll('input[name="materialType"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'merino') {
        initializeColorPickerWithPalette(merinoColors);
      } else if (this.value === 'cotton') {
        initializeColorPickerWithPalette(cottonColors);
      }
    });
  });

  $('input[name="materialType"]').change(function() {
    var selectedMaterialType = this.value;
    if (myp5 && myp5.setDefaultColors) {
      myp5.setDefaultColors(selectedMaterialType);
    }
  });

});

const sketch = function(p) {
  p.c;
  p.button;
  p.scaleFactor = 0.5;
  p.waypoints;
  p.gpsX = [];
  p.gpsY = [];
  p.minX;
  p.maxX;
  p.minY;
  p.maxY;
  p.colors = ['#f0f0f0','#0a6e6b'];
  p.size = 10;
  p.rows = 20;
  p.columns = 12;
  p.rWidth = p.columns*p.size;
  p.rHeight = p.rows*p.size;
  p.cells = new Array(p.rows * p.columns).fill(0);
  p.sliderLeft;
  p.sliderRight;
  p.sliderUp;
  p.sliderDown;
  p.RAPPORT = [0, 0, 0, 0];
  p.checkboxGroups;

  p.loadFile = function(file){
    let reader = new FileReader();
    reader.onload = function(event){
      let gpx = new DOMParser().parseFromString(event.target.result, 'text/xml');
      let converted = toGeoJSON.gpx(gpx);
      p.waypoints = [];
      converted.features.forEach(feature => {
        if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
          feature.geometry.coordinates.forEach(coord => {
            if (Array.isArray(coord) && Array.isArray(coord[0])) {
              p.waypoints = p.waypoints.concat(coord);
            } else if (Array.isArray(coord) && !Array.isArray(coord[0])) {
              p.waypoints.push(coord);
            }
          });
        }
      });
      if (p.waypoints.length === 0) {
        console.error("No waypoints found in file:", file.name);
      }
      p.setupSliders();
      p.getGPS();
      p.updateCells();
      p.updateColor();
    };
    reader.readAsText(file);
  }
  p.setup = function() {
    if (file) {
      p.loadFile(file);
    }

    p.c = p.createCanvas(p.rWidth * 2, p.rHeight * 2);
    p.c.parent("canvas-c");
    p.c.hide();
    p.createCHECK();
    p.attachCheckboxListeners();

    p.button = p.select('#b_save');
    p.button.mousePressed(p.saveJPG);

    p.select('#color1Picker').changed(p.updateColor);
    p.select('#color2Picker').changed(p.updateColor);


  };

  p.draw = function() {
    p.background(200);
    p.updateCells();
    for (let i = 0; i < 4; i++) {
        let x = (i % 2) * p.rWidth;
        let y = Math.floor(i / 2) * p.rHeight;
        p.renderCells(x, y, p.RAPPORT[i]);
    }
    p.setupPatternBackground("preview");

  };

  p.setDefaultColors = function(materialType) {
    let defaultColor1, defaultColor2;
    if (materialType === 'merino') {
      defaultColor1 = merinoColors[4];
      defaultColor2 = merinoColors[1];
    } else if (materialType === 'cotton') {
      defaultColor1 = cottonColors[5];
      defaultColor2 = cottonColors[3];
    }
    p.select('#color1Picker').value(defaultColor1);
    p.select('#color2Picker').value(defaultColor2);
    p.updateColor();
  };

  p.updateColor = function() {
    let color1 = p.select('#color1Picker').value();
    let color2 = p.select('#color2Picker').value();
    p.colors[0] = color1;
    p.colors[1] = color2;
    p.redraw();
  };

  p.getGPS = function() {
      p.gpsX = p.waypoints.map(point => point[0]); // Longitude
      p.gpsY = p.waypoints.map(point => point[1]); // Latitude
      p.minX = p.min(p.gpsX) + p.sliderStartX.getValue();
      p.maxX = p.max(p.gpsX) + p.sliderFinishX.getValue();
      p.minY = p.min(p.gpsY) + p.sliderStartY.getValue();
      p.maxY = p.max(p.gpsY) + p.sliderFinishY.getValue();
  };

  p.calculateSliderRanges = () => {
    p.gpsX = p.waypoints.map(point => point[0]);
    p.gpsY = p.waypoints.map(point => point[1]);
    p.minX = p.min(p.gpsX);
    p.maxX = p.max(p.gpsX);
    p.minY = p.min(p.gpsY);
    p.maxY = p.max(p.gpsY);
    rangeX = p.maxX - p.minX;
    rangeY = p.maxY - p.minY;
    return {
      slideX: [-rangeX, rangeX],
      slideY: [-rangeY, rangeY],
    };
  };
  p.setupSliders = ()=>{
    let { slideX, slideY } = p.calculateSliderRanges();
    p.sliderStartX = new Slider(slideX[0], slideX[1], 0, 0.0001);
    p.sliderStartY = new Slider(slideY[0], slideY[1], 0, 0.0001);
    p.sliderFinishX = new Slider(slideX[0], slideX[1], 0, 0.0001);
    p.sliderFinishY = new Slider(slideY[0], slideY[1], 0, 0.0001);
  };
  class Slider {
    constructor(min, max, start, step) {
      this.slider = p.createSlider(min, max, start, step);
      this.slider.addClass("mySlider");
      this.slider.parent("sliders");
      this.slider.changed(() => {
        p.clearCells();
        p.getGPS();
        p.updateCells();
        p.updateColor();
      });
    };
    getValue() {
      return this.slider.value();
    };
  };
  p.combineCanvases = function() {
    let fileName = file.name;
    let completeFilename = "pathTiles_pattern_" + fileName.replace(".gpx", "");

    return html2canvas(document.getElementById('preview')).then(divCanvas => {
        let pg = p.createGraphics(p.width + divCanvas.width + 150, Math.max(p.height, divCanvas.height) + 100);
        pg.background(255);
        pg.fill('#0a6e6b');
        pg.textSize(18);
        pg.textAlign(p.LEFT, p.TOP);

        let textTitle = fileName.replace(".gpx", "");
        let adjustedColumns = p.columns * 2;
        let adjustedRows = p.rows * 2;
        let textColumns = "Maschen: " + adjustedColumns;
        let textRows = "Reihen: " + adjustedRows;
        let verticalOffset = (divCanvas.height - p.height) / 2;
        let textBaseY = 50 + verticalOffset - 20;
        let textSpacing = 24;

        pg.text(textTitle, 50, textBaseY, p.width - 100);

        let divImage = p.createImage(divCanvas.width, divCanvas.height);
        divImage.drawingContext.drawImage(divCanvas, 0, 0);
        pg.image(divImage, p.width + 100, 50);
        pg.image(p.c, 50, 50 + verticalOffset + 30);

        return { pg: pg, completeFilename: completeFilename };
    });
};

  p.saveJPG = function() {
    p.combineCanvases().then(data => {
      data.pg.save(data.completeFilename + '.jpg');
    });
  };
  p.getScaledCanvasImage = function(scaleFactor) {
    let scaledWidth = p.c.width * p.scaleFactor;
    let scaledHeight = p.c.height * p.scaleFactor;
    let scaledImage = p.createImage(scaledWidth, scaledHeight);

    scaledImage.copy(p.c, 0, 0, p.c.width, p.c.height, 0, 0, scaledWidth, scaledHeight);
    return scaledImage;
  };
  p.setupPatternBackground = function(divID) {
    let scaledCanvasImage = p.getScaledCanvasImage(p.scaleFactor);
    scaledCanvasImage.loadPixels();
    let standardImage = new Image();
    standardImage.src = scaledCanvasImage.canvas.toDataURL();
    let patternDiv = document.getElementById(divID);
    patternDiv.style.backgroundImage = `url(${standardImage.src})`;
    patternDiv.style.backgroundRepeat = "repeat";
  }
  p.cellIndex = function(x, y) {
    let nx = p.floor(x / p.size);
    let ny = p.floor(y / p.size);
    return (ny * p.columns) + nx;
  }
  p.clearCells = function() {
    for (let i = 0; i < p.cells.length; i++) {
      p.cells[i] = 0;
    }
  }
  p.renderCells = function (rapportX, rapportY, m) {
    let x, y, deltaX, deltaY;
    // p.stroke(p.colors[1]);
    // p.strokeWeight(0.5);
    if (m === 0) { // No mirror
      x = rapportX; y = rapportY; deltaX = p.size; deltaY = p.size;
    } else if (m === 1) { // Mirror Y
      x = rapportX + p.rWidth - p.size; y = rapportY; deltaX = -p.size; deltaY = p.size;
    } else if (m === 2) { // Mirror X
      x = rapportX; y = rapportY + p.rHeight - p.size; deltaX = p.size; deltaY = -p.size;
    } else if (m === 3) { // Mirror XY
      x = rapportX + p.rWidth - p.size; y = rapportY + p.rHeight - p.size; deltaX = -p.size; deltaY = -p.size;
    }

    for (let i = 0; i < p.cells.length; i++) {
      p.fill(p.colors[p.cells[i]]);
      p.noStroke();
      p.rect(x, y, p.size, p.size);
      x += deltaX;
      if ((deltaX > 0 && x >= rapportX + p.rWidth) || (deltaX < 0 && x < rapportX)) {
        x = m % 2 === 0 ? rapportX : rapportX + p.rWidth - p.size;
        y += deltaY;
      }
      if ((deltaY > 0 && y >= rapportY + p.rHeight) || (deltaY < 0 && y < rapportY)) {
        break;
      }
    }
  };
  p.updateCells = function () {
    for (let i = 0; i < p.waypoints.length; i++) {
      let mapX = p.map(p.gpsX[i], p.minX, p.maxX, 0, p.rWidth);
      let mapY = p.map(p.gpsY[i], p.minY, p.maxY, 0, p.rHeight);
      p.cells[p.cellIndex(mapX, mapY)] = 1;
    }
  };
  p.createCHECK = function () {
    let checkboxes = p.selectAll('.myCheckbox input');
    p.checkboxGroups = [
      checkboxes.slice(0, 3),
      checkboxes.slice(3, 6),
      checkboxes.slice(6, 9),
      checkboxes.slice(9, 12)
    ];
    for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked(false);
    }
  };
  p.attachCheckboxListeners = function () {
    p.checkboxGroups.forEach((group, groupIndex) => {
      group.forEach((chk, checkboxIndex) => {
        chk.changed(() => {
          p.RAPPORT[groupIndex] = chk.checked() ? checkboxIndex + 1 : 0;
          group.forEach((c, i) => {
            if (i !== checkboxIndex) c.checked(false);
          });
          p.updateCells();
          p.updateColor();
        });
      });
    });
  };
};
