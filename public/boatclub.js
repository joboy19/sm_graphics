// Directional lighting demo: By Frederick Li
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'attribute vec2 a_TexCoords;\n' +
  'uniform mat4 u_ViewProjMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
  'uniform mat4 u_NormalMatrix;\n' +   // Transformation matrix of the normal
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec2 v_TexCoords;\n' +
  'varying vec3 v_Position;\n' +
  'void main() {\n' +
  '  gl_Position = u_ViewProjMatrix * u_ModelMatrix * a_Position;\n' +
     // Calculate the vertex position in the world coordinate
  '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Color = a_Color;\n' +
  '  v_TexCoords = a_TexCoords;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform bool u_UseTextures;\n' +    // Texture enable/disable flag
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec4 v_Color;\n' +
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoords;\n' +
  'void main() {\n' +
     // Normalize the normal because it is interpolated and not 1.0 in length any more
  '  vec3 normal = normalize(v_Normal);\n' +
     // Calculate the light direction and make its length 1.
  '  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
     // The dot product of the light direction and the orientation of a surface (the normal)
  '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
     // Calculate the final color from diffuse reflection and ambient reflection
  '  vec3 diffuse;\n' +
  '  if (u_UseTextures) {\n' +
  '     vec4 TexColor = texture2D(u_Sampler, v_TexCoords);\n' +
  '     diffuse = u_LightColor * TexColor.rgb * nDotL * 1.2;\n' +
  '  } else {\n' +
  '     diffuse = u_LightColor * v_Color.rgb * nDotL;\n' +
  '  }\n' +
  '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
  '  gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
  '}\n';

var modelMatrix = new Matrix4(); // The model matrix
var viewProjMatrix = new Matrix4();  // The view proj matrix
var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

//some global variables for the camera
var g_cameraHeight = 27;
var g_cameraAngle = 70;
var g_cameraAngle2 = 45;
var g_cameraZ = -23.4;
var g_cameraX = 17.2;

//some global variables for moving objects
var g_BoatX = 0;
var g_BoatZ = 0;
var g_BoatAngle = 0;
var g_BoatDistance = 0;
var g_BoatStep = 0.5;

var g_BoatXB = 0;
var g_BoatZB = 0;
var g_BoatAngleB = 0;
var g_BoatDistanceB = 5;
var g_BoatStepB = 0.5;

var imageLocations = ["resources/water.jpg", "resources/floor.jpg", "resources/boatclub.jpg", "resources/tree.jpg", "resources/bridge.jpg"];

var g_matrixStack = []; //matrix storage space
function pushMatrix(m) {
  var m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array (stack)
  return g_matrixStack.pop();
}

function main() {

  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set clear color and enable hidden surface removal
  gl.clearColor(0.6,0.9,0.9,1);
  gl.enable(gl.DEPTH_TEST);

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the storage locations of uniform attributes
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_ViewProjMatrix = gl.getUniformLocation(gl.program, 'u_ViewProjMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_UseTextures = gl.getUniformLocation(gl.program, 'u_UseTextures');
  var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

  console.log( u_ModelMatrix, u_ViewProjMatrix , u_NormalMatrix , u_LightColor, u_LightPosition , u_AmbientLight , u_Sampler);

  if (!u_ModelMatrix || !u_ViewProjMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition || !u_AmbientLight || !u_Sampler) {
    console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
    return;
  }

  // Set the light color (white)
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);

  gl.uniform3f(u_LightPosition, 0, 20, 0);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);


  viewProjMatrix.setPerspective(40, canvas.width/canvas.height, 1, 100);
  // Pass the model, view, and projection matrix to the uniform variable respectively
  gl.uniformMatrix4fv(u_ViewProjMatrix, false, viewProjMatrix.elements);

  //load all of the images and then start the animation loop, so that images arent loaded every frame
  loadImages(imageLocations, function(images){
    textures=[];
		for(var i = 0; i < images.length; i++){
				tempTexture = gl.createTexture();   // Create a texture object
				if (!tempTexture) {
					console.log('Failed to create the texture object');
					return false;
				}
				tempTexture.image = images[i];
				textures.push(tempTexture);
		}
    document.onkeydown = function(ev){
      keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_ViewProjMatrix, u_UseTextures, u_Sampler, textures);
    };
    draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewProjMatrix, u_UseTextures, u_Sampler, textures);
  });
}

//load images and once all loaded, run the callback
function loadImages(filesList, callback) {
  var images = [];
  var loaded = 0;
  for (var i = 0; i < filesList.length; i++) {
    var tempImg = new Image();
		tempImg.src = filesList[i];
		tempImg.onload = function(){
        loaded += 1;
  			if (loaded == filesList.length) {
  				callback(images);
  			}
  	}
    images.push(tempImg);
  }
}

//handler for key presses
function keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_ViewProjMatrix, u_UseTextures, u_Sampler, textures) {
  console.log("key pressed: ", ev.keyCode);
  switch (ev.keyCode) {
    case 38: // up
      g_cameraAngle2 -= 10;
      break;
    case 40: // down
      g_cameraAngle2 += 10;
      break;
    case 39: // right
      g_cameraAngle += 10;
      if (g_cameraAngle == 360){
        g_cameraAngle = 0;
      }
      break;
    case 37: // left
      g_cameraAngle -= 10;
      if (g_cameraAngle == -10){
        g_cameraAngle = 350;
      }
      break;
    case 87:
      g_cameraX -= 0.5 * Math.sin((g_cameraAngle/180)*3.1415);
      g_cameraZ += 0.5 * Math.cos((g_cameraAngle/180)*3.1415);

      break;
    case 83:
      g_cameraX += 0.5 * Math.sin((g_cameraAngle/180)*3.1415);
      g_cameraZ -= 0.5 * Math.cos((g_cameraAngle/180)*3.1415);
      break;
    case 65:
      g_cameraX += 0.5 * Math.cos((g_cameraAngle/180)*3.1415);
      g_cameraZ += 0.5 * Math.sin((g_cameraAngle/180)*3.1415);
      break;
    case 68:
      g_cameraX -= 0.5 * Math.cos((g_cameraAngle/180)*3.1415);
      g_cameraZ -= 0.5 * Math.sin((g_cameraAngle/180)*3.1415);
      break;
    case 81: //q
      g_cameraHeight += 0.5
      break;
    case 69: //e
      g_cameraHeight -= 0.5
      break;

    default: return; // Skip drawing at no effective action
  }
}

//init vertex buffers
function initVertexBuffers(gl, file, defColor) {
  var vertices = new Float32Array(file[0].vertices);
  var list = []
  for (var i = 0; i < vertices.length; i ++){
    list.push(defColor[0]);
    list.push(defColor[1]);
    list.push(defColor[2]);
  }
  var colors = new Float32Array(list);
  var normals = new Float32Array(file[0].normals);
  var indices = new Uint8Array(file[0].faces.flat());


  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

//init vertex buffers if a texture is used
function initVertexBuffersWithTex(gl, file, defColor) {
  var vertices = new Float32Array(file[0].vertices);
  var list = []
  for (var i = 0; i < vertices.length; i ++){
    list.push(defColor[0]);
    list.push(defColor[1]);
    list.push(defColor[2]);
  }
  var colors = new Float32Array(list);
  var normals = new Float32Array(file[0].normals);
  var textCoords = new Float32Array(file[0].texturecoords);
  var indices = new Uint8Array(file[0].faces.flat());


  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_TexCoords', textCoords, 2, gl.FLOAT)) return -1;


  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

//init array buffer
function initArrayBuffer (gl, attribute, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }

  gl.vertexAttribPointer(a_attribute, num, type, false, data.BYTES_PER_ELEMENT * num, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

//calculate the moving of the boats
function moveThings(){
  var angle = (165/180)*3.1415;

  if (g_BoatDistance > 10 && g_BoatAngle == 180){
    g_BoatStep = -0.5;
  } else if (g_BoatDistance > 10) {
    g_BoatStep = 0;
    g_BoatAngle += 30;
  } else if (g_BoatDistance < 0 && g_BoatAngle == 0){
    g_BoatStep = 0.5;
  } else if (g_BoatDistance < 0){
    g_BoatStep = 0;
    g_BoatAngle -= 30;
  }

  g_BoatDistance += g_BoatStep;

  g_BoatX = (g_BoatX + g_BoatStep*Math.sin(angle));
  g_BoatZ = (g_BoatZ + g_BoatStep*Math.cos(angle));

  var angle = (165/180)*3.1415;

  if (g_BoatDistanceB > 10 && g_BoatAngleB == 180){
    g_BoatStepB = -0.5;
  } else if (g_BoatDistanceB > 10) {
    g_BoatStepB = 0;
    g_BoatAngleB += 30;
  } else if (g_BoatDistanceB < 0 && g_BoatAngleB == 0){
    g_BoatStepB = 0.5;
  } else if (g_BoatDistanceB < 0){
    g_BoatStepB = 0;
    g_BoatAngleB -= 30;
  }

  g_BoatDistanceB += g_BoatStepB;

  g_BoatXB = (g_BoatXB + g_BoatStepB*Math.sin(angle));
  g_BoatZB = (g_BoatZB + g_BoatStepB*Math.cos(angle));

}

//main draw function, handling everything
function draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewProjMatrix, u_UseTextures, u_Sampler, textures) {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0.6,0.9,0.9,1);

  //set up camera and store
  viewProjMatrix.setPerspective(50, 1, 1, 100);
  viewProjMatrix.rotate(g_cameraAngle2, 1, 0, 0);
  viewProjMatrix.rotate(g_cameraAngle, 0, 1, 0);
  viewProjMatrix.translate(g_cameraX, -g_cameraHeight, g_cameraZ);

  gl.uniformMatrix4fv(u_ViewProjMatrix, false, viewProjMatrix.elements);

  //reset model matrix
  modelMatrix.setTranslate(0, 0, 0);

  //draw the terrain and water
  drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, floorData, [1,1,1], u_UseTextures, u_Sampler, textures[1]);
  drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, waterWithTexData, [1,1,1], u_UseTextures, u_Sampler, textures[0]);

  //draw the trees
  pushMatrix(modelMatrix);
    modelMatrix.scale(3, 3, 3);
    modelMatrix.translate(-1.3, 0.5, 2);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, treeData, [1, 1, 1], u_UseTextures, u_Sampler, textures[3]);
    modelMatrix.setTranslate(0, 0, 0);
    modelMatrix.scale(3, 3, 3);
    modelMatrix.translate(-1.7, 0.5, 4);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, treeData, [1, 1, 1], u_UseTextures, u_Sampler, textures[3]);
    modelMatrix.setTranslate(0, 0, 0);
    modelMatrix.scale(3, 3, 3);
    modelMatrix.translate(-1.8, 0.5, 8);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, treeData, [1, 1, 1], u_UseTextures, u_Sampler, textures[3]);
  modelMatrix = popMatrix();

  //draw the bridge pieces
  pushMatrix(modelMatrix);
    modelMatrix.translate(-8, 0, 0);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
    modelMatrix.translate(4,0,0);
    modelMatrix.scale(1, 1.045, 1);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, bridgeData, [1,1,1], u_UseTextures, u_Sampler, textures[4]);
  modelMatrix = popMatrix();

  //draw the boatclub and the boats
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-20, 0, 1, 0);
    modelMatrix.translate(16, 0, -2);
    drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, boatClubData, [0,0.2,0.2], u_UseTextures, u_Sampler, textures[2]);

    modelMatrix.scale(2, 2, 2);
    modelMatrix.translate(-1.5, -0.05, 3.5);
    for (var i = 0; i < 10; i++){
      drawItemNoTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, boatData, [0.4,0.1,0], u_UseTextures);
      modelMatrix.translate(0, -0, 0.5);
    }
  modelMatrix = popMatrix(modelMatrix);

  //draw the moving boats
  pushMatrix(modelMatrix);
    modelMatrix.scale(2, 2, 2);
    modelMatrix.translate(-.5 + g_BoatX, -0.05, 12 + g_BoatZ);
    modelMatrix.rotate(-105 + g_BoatAngle, 0, 1, 0);
    //modelMatrix.translate(12 + g_BoatX, -0.05, 2.2 + g_BoatZ);
    drawItemNoTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, boatData, [0.4,0.1,0], u_UseTextures);
  modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.scale(2, 2, 2);
    modelMatrix.translate(2.2 + g_BoatXB, -0.05, 8 + g_BoatZB);
    modelMatrix.rotate(-105 + g_BoatAngleB, 0, 1, 0)
    drawItemNoTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, boatData, [0.4,0.1,0], u_UseTextures);
  modelMatrix = popMatrix();

  //function to recall the draw function
  var animate = function(){
    moveThings();
    draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewProjMatrix, u_UseTextures, u_Sampler, textures);
  }

  //once frame is loaded, draw another
  requestAnimationFrame(animate);
}

//function to draw a given model with no texture
function drawItemNoTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, objectName, defColor, u_UseTextures){
  var n = initVertexBuffers(gl, objectName, defColor);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.uniform1i(u_UseTextures, false);

  // Calculate the normal transformation matrix and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

  // Draw the cube
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

//function to draw a given model with a given texture
function drawItemWithTex(gl, modelMatrix, u_ModelMatrix, u_NormalMatrix, objectName, defColor, u_UseTextures, u_Sampler, texture){

  //bind current texture and set it up
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);

  var n = initVertexBuffersWithTex(gl, objectName, defColor);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.uniform1i(u_UseTextures, true);

  // Calculate the normal transformation matrix and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

}
