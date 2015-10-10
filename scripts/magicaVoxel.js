// MagicaVoxel File Loader Module
// ===============================

var fs = require('fs');

// Helper Objects
function MVoxChunk(i, s, cs, c, ch){
  this.id = i;
  this.size = s;
  this.childrenSize = cs;
  this.contents = c;
  this.children = ch;
}

function VoxModel(options){
  this.width = 0;
  this.height = 0;
  this.depth = 0;
  this.zUp = false;
  this.data = [];

  if (options){
    for (var prop in options)
      if (this.hasOwnProperty(prop))
        this[prop] = options[prop];
  }

  for (var i = 0; i < this.width * this.height * this.depth; i++){
    this.data[i] = 0x00;
  }
}

// Load from a file
function load(fname){
  var file = fs.openSync(fname, 'r');

  var buffer = new Buffer(4);

    // Read the Magic Number
  fs.readSync(file, buffer, 0, 4);
  if (buffer.toString('ascii') != 'VOX ')
    return undefined;

  // Read Version number, discard
  fs.readSync(file, buffer, 0, 4);

  // Read MAIN chunk
  main = readChunk(file);

  // Close it up
  fs.closeSync(file);

  return loadFromMain(main);
}

// Load the data from the MAIN chunk
function loadFromMain(chunk){
  var size = undefined;
  var voxels = undefined;
  var palette = undefined;
  var model = undefined;

  // Load the Chunks
  for (var i = 0; i < chunk.children.length; i++){
    if (chunk.children[i].id == 'SIZE')
      size = chunk.children[i];
    else if (chunk.children[i].id == 'XYZI')
      voxels = chunk.children[i];
    else if (chunk.children[i].id == 'RGBI')
      palette = chunk.children[i];
  }

  // MagicaVoxel uses Z for height...we use it for depth
  if (size !== undefined && voxels !== undefined){
    var w = size.contents.readUIntLE(0, 4);
    var h = size.contents.readUIntLE(4, 4);
    var d = size.contents.readUIntLE(8, 4);

    if (w > 0 && h > 0 && d > 0){
      model = new VoxModel({width: w, height: h, depth: d, zUp: true});
      var numVoxels = voxels.contents.readUIntLE(0, 4);

      for (var j = 0; j < numVoxels; j++){
        var x = voxels.contents[(j * 4) + 4];
        var y = voxels.contents[(j * 4) + 5];
        var z = voxels.contents[(j * 4) + 6];
        var i = voxels.contents[(j * 4) + 7];

        var index = x + (y * model.width) + (z * model.width * model.height);
        if (index < w * h * d){
          model.data[index] = i;
        }
      }
    }
  }

  if (palette !== undefined){ /* TODO: create Palette */ }

  return model;
}

// Read a MagicaVoxel chunk from a file
function readChunk(file){
  var chunk = new MVoxChunk('', 0, 0, undefined, []);

  var buffer = new Buffer(4);

  // Read ID
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.id = buffer.toString('ascii');

  // Read Size
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.size = buffer.readUIntLE(0, 4);

  // Read Size of Children
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.childrenSize = buffer.readUIntLE(0, 4);

  // Read Data
  if (chunk.size > 0){
    chunk.contents = new Buffer(chunk.size);
    fs.readSync(file, chunk.contents, 0, chunk.size);
  }

  // Read Children Data
  var currentSize = 0;
  if (chunk.childrenSize > 0){
    while (currentSize < chunk.childrenSize){
      var childChunk = readChunk(file);
      chunk.children.push(childChunk);
      currentSize += 12 + childChunk.size + childChunk.childrenSize;
    }
  }

  return chunk;
}

// Exported Functions
exports.load = load;
