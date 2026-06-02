const canvas = document.getElementById("game-canvas");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const message = document.getElementById("message");
const fpsText = document.getElementById("fps");
const statusText = document.getElementById("status-text");
const engineText = document.getElementById("engine-text");
const throttleText = document.getElementById("throttle-text");
const ladderText = document.getElementById("ladder-text");
const scoreText = document.getElementById("score-text");
const startButton = document.getElementById("start-btn");
const debugStarterValues = document.getElementById("debug-starter-values");
const touchControls = document.getElementById("touch-controls");
const touchStatusPhase = document.getElementById("touch-status-phase");
const touchStatusValue = document.getElementById("touch-status-value");
const throttleControl = document.getElementById("throttle-control");
const touchThrottle = document.getElementById("touch-throttle");
const ladderControl = document.getElementById("ladder-control");
const touchLadder = document.getElementById("touch-ladder");
const pitchControl = document.getElementById("pitch-control");
const touchPitch = document.getElementById("touch-pitch");
const flightStick = document.getElementById("flight-stick");
const flightStickKnob = document.getElementById("flight-stick-knob");
const touchLayoutQuery = window.matchMedia("(max-width: 720px)");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8d2ac);
scene.fog = new THREE.Fog(0xe8d2ac, 260, 720);

const camera = new THREE.PerspectiveCamera(51, window.innerWidth / window.innerHeight, 0.1, 560);
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 9.8, 35.4);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 7.05, -38.0);
camera.position.copy(DEFAULT_CAMERA_POSITION);
camera.lookAt(DEFAULT_CAMERA_TARGET);
const cameraTarget = DEFAULT_CAMERA_TARGET.clone();
const desiredCameraPosition = new THREE.Vector3();
const desiredCameraTarget = new THREE.Vector3();
const orbitCamera = {
  active: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0.26,
  radius: 11.8,
  target: new THREE.Vector3(),
};

const clock = new THREE.Clock();

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  bankLeft: false,
  bankRight: false,
};

const touchInput = {
  throttleActive: false,
  throttleDragging: false,
  ladderActive: false,
  ladderDragging: false,
  pitchActive: false,
  pitchDragging: false,
  joystickPointerId: null,
  joystickX: 0,
  joystickY: 0,
};

const world = {
  machineZ: 8,
  ladderZ: -92,
  chimneyX: 0,
  chimneyZ: -88,
  chimneyHeight: 21,
  chimneyRadius: 2.2,
  chimneyMouthRadius: 2.2,
  chimneyRimRadius: 3.8,
  missBehindChimneyDistance: 190,
  wellX: 20,
  wellZ: -350,
  wellHeight: 1.2,
  wellRadius: 4.5,
  doorX: -3.4,
  doorZ: -184,
  doorHalfWidth: 2.25,
};

const state = {
  mode: "menu",
  engineStarted: false,
  engineStarting: false,
  startTimer: 0,
  crankAngle: 0,
  ropePull: 0,
  throttle: 0,
  flywheelSpin: 0,
  score: 0,
  wellHits: 0,
  tyre: {
    phase: "idle",
    radius: 0.9,
    spinRate: 0,
    position: new THREE.Vector3(4.25, 1.2, world.machineZ + 0.6),
    velocity: new THREE.Vector3(),
    airborneTime: 0,
    reloadTimer: 0,
    driftX: 0,
    wobbleAmplitude: 0,
    wobblePhase: 0,
    dragging: false,
    slideTimer: 0,
    bounceCount: 0,
    rimBounces: 0,
    rimCooldown: 0,
    restTimer: 0,
    laneTargetX: 0,
    launchPower: 0,
    rollTimer: 0,
    idleAngle: -0.28,
    poseBlend: 0,
    curveSpin: 0,
    scoreTarget: null,
    dragDepth: world.machineZ + 0.6,
  },
  ladderOffset: 0,
  ladderTilt: 0,
  ladderBank: 0,
  launchCount: 0,
  lastLaneTargetX: 0,
  lastLaunchLadderX: 0,
  lastLaunchPower: 0,
  stickFlash: 0,
  striker: {
    mouseActive: false,
    mouseDown: false,
    swing: 0,
    cooldown: 0,
    contact: 0,
    hitOffset: 0,
    pushDepth: 0,
    recoil: 0,
    grabOffset: 0,
    lastPointerTime: 0,
    lastTravel: 0,
    pushSpeed: 0,
    tipTarget: new THREE.Vector3(5.25, 2.05, 8.45),
    tipCurrent: new THREE.Vector3(5.25, 2.05, 8.45),
  },
  starter: {
    dragging: false,
    pull: 0,
    pullSpeed: 0,
    maxPullSpeed: 0,
    lastPull: 0,
    lastPointerTime: 0,
    failedKick: 0,
    detached: false,
    fallVelocity: new THREE.Vector3(),
    fallSpin: 0,
  },
  starterTuning: {
    base: {
      sleeveRadius: 0.705,
      sleeveInnerRadius: 0.38,
      anchorX: -0.465,
      anchorY: -0.04,
      anchorZ: 0.76,
      sleeveSpan: 0.45,
      ropeRadius: 0.086,
    },
    offset: {
      sleeveRadius: 0,
      sleeveInnerRadius: 0,
      anchorX: 0,
      anchorY: 0,
      anchorZ: 0,
      sleeveSpan: 0,
      ropeRadius: 0,
    },
  },
  message: "Press Start Simulator",
  smokeTime: 0,
  exhaustStartupBurst: 0,
  exhaustFlameBurst: 0,
  nextExhaustFlameBurst: 0.18,
  blackSmoke: 0,
  dustBurst: 0,
  justScored: false,
  spentTyres: [],
  orphanTyres: [],
  tyreDisposals: [],
  birds: [],
  nextBirdTimer: 3.5,
  birdsHit: 0,
  perf: {
    fps: 0,
    frameCount: 0,
    frameTime: 0,
  },
  engineModelLoaded: false,
  gameplayModelsLoaded: false,
  engineModelInfo: "loading split GLB models",
  audio: {
    enabled: false,
    unavailable: false,
    chugTimer: 0,
    skidLevel: 0,
    lastPhase: "idle",
    smokeHitPlayed: false,
  },
};

const damping = THREE.MathUtils.damp;
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempBox = new THREE.Box3();
const tempEuler = new THREE.Euler();
const tempQuat = new THREE.Quaternion();
const tempCorner = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const supportRaycaster = new THREE.Raycaster();
const mouseNdc = new THREE.Vector2();
const stickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(world.machineZ + 0.45));
const STICK_PUSH_AXIS = new THREE.Vector3(-1, -0.44, 0).normalize();
const STICK_LENGTH = 5.1;
const MACHINE_X = 1.35;
const LADDER_RANGE = 7.0;
const LADDER_CONTACT_HALF_WIDTH = 1.55;
const LADDER_CONTACT_Z_OFFSET = 0.85;
const LADDER_CONTACT_LOCAL_Y = 3.05;
const MACHINE_ON_BOARD_LIFT = 1.54;
const MACHINE_BOARD_CLEARANCE = 0.045;
const SPINDLE_BASE_Y = 1.49 + MACHINE_ON_BOARD_LIFT;
const LAUNCH_DISC_X = -2.37;
const TYRE_CONTACT_X = -1.87;
const TYRE_TUBE_RADIUS = 0.28;
const TYRE_OUTER_RADIUS = state.tyre.radius + TYRE_TUBE_RADIUS;
const IDLE_TYRE_HALF_THICKNESS = 0.08;
const IDLE_TYRE_SPAWN_X = MACHINE_X - 7.7;
const IDLE_TYRE_SPAWN_Z = world.machineZ + 6.9;
const MOBILE_IDLE_TYRE_SPAWN_X = MACHINE_X - 3.8;
const MOBILE_IDLE_TYRE_SPAWN_Z = world.machineZ + 2.4;
const ENGINE_MODEL_SCALE = 5.027;
const FLYWHEEL_MODEL_SCALE = ENGINE_MODEL_SCALE * 0.7;
const BOARD_MODEL_SCALE = 10.4;
const BOARD_LIFT = 0.25;
const PLATFORM_BASE_Y = 0.15;
const TYRE_MODEL_SCALE = TYRE_OUTER_RADIUS * 3.45;
const STICK_MODEL_THICKNESS_SCALE = 5.8;
const LADDER_MODEL_SCALE = 13.8;
const ENGINE_MODEL_POSITION = new THREE.Vector3(-0.28, -1.02 + MACHINE_ON_BOARD_LIFT, 0.58);
const FLYWHEEL_MODEL_POSITION = new THREE.Vector3(-1.98, 1.46 + MACHINE_ON_BOARD_LIFT, 0.76);
const BOARD_MODEL_POSITION = new THREE.Vector3(-0.15, -0.62, 0.95);
const BUILDING_MODEL_SCALE = 136;
const BUILDING_MODEL_POSITION = new THREE.Vector3(0, -0.06, -200);
const WELL_MODEL_SCALE = 18.0;
const TYRE_DRAG_MIN_X = TYRE_CONTACT_X - 1.15;
const TYRE_DRAG_MAX_X = MACHINE_X - 1.1;
const TYRE_MOUNT_WINDOW_X = 0.48;
const TYRE_MOUNT_WINDOW_Y = 0.48;
const TYRE_MOUNT_WINDOW_Z = 0.62;
const TYRE_MOUNT_FUNNEL_X = 0.92;
const TYRE_MOUNT_FUNNEL_Y = 0.78;
const TYRE_MOUNT_FUNNEL_Z = 0.95;
const TYRE_MOUNT_REJECT_MIN_SPIN = 0.45;
const TYRE_SPINNING_DISC_CONTACT_Y = 1.18;
const TYRE_SPINNING_DISC_CONTACT_Z = 1.15;
const TYRE_SPINNING_DISC_REJECT_PLANE_X = -0.2;
const STARTER_PULL_MIN_SPEED = 5.2;
const STARTER_PULL_MIN_DISTANCE = 1.35;
const STARTER_PULL_MAX_DISTANCE = 2.65;
const STARTER_SLEEVE_RADIUS = 0.705;
const STARTER_ROPE_RADIUS = 0.086;
const STARTER_SLEEVE_LENGTH = 0.45;

const audioSystem = {
  ctx: null,
  master: null,
  engineGain: null,
  engineLow: null,
  engineRattle: null,
  engineNoise: null,
  engineNoiseGain: null,
  engineNoiseFilter: null,
  tyreSkid: null,
  tyreSkidGain: null,
  tyreSkidFilter: null,
  started: false,
};

const ambient = new THREE.HemisphereLight(0xfff6d9, 0x8a613a, 1.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff6d8, 1.85);
sun.position.set(-6, 18, 11);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
scene.add(sun);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0xd5b07b,
  roughness: 1,
  metalness: 0,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1800, 100, 260), groundMaterial);
ground.position.z = -420;
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

for (let i = 0; i < ground.geometry.attributes.position.count; i++) {
  const x = ground.geometry.attributes.position.getX(i);
  const worldZ = ground.geometry.attributes.position.getY(i) + ground.position.z;
  ground.geometry.attributes.position.setZ(i, groundHeightAt(x, worldZ));
}
ground.geometry.computeVertexNormals();

const chimneySmoke = new THREE.Group();
chimneySmoke.position.set(world.chimneyX, world.chimneyHeight + 1.2, world.chimneyZ);
scene.add(chimneySmoke);
for (let i = 0; i < 10; i++) {
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(1.35 + i * 0.18, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xb8b3b0,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
  );
  puff.position.set((i - 4.5) * 0.58, i * 1.05, i * 0.62);
  chimneySmoke.add(puff);
}
const machinePadY = groundHeightAt(0, world.machineZ);
const machineGroup = new THREE.Group();
machineGroup.position.set(MACHINE_X, machinePadY + PLATFORM_BASE_Y + BOARD_LIFT + MACHINE_BOARD_CLEARANCE, world.machineZ);
scene.add(machineGroup);
const boardGroup = new THREE.Group();
boardGroup.position.set(MACHINE_X, machinePadY + PLATFORM_BASE_Y + BOARD_LIFT, world.machineZ);
scene.add(boardGroup);

function componentCountForAccessorType(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type] || 1;
}

function accessorArray(json, buffer, binOffset, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const bufferView = json.bufferViews[accessor.bufferView];
  const byteOffset = binOffset + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const itemSize = componentCountForAccessorType(accessor.type);
  const length = accessor.count * itemSize;
  const typeMap = {
    5121: Uint8Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array,
  };
  const ArrayType = typeMap[accessor.componentType];
  if (!ArrayType) {
    throw new Error(`Unsupported GLB component type ${accessor.componentType}`);
  }
  return { array: new ArrayType(buffer, byteOffset, length), itemSize };
}

function makeTextureFromEmbeddedImage(json, buffer, binOffset, imageIndex) {
  const image = json.images?.[imageIndex];
  if (!image || image.bufferView === undefined) {
    return null;
  }
  const bufferView = json.bufferViews[image.bufferView];
  const start = binOffset + (bufferView.byteOffset || 0);
  const bytes = new Uint8Array(buffer, start, bufferView.byteLength);
  const blob = new Blob([bytes], { type: image.mimeType || "image/png" });
  const url = URL.createObjectURL(blob);
  const texture = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
  return texture;
}

function decodeBase64ChunksToArrayBuffer(chunks) {
  const binary = atob(chunks.join(""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function createMeshFromGlbBuffer(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("Asset is not a GLB file.");
  }

  let offset = 12;
  let json = null;
  let binOffset = 0;
  while (offset < buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, chunkLength)));
    } else if (chunkType === 0x004e4942) {
      binOffset = offset;
    }
    offset += chunkLength;
  }

  if (!json || !binOffset) {
    throw new Error("GLB is missing JSON or BIN chunks.");
  }

  const primitive = json.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  const position = accessorArray(json, buffer, binOffset, primitive.attributes.POSITION);
  geometry.setAttribute("position", new THREE.BufferAttribute(position.array, position.itemSize));
  if (primitive.attributes.NORMAL !== undefined) {
    const normal = accessorArray(json, buffer, binOffset, primitive.attributes.NORMAL);
    geometry.setAttribute("normal", new THREE.BufferAttribute(normal.array, normal.itemSize));
  }
  if (primitive.attributes.TEXCOORD_0 !== undefined) {
    const uv = accessorArray(json, buffer, binOffset, primitive.attributes.TEXCOORD_0);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv.array, uv.itemSize));
  }
  if (primitive.indices !== undefined) {
    const indices = accessorArray(json, buffer, binOffset, primitive.indices);
    geometry.setIndex(new THREE.BufferAttribute(indices.array, 1));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const textureIndex = json.materials?.[primitive.material]?.pbrMetallicRoughness?.baseColorTexture?.index;
  const textureSource =
    textureIndex !== undefined
      ? json.textures?.[textureIndex]?.extensions?.EXT_texture_webp?.source ?? json.textures?.[textureIndex]?.source
      : undefined;
  const map = textureSource !== undefined ? makeTextureFromEmbeddedImage(json, buffer, binOffset, textureSource) : null;
  const material = new THREE.MeshStandardMaterial({
    map,
    color: map ? 0xffffff : 0x49614e,
    roughness: 0.78,
    metalness: 0.42,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, json };
}

function normalizeModelToGround(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.geometry.translate(-center.x, -box.min.y, -center.z);
}

function normalizeWheelToPivot(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.geometry.translate(-center.x, -center.y, -center.z);
}

let flywheelModelPivot = null;
let boardModel = null;
let boardSupportBox = null;
let buildingModel = null;
let ladderModel = null;
let wellModel = null;

function installMachineModel(mesh, json, sourceName) {
  normalizeModelToGround(mesh);
  mesh.scale.setScalar(ENGINE_MODEL_SCALE);
  mesh.position.copy(ENGINE_MODEL_POSITION);
  mesh.rotation.y = Math.PI;
  machineGroup.add(mesh);
  state.engineModelLoaded = true;
  state.engineModelInfo = `${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function installFlywheelModel(mesh, json, sourceName) {
  normalizeWheelToPivot(mesh);
  mesh.scale.setScalar(FLYWHEEL_MODEL_SCALE);
  mesh.rotation.y = -Math.PI / 2;
  flywheelModelPivot = new THREE.Group();
  flywheelModelPivot.position.copy(FLYWHEEL_MODEL_POSITION);
  flywheelModelPivot.add(mesh);
  machineGroup.add(flywheelModelPivot);
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function installBoardModel(mesh, json, sourceName) {
  normalizeModelToGround(mesh);
  mesh.scale.setScalar(BOARD_MODEL_SCALE);
  mesh.position.copy(BOARD_MODEL_POSITION);
  mesh.rotation.y = Math.PI / 2;
  boardModel = mesh;
  boardGroup.add(boardModel);
  refreshBoardSupportBox();
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function refreshBoardSupportBox() {
  if (!boardModel) return;
  boardGroup.updateWorldMatrix(true, true);
  boardModel.updateWorldMatrix(true, true);
  boardSupportBox = new THREE.Box3().setFromObject(boardModel);
}

function installBuildingModel(mesh, json, sourceName) {
  normalizeModelToGround(mesh);
  mesh.scale.setScalar(BUILDING_MODEL_SCALE);
  mesh.position.copy(BUILDING_MODEL_POSITION);
  mesh.rotation.y = 0;
  buildingModel = mesh;
  scene.add(buildingModel);
  alignChimneyToBuildingModel();
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function installWellModel(mesh, json, sourceName) {
  normalizeModelToGround(mesh);
  mesh.scale.setScalar(WELL_MODEL_SCALE);
  mesh.position.set(world.wellX, groundHeightAt(world.wellX, world.wellZ) - 0.04, world.wellZ);
  mesh.rotation.y = -0.24;
  wellModel = mesh;
  scene.add(wellModel);
  alignWellTargetToModel();
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function alignWellTargetToModel() {
  if (!wellModel) return;
  wellModel.updateWorldMatrix(true, true);
  const box = tempBox.setFromObject(wellModel);
  world.wellX = (box.min.x + box.max.x) * 0.5;
  world.wellZ = (box.min.z + box.max.z) * 0.5;
  world.wellHeight = box.min.y + (box.max.y - box.min.y) * 0.38;
  world.wellRadius = Math.max(5.2, Math.min(box.max.x - box.min.x, box.max.z - box.min.z) * 0.24);
}

function alignChimneyToBuildingModel() {
  buildingModel.updateWorldMatrix(true, true);
  const position = buildingModel.geometry.attributes.position;
  const points = [];
  const vertex = new THREE.Vector3();
  let maxY = -Infinity;
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).applyMatrix4(buildingModel.matrixWorld);
    maxY = Math.max(maxY, vertex.y);
    points.push(vertex.clone());
  }
  points.sort((a, b) => b.y - a.y);
  const topCount = Math.max(20, Math.floor(points.length * 0.01));
  const chimneyTop = points.slice(0, topCount).reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / topCount);
  const topBand = points.filter((point) => point.y > maxY - 3.0 && Math.hypot(point.x - chimneyTop.x, point.z - chimneyTop.z) < 22);
  const mouthCenter = topBand.length
    ? topBand.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / topBand.length)
    : chimneyTop;
  const distances = topBand
    .map((point) => Math.hypot(point.x - mouthCenter.x, point.z - mouthCenter.z))
    .sort((a, b) => a - b);
  let innerRadius = world.chimneyMouthRadius;
  let outerRadius = world.chimneyRimRadius;
  if (distances.length > 12) {
    let gapIndex = Math.floor(distances.length * 0.06);
    let biggestGap = 0;
    const gapStart = Math.floor(distances.length * 0.03);
    const gapEnd = Math.floor(distances.length * 0.36);
    for (let i = gapStart; i < gapEnd; i++) {
      const gap = distances[i + 1] - distances[i];
      if (gap > biggestGap) {
        biggestGap = gap;
        gapIndex = i;
      }
    }
    innerRadius = THREE.MathUtils.clamp(distances[gapIndex], 2.4, 7.2);
    outerRadius = THREE.MathUtils.clamp(distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.9))], innerRadius + 1.4, 14);
  }
  world.chimneyX = mouthCenter.x;
  world.chimneyZ = mouthCenter.z;
  world.chimneyHeight = maxY - 1.0;
  world.chimneyMouthRadius = innerRadius;
  world.chimneyRimRadius = outerRadius;
  world.chimneyRadius = innerRadius;
  chimneySmoke.position.set(world.chimneyX, world.chimneyHeight + 1.2, world.chimneyZ);
}

function installTyreModel(mesh, json, sourceName) {
  normalizeWheelToPivot(mesh);
  tyre.geometry = mesh.geometry;
  tyre.material = mesh.material;
  tyre.castShadow = true;
  tyre.receiveShadow = true;
  tyre.rotation.set(0, Math.PI / 2, 0);
  tyre.visible = true;
  tyreInnerShadow.visible = false;
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function installStickModel(mesh, json, sourceName) {
  normalizeWheelToPivot(mesh);
  mesh.geometry.rotateZ(Math.PI / 2);
  stick.geometry = mesh.geometry;
  stick.material = mesh.material;
  stick.castShadow = true;
  stick.receiveShadow = true;
  stick.visible = true;
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

function installLadderModel(mesh, json, sourceName) {
  normalizeModelToGround(mesh);
  ladderGroup.clear();
  mesh.scale.setScalar(LADDER_MODEL_SCALE);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  ladderModel = mesh;
  ladderGroup.add(ladderModel);
  state.engineModelInfo += ` + ${sourceName}: ${json.nodes?.length || 0} nodes / ${json.meshes?.length || 0} mesh`;
}

const MODEL_BASE_PATH = "./assets/models";

async function loadRequiredGlb(sourceName) {
  const response = await fetch(`${MODEL_BASE_PATH}/${sourceName}`);
  if (!response.ok) {
    throw new Error(`Could not load ${sourceName}: ${response.status} ${response.statusText}`);
  }
  return createMeshFromGlbBuffer(await response.arrayBuffer());
}

async function installSplitEngineModels() {
  try {
    const [engineAsset, wheelAsset, boardAsset, buildingAsset, wellAsset] = await Promise.all([
      loadRequiredGlb("engine2.glb"),
      loadRequiredGlb("wheel.glb"),
      loadRequiredGlb("woodBoards.glb"),
      loadRequiredGlb("building.glb"),
      loadRequiredGlb("well.glb"),
    ]);
    installBoardModel(boardAsset.mesh, boardAsset.json, "woodBoards.glb");
    installMachineModel(engineAsset.mesh, engineAsset.json, "engine2.glb");
    installFlywheelModel(wheelAsset.mesh, wheelAsset.json, "wheel.glb");
    installBuildingModel(buildingAsset.mesh, buildingAsset.json, "building.glb");
    installWellModel(wellAsset.mesh, wellAsset.json, "well.glb");
    state.engineModelLoaded = true;
  } catch (error) {
    console.error("Could not load required split engine models:", error);
    state.engineModelInfo = "missing required split GLB models";
  }
}

installSplitEngineModels();

const stickGroup = new THREE.Group();
scene.add(stickGroup);
const stick = new THREE.Mesh(
  new THREE.BufferGeometry(),
  new THREE.MeshStandardMaterial({ color: 0x5e3b20, roughness: 0.92 })
);
stick.castShadow = true;
stick.visible = false;
stickGroup.add(stick);

const stickHitbox = new THREE.Mesh(
  new THREE.BoxGeometry(0.85, 1, 0.62),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
);
stickHitbox.name = "stick-hitbox";
stickGroup.add(stickHitbox);

const stickTip = new THREE.Mesh(
  new THREE.BoxGeometry(0.01, 0.01, 0.01),
  new THREE.MeshStandardMaterial({ color: 0x76502c, roughness: 0.96 })
);
stickTip.castShadow = true;
stickTip.visible = false;
stickGroup.add(stickTip);

const stickContactRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.42, 0.025, 8, 36),
  new THREE.MeshBasicMaterial({ color: 0xffe07b, transparent: true, opacity: 0 })
);
stickContactRing.rotation.y = Math.PI / 2;
scene.add(stickContactRing);

const starterGroup = new THREE.Group();
scene.add(starterGroup);

function createSleeveTubeGeometry(outerRadius = 1, innerRadius = 0.58, length = STARTER_SLEEVE_LENGTH, segments = 40) {
  const positions = [];
  const normals = [];
  const indices = [];
  const half = length / 2;

  function addVertex(x, y, z, nx, ny, nz) {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    return positions.length / 3 - 1;
  }

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);

    const outerA0 = addVertex(-half, outerRadius * c0, outerRadius * s0, 0, c0, s0);
    const outerB0 = addVertex(half, outerRadius * c0, outerRadius * s0, 0, c0, s0);
    const outerA1 = addVertex(-half, outerRadius * c1, outerRadius * s1, 0, c1, s1);
    const outerB1 = addVertex(half, outerRadius * c1, outerRadius * s1, 0, c1, s1);
    indices.push(outerA0, outerA1, outerB0, outerB0, outerA1, outerB1);

    const innerA0 = addVertex(-half, innerRadius * c0, innerRadius * s0, 0, -c0, -s0);
    const innerA1 = addVertex(-half, innerRadius * c1, innerRadius * s1, 0, -c1, -s1);
    const innerB0 = addVertex(half, innerRadius * c0, innerRadius * s0, 0, -c0, -s0);
    const innerB1 = addVertex(half, innerRadius * c1, innerRadius * s1, 0, -c1, -s1);
    indices.push(innerA0, innerB0, innerA1, innerB0, innerB1, innerA1);

    const frontOuter0 = addVertex(-half, outerRadius * c0, outerRadius * s0, -1, 0, 0);
    const frontOuter1 = addVertex(-half, outerRadius * c1, outerRadius * s1, -1, 0, 0);
    const frontInner0 = addVertex(-half, innerRadius * c0, innerRadius * s0, -1, 0, 0);
    const frontInner1 = addVertex(-half, innerRadius * c1, innerRadius * s1, -1, 0, 0);
    indices.push(frontOuter0, frontInner0, frontOuter1, frontOuter1, frontInner0, frontInner1);

    const backOuter0 = addVertex(half, outerRadius * c0, outerRadius * s0, 1, 0, 0);
    const backInner0 = addVertex(half, innerRadius * c0, innerRadius * s0, 1, 0, 0);
    const backOuter1 = addVertex(half, outerRadius * c1, outerRadius * s1, 1, 0, 0);
    const backInner1 = addVertex(half, innerRadius * c1, innerRadius * s1, 1, 0, 0);
    indices.push(backOuter0, backOuter1, backInner0, backOuter1, backInner1, backInner0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const starterSleeve = new THREE.Mesh(
  createSleeveTubeGeometry(STARTER_SLEEVE_RADIUS, 0.38, STARTER_SLEEVE_LENGTH),
  new THREE.MeshStandardMaterial({ color: 0x2c2218, roughness: 0.9 })
);
starterSleeve.castShadow = true;
starterGroup.add(starterSleeve);
const starterRope = new THREE.Mesh(
  new THREE.CapsuleGeometry(STARTER_ROPE_RADIUS, 1, 4, 10),
  new THREE.MeshStandardMaterial({ color: 0x1e1a15, roughness: 0.98 })
);
starterRope.castShadow = true;
starterGroup.add(starterRope);
const starterHandle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 0.42, 12),
  new THREE.MeshStandardMaterial({ color: 0x6d4a2a, roughness: 0.86 })
);
starterHandle.castShadow = true;
starterGroup.add(starterHandle);

const tyreMaterial = new THREE.MeshStandardMaterial({
  color: 0x232427,
  roughness: 0.9,
  metalness: 0.08,
});
const tyre = new THREE.Mesh(new THREE.BufferGeometry(), tyreMaterial);
tyre.name = "activeTyre";
tyre.castShadow = true;
tyre.rotation.y = Math.PI / 2;
tyre.visible = false;
scene.add(tyre);

const tyreContactShadow = new THREE.Mesh(
  new THREE.CircleGeometry(1, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
);
tyreContactShadow.rotation.x = -Math.PI / 2;
tyreContactShadow.renderOrder = -1;
scene.add(tyreContactShadow);

const tyreChunkGeometry = new THREE.BoxGeometry(0.42, 0.18, 0.24);
const tyreChunkMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.04 });
const tyreDisposalSmokeMaterial = new THREE.MeshStandardMaterial({
  color: 0x4b4841,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

const spentTyreGroup = new THREE.Group();
scene.add(spentTyreGroup);

const orphanTyreGroup = new THREE.Group();
scene.add(orphanTyreGroup);

const tyreInnerShadow = new THREE.Mesh(
  new THREE.BufferGeometry(),
  new THREE.MeshBasicMaterial({ color: 0x070707, transparent: true, opacity: 0.36 })
);
tyreInnerShadow.rotation.y = Math.PI / 2;
tyre.add(tyreInnerShadow);
tyreInnerShadow.visible = false;

const birdGroup = new THREE.Group();
scene.add(birdGroup);
const birdBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: 0.85 });
const birdWingMaterial = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.78 });
const birdBodyGeometry = new THREE.SphereGeometry(0.22, 12, 8);
const birdWingGeometry = new THREE.BoxGeometry(0.68, 0.035, 0.16);

const ladderGroup = new THREE.Group();
scene.add(ladderGroup);

const ladderShadow = new THREE.Mesh(
  new THREE.CircleGeometry(1.75, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })
);
ladderShadow.rotation.x = -Math.PI / 2;
ladderShadow.position.y = 0.01;
scene.add(ladderShadow);

async function installGameplayModels() {
  try {
    const [ladderAsset, stickAsset, tyreAsset] = await Promise.all([
      loadRequiredGlb("ladder.glb"),
      loadRequiredGlb("stick.glb"),
      loadRequiredGlb("tyre.glb"),
    ]);
    installLadderModel(ladderAsset.mesh, ladderAsset.json, "ladder.glb");
    installStickModel(stickAsset.mesh, stickAsset.json, "stick.glb");
    installTyreModel(tyreAsset.mesh, tyreAsset.json, "tyre.glb");
    state.gameplayModelsLoaded = true;
  } catch (error) {
    console.error("Could not load required gameplay models:", error);
    state.engineModelInfo += " + missing required gameplay GLB models";
  }
}

installGameplayModels();

const dustCloud = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 18, 18),
  new THREE.MeshStandardMaterial({
    color: 0xe9d6b2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
);
dustCloud.scale.set(1.3, 0.55, 1.1);
scene.add(dustCloud);

const engineExhaustGroup = new THREE.Group();
engineExhaustGroup.position.set(-0.95, 1.72, 0.38);
machineGroup.add(engineExhaustGroup);

const exhaustFlameMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6b20,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const exhaustFlameCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff0a0,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const engineFlame = new THREE.Mesh(new THREE.ConeGeometry(0.23, 1.25, 18, 1, true), exhaustFlameMaterial);
engineFlame.rotation.z = Math.PI / 2;
engineFlame.position.x = -0.72;
engineExhaustGroup.add(engineFlame);

const engineFlameCore = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.78, 14, 1, true), exhaustFlameCoreMaterial);
engineFlameCore.rotation.z = Math.PI / 2;
engineFlameCore.position.x = -0.56;
engineExhaustGroup.add(engineFlameCore);

const exhaustLight = new THREE.PointLight(0xff7a25, 0, 5.5, 2.2);
exhaustLight.position.set(-0.82, 0, 0);
engineExhaustGroup.add(exhaustLight);

const engineSmokePuffs = [];
for (let i = 0; i < 5; i++) {
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.34 + i * 0.08, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x5e5d58,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  puff.position.x = -0.7 - i * 0.58;
  puff.position.y = 0.02 + i * 0.03;
  puff.position.z = (i - 2) * 0.05;
  engineExhaustGroup.add(puff);
  engineSmokePuffs.push(puff);
}

function createNoiseBuffer(ctx, duration = 1) {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function ensureAudio() {
  if (state.audio.unavailable || audioSystem.started) {
    if (audioSystem.ctx?.state === "suspended") {
      audioSystem.ctx.resume();
    }
    return audioSystem.started;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    state.audio.unavailable = true;
    return false;
  }

  try {
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.58;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.18;
    compressor.connect(ctx.destination);
    master.connect(compressor);

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;
    engineGain.connect(master);

    const engineLow = ctx.createOscillator();
    engineLow.type = "triangle";
    engineLow.frequency.value = 20;
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = "lowpass";
    lowFilter.frequency.value = 92;
    engineLow.connect(lowFilter);
    lowFilter.connect(engineGain);
    engineLow.start();

    const engineRattle = ctx.createOscillator();
    engineRattle.type = "sawtooth";
    engineRattle.frequency.value = 34;
    const rattleGain = ctx.createGain();
    rattleGain.gain.value = 0.045;
    engineRattle.connect(rattleGain);
    rattleGain.connect(engineGain);
    engineRattle.start();

    const engineNoise = ctx.createBufferSource();
    engineNoise.buffer = createNoiseBuffer(ctx, 1.2);
    engineNoise.loop = true;
    const engineNoiseFilter = ctx.createBiquadFilter();
    engineNoiseFilter.type = "bandpass";
    engineNoiseFilter.frequency.value = 260;
    engineNoiseFilter.Q.value = 0.9;
    const engineNoiseGain = ctx.createGain();
    engineNoiseGain.gain.value = 0.0001;
    engineNoise.connect(engineNoiseFilter);
    engineNoiseFilter.connect(engineNoiseGain);
    engineNoiseGain.connect(master);
    engineNoise.start();

    const tyreSkid = ctx.createBufferSource();
    tyreSkid.buffer = createNoiseBuffer(ctx, 1.5);
    tyreSkid.loop = true;
    const tyreSkidFilter = ctx.createBiquadFilter();
    tyreSkidFilter.type = "bandpass";
    tyreSkidFilter.frequency.value = 1450;
    tyreSkidFilter.Q.value = 5.5;
    const tyreSkidGain = ctx.createGain();
    tyreSkidGain.gain.value = 0.0001;
    tyreSkid.connect(tyreSkidFilter);
    tyreSkidFilter.connect(tyreSkidGain);
    tyreSkidGain.connect(master);
    tyreSkid.start();

    Object.assign(audioSystem, {
      ctx,
      master,
      engineGain,
      engineLow,
      engineRattle,
      engineNoise,
      engineNoiseGain,
      engineNoiseFilter,
      tyreSkid,
      tyreSkidGain,
      tyreSkidFilter,
      started: true,
    });
    state.audio.enabled = true;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return true;
  } catch (error) {
    state.audio.unavailable = true;
    console.warn("Audio unavailable", error);
    return false;
  }
}

function playToneBurst(frequency, duration, gain, type = "sine", destination = audioSystem.master, endFrequency = frequency) {
  const ctx = audioSystem.ctx;
  if (!ctx || !destination) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
  amp.gain.setValueAtTime(Math.max(0.0001, gain), now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(destination);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playNoiseBurst(duration, gain, frequency = 900, q = 1.8, type = "bandpass") {
  const ctx = audioSystem.ctx;
  if (!ctx || !audioSystem.master) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, Math.max(0.05, duration));
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(Math.max(0.0001, gain), now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(audioSystem.master);
  source.start(now);
  source.stop(now + duration + 0.03);
}

function playSound(kind) {
  if (!ensureAudio()) return;
  switch (kind) {
    case "starter":
      playToneBurst(72, 0.22, 0.12, "sawtooth", audioSystem.master, 44);
      playNoiseBurst(0.32, 0.08, 360, 0.9, "lowpass");
      break;
    case "engineCatch":
      playToneBurst(48, 0.36, 0.18, "sawtooth", audioSystem.master, 68);
      playNoiseBurst(0.18, 0.11, 620, 1.2, "bandpass");
      break;
    case "mount":
      playToneBurst(180, 0.08, 0.045, "triangle", audioSystem.master, 120);
      playNoiseBurst(0.12, 0.04, 1600, 5, "bandpass");
      break;
    case "stick":
      playToneBurst(135, 0.08, 0.16, "triangle", audioSystem.master, 72);
      playNoiseBurst(0.09, 0.12, 780, 2.5, "bandpass");
      break;
    case "launchSkid":
      playNoiseBurst(0.42, 0.095, 1900, 7, "bandpass");
      playToneBurst(82, 0.18, 0.075, "sawtooth", audioSystem.master, 135);
      break;
    case "ladder":
      playToneBurst(420, 0.38, 0.08, "square", audioSystem.master, 250);
      playToneBurst(760, 0.22, 0.045, "triangle", audioSystem.master, 580);
      playNoiseBurst(0.1, 0.08, 1200, 4, "bandpass");
      break;
    case "rim":
      playToneBurst(510, 0.18, 0.075, "square", audioSystem.master, 420);
      playToneBurst(240, 0.12, 0.06, "triangle", audioSystem.master, 180);
      playNoiseBurst(0.08, 0.075, 1450, 5.5, "bandpass");
      break;
    case "miss":
      playToneBurst(90, 0.22, 0.14, "sine", audioSystem.master, 45);
      playNoiseBurst(0.28, 0.12, 260, 0.7, "lowpass");
      break;
    case "chimney":
      playToneBurst(62, 0.34, 0.18, "sine", audioSystem.master, 38);
      playNoiseBurst(0.42, 0.2, 240, 0.8, "lowpass");
      break;
    case "well":
      playToneBurst(190, 0.16, 0.075, "sine", audioSystem.master, 90);
      playToneBurst(92, 0.34, 0.12, "triangle", audioSystem.master, 55);
      playNoiseBurst(0.46, 0.14, 520, 1.1, "lowpass");
      break;
    case "soot":
      playNoiseBurst(0.72, 0.22, 170, 0.55, "lowpass");
      playToneBurst(42, 0.48, 0.14, "sawtooth", audioSystem.master, 31);
      break;
    case "doorHit":
      playToneBurst(118, 0.2, 0.18, "triangle", audioSystem.master, 72);
      playToneBurst(58, 0.3, 0.1, "sine", audioSystem.master, 36);
      playNoiseBurst(0.42, 0.16, 360, 0.8, "lowpass");
      break;
    case "tyrePop":
      playNoiseBurst(0.7, 0.12, 900, 1.8, "bandpass");
      playToneBurst(64, 0.18, 0.16, "sawtooth", audioSystem.master, 42);
      break;
    case "sandSink":
      playNoiseBurst(0.48, 0.3, 180, 0.55, "lowpass");
      playToneBurst(38, 0.24, 0.08, "sine", audioSystem.master, 28);
      break;
  }
}

function playDieselChug() {
  if (!audioSystem.ctx) return;
  const rpmBite = THREE.MathUtils.clamp(state.flywheelSpin / 9, 0, 1);
  playToneBurst(19 + rpmBite * 7, 0.13, 0.09 + rpmBite * 0.052, "triangle", audioSystem.master, 15);
  playToneBurst(36 + rpmBite * 13, 0.09, 0.045 + rpmBite * 0.032, "sine", audioSystem.master, 25);
  playNoiseBurst(0.055, 0.012 + rpmBite * 0.015, 220 + rpmBite * 240, 0.65, "bandpass");
  if (Math.random() < 0.18 + rpmBite * 0.12) {
    playToneBurst(360 + Math.random() * 190, 0.026, 0.009, "square", audioSystem.master, 260);
  }
}

function updateAudio(dt) {
  if (!audioSystem.started || !audioSystem.ctx || audioSystem.ctx.state === "suspended") {
    return;
  }

  const ctx = audioSystem.ctx;
  const now = ctx.currentTime;
  const engineActive = state.engineStarted || state.engineStarting || state.flywheelSpin > 0.15;
  const rpm = state.engineStarting ? 0.22 : THREE.MathUtils.clamp(state.flywheelSpin / 8.8, 0, 1);
  const pulse = engineActive ? 0.62 + Math.pow(Math.sin(state.smokeTime * (3.3 + rpm * 4.5)) * 0.5 + 0.5, 2.4) * 0.72 : 0;
  const dieselGain = engineActive ? (0.038 + rpm * 0.105 + state.throttle * 0.035) * pulse : 0.0001;
  audioSystem.engineGain.gain.setTargetAtTime(dieselGain, now, 0.08);
  audioSystem.engineLow.frequency.setTargetAtTime(18 + rpm * 18 + state.throttle * 3, now, 0.08);
  audioSystem.engineRattle.frequency.setTargetAtTime(30 + rpm * 28, now, 0.05);
  audioSystem.engineNoiseGain.gain.setTargetAtTime(engineActive ? 0.003 + rpm * 0.012 : 0.0001, now, 0.08);
  audioSystem.engineNoiseFilter.frequency.setTargetAtTime(150 + rpm * 260, now, 0.06);

  const tyreSpeed = Math.hypot(state.tyre.velocity.x, state.tyre.velocity.z);
  let skidTarget = 0;
  if (state.tyre.phase === "mounted" && state.flywheelSpin > 2.5) {
    skidTarget = 0.008 + THREE.MathUtils.clamp(state.flywheelSpin / 9, 0, 1) * 0.025;
  } else if (state.tyre.phase === "rolling") {
    skidTarget = state.tyre.slideTimer > 0 ? 0.13 : THREE.MathUtils.clamp(tyreSpeed * 0.007, 0.018, 0.085);
  } else if (state.tyre.phase === "missed") {
    skidTarget = 0.016;
  }
  state.audio.skidLevel = damping(state.audio.skidLevel, skidTarget, 8, dt);
  audioSystem.tyreSkidGain.gain.setTargetAtTime(Math.max(0.0001, state.audio.skidLevel), now, 0.04);
  audioSystem.tyreSkidFilter.frequency.setTargetAtTime(680 + state.audio.skidLevel * 5200 + tyreSpeed * 55, now, 0.05);

  state.audio.chugTimer -= dt;
  if (engineActive && state.audio.chugTimer <= 0) {
    playDieselChug();
    state.audio.chugTimer = THREE.MathUtils.lerp(0.34, 0.16, rpm) + Math.random() * 0.03;
  }

  if (state.tyre.phase === "scored" && state.blackSmoke > 0.34 && !state.audio.smokeHitPlayed) {
    state.audio.smokeHitPlayed = true;
    playSound("soot");
  }
}

function resetRound(keepScore = true, nextMode = "playing") {
  state.mode = nextMode;
  state.engineStarted = false;
  state.engineStarting = false;
  state.startTimer = 0;
  state.crankAngle = 0;
  state.ropePull = 0;
  state.throttle = 0;
  state.flywheelSpin = 0;
  state.ladderOffset = 0;
  state.ladderTilt = 0;
  state.ladderBank = 0;
  state.launchCount = keepScore ? state.launchCount : 0;
  state.lastLaneTargetX = 0;
  state.lastLaunchLadderX = 0;
  state.lastLaunchPower = 0;
  state.tyre.phase = "idle";
  state.tyre.spinRate = 0;
  state.tyre.airborneTime = 0;
  state.tyre.reloadTimer = 0;
  state.tyre.driftX = 0;
  state.tyre.wobbleAmplitude = 0;
  state.tyre.wobblePhase = 0;
  state.tyre.dragging = false;
  state.tyre.slideTimer = 0;
  state.tyre.bounceCount = 0;
  state.tyre.rimBounces = 0;
  state.tyre.rimCooldown = 0;
  state.tyre.restTimer = 0;
  state.tyre.laneTargetX = 0;
  state.tyre.launchPower = 0;
  state.tyre.rollTimer = 0;
  state.tyre.curveSpin = 0;
  state.tyre.scoreTarget = null;
  state.tyre.poseBlend = 0;
  state.tyre.idleAngle = THREE.MathUtils.lerp(-0.7, 0.7, Math.random());
  state.tyre.position.copy(getIdleTyrePosition());
  state.tyre.dragDepth = state.tyre.position.z;
  state.tyre.velocity.set(0, 0, 0);
  tyre.visible = true;
  state.striker.swing = 0;
  state.striker.cooldown = 0;
  state.striker.contact = 0;
  state.striker.hitOffset = 0;
  state.striker.recoil = 0;
  state.striker.grabOffset = 0;
  state.striker.lastPointerTime = 0;
  state.striker.lastTravel = 0;
  state.striker.pushSpeed = 0;
  state.striker.tipTarget.copy(getDefaultStickTip());
  state.striker.tipCurrent.copy(state.striker.tipTarget);
  state.starter.dragging = false;
  state.starter.pull = 0;
  state.starter.pullSpeed = 0;
  state.starter.maxPullSpeed = 0;
  state.starter.lastPull = 0;
  state.starter.lastPointerTime = 0;
  state.starter.failedKick = 0;
  state.starter.detached = false;
  state.starter.fallVelocity.set(0, 0, 0);
  state.starter.fallSpin = 0;
  state.message = "Yank the starter rope, then drag the tyre against the launch disc.";
  state.stickFlash = 0;
  state.smokeTime = 0;
  state.blackSmoke = 0;
  state.exhaustFlameBurst = 0;
  state.nextExhaustFlameBurst = 0.18;
  state.dustBurst = 0;
  state.justScored = false;
  state.audio.skidLevel = 0;
  state.audio.chugTimer = 0;
  state.audio.lastPhase = "idle";
  state.audio.smokeHitPlayed = false;
  if (!keepScore) {
    state.score = 0;
    state.wellHits = 0;
    state.spentTyres.length = 0;
    spentTyreGroup.clear();
    state.orphanTyres.length = 0;
    orphanTyreGroup.clear();
    state.tyreDisposals.forEach((effect) => scene.remove(effect.group));
    state.tyreDisposals.length = 0;
    state.birds.length = 0;
    birdGroup.clear();
    state.nextBirdTimer = 3.5;
    state.birdsHit = 0;
  }
  updateHud();
}

function setMessage(text) {
  state.message = text;
  message.textContent = text;
  message.classList.toggle("hidden", !text);
}

const debugStarterControls = [
  ["sleeveRadius", "debug-starter-radius"],
  ["sleeveInnerRadius", "debug-starter-inner"],
  ["anchorX", "debug-starter-x"],
  ["anchorY", "debug-starter-y"],
  ["anchorZ", "debug-starter-z"],
  ["sleeveSpan", "debug-starter-span"],
  ["ropeRadius", "debug-starter-rope"],
];

function getStarterTuning() {
  const base = state.starterTuning.base;
  const offset = state.starterTuning.offset;
  const sleeveRadius = THREE.MathUtils.clamp(base.sleeveRadius + offset.sleeveRadius, 0.24, 1.1);
  return {
    sleeveRadius,
    sleeveInnerRadius: THREE.MathUtils.clamp(base.sleeveInnerRadius + offset.sleeveInnerRadius, 0.05, sleeveRadius - 0.04),
    anchorX: base.anchorX + offset.anchorX,
    anchorY: base.anchorY + offset.anchorY,
    anchorZ: base.anchorZ + offset.anchorZ,
    sleeveSpan: THREE.MathUtils.clamp(base.sleeveSpan + offset.sleeveSpan, 0.2, 1.7),
    ropeRadius: THREE.MathUtils.clamp(base.ropeRadius + offset.ropeRadius, 0.015, 0.18),
  };
}

function updateDebugStarterReadout() {
  if (!debugStarterValues) {
    return;
  }
  const t = getStarterTuning();
  const o = state.starterTuning.offset;
  debugStarterValues.textContent =
    `offsets\n` +
    `radius: ${o.sleeveRadius.toFixed(3)}\n` +
    `inner: ${o.sleeveInnerRadius.toFixed(3)}\n` +
    `x/y/z: ${o.anchorX.toFixed(3)}, ${o.anchorY.toFixed(3)}, ${o.anchorZ.toFixed(3)}\n` +
    `span: ${o.sleeveSpan.toFixed(3)}\n` +
    `rope: ${o.ropeRadius.toFixed(3)}\n\n` +
    `actual\n` +
    `sleeveRadius: ${t.sleeveRadius.toFixed(3)}\n` +
    `sleeveInnerRadius: ${t.sleeveInnerRadius.toFixed(3)}\n` +
    `anchorX: ${t.anchorX.toFixed(3)}\n` +
    `anchorY: ${t.anchorY.toFixed(3)}\n` +
    `anchorZ: ${t.anchorZ.toFixed(3)}\n` +
    `sleeveSpan: ${t.sleeveSpan.toFixed(3)}\n` +
    `ropeRadius: ${t.ropeRadius.toFixed(3)}`;
}

function initDebugStarterControls() {
  for (const [key, id] of debugStarterControls) {
    const input = document.getElementById(id);
    if (!input) {
      continue;
    }
    input.value = state.starterTuning.offset[key];
    input.addEventListener("input", () => {
      state.starterTuning.offset[key] = Number(input.value);
      updateDebugStarterReadout();
    });
  }
  updateDebugStarterReadout();
}

function updateHud() {
  statusText.textContent =
    state.mode === "win"
      ? "Tyre dropped in the chimney"
      : state.mode === "miss"
        ? "Missed the chimney"
        : describeTyrePhase();
  engineText.textContent = state.engineStarting ? "Cranking" : state.engineStarted ? "Running" : "Off";
  throttleText.textContent = `${Math.round(state.throttle * 100)}%`;
  ladderText.textContent = `${state.ladderOffset >= 0 ? "+" : ""}${state.ladderOffset.toFixed(1)}m / pitch ${Math.round(THREE.MathUtils.radToDeg(state.ladderTilt))}deg / bank ${Math.round(THREE.MathUtils.radToDeg(state.ladderBank))}deg`;
  scoreText.textContent = `${state.score}`;
  fpsText.textContent = `FPS ${Math.round(state.perf.fps) || "--"}`;
  fpsText.classList.toggle("hidden", state.mode === "menu");
  setMessage(state.message);
  updateTouchControls();
}

function describeTyrePhase() {
  switch (state.tyre.phase) {
    case "idle":
      return "Waiting for tyre";
    case "mounted":
      return "Tyre pressed to disc";
    case "dragging":
      return "Dragging tyre";
    case "rolling":
      return "Rolling to ladder";
    case "doorApproach":
      return "Rolling to door";
    case "flying":
      return "Airborne";
    case "scored":
      return "Scored";
    case "missed":
      return "Lost";
    case "reloading":
      return "Loading next tyre";
    default:
      return "Machine ready";
  }
}

function setTouchElementVisible(element, visible) {
  if (!element) {
    return;
  }
  element.classList.toggle("hidden", !visible);
}

function updateTouchControls() {
  if (!touchControls) {
    return;
  }

  const touchLayout = touchLayoutQuery.matches;
  const inGame = state.mode !== "menu";
  const phase = state.tyre.phase;
  const ladderOrFlightPhase = phase === "rolling" || phase === "flying" || phase === "scored";
  const throttleActive = inGame && state.engineStarted && !ladderOrFlightPhase;
  const ladderActive = inGame && phase === "rolling";
  const pitchActive = ladderActive;
  const flightActive = inGame && phase === "flying";
  const controlsVisible = touchLayout && inGame;

  touchInput.throttleActive = throttleActive;
  touchInput.ladderActive = ladderActive;
  touchInput.pitchActive = pitchActive;

  touchControls.classList.toggle("hidden", !controlsVisible);
  touchControls.setAttribute("aria-hidden", controlsVisible ? "false" : "true");
  setTouchElementVisible(throttleControl, controlsVisible && throttleActive);
  setTouchElementVisible(ladderControl, controlsVisible && ladderActive);
  setTouchElementVisible(pitchControl, controlsVisible && pitchActive);
  setTouchElementVisible(flightStick, controlsVisible && flightActive);

  if (!flightActive) {
    releaseFlightStick();
  }

  if (touchStatusPhase && touchStatusValue) {
    touchStatusPhase.textContent = describeTyrePhase();
    if (throttleActive) {
      touchStatusValue.textContent = `${Math.round(state.throttle * 100)}%`;
    } else if (ladderActive) {
      touchStatusValue.textContent = `${state.ladderOffset >= 0 ? "+" : ""}${state.ladderOffset.toFixed(1)}m`;
    } else if (flightActive) {
      touchStatusValue.textContent = "Steer";
    } else {
      touchStatusValue.textContent = state.engineStarted ? "Running" : "Off";
    }
  }

  if (touchThrottle && !touchInput.throttleDragging) {
    touchThrottle.value = Math.round(state.throttle * 100);
  }
  if (touchLadder && !touchInput.ladderDragging) {
    touchLadder.value = Math.round((state.ladderOffset / LADDER_RANGE) * 100);
  }
  if (touchPitch && !touchInput.pitchDragging) {
    touchPitch.value = Math.round((state.ladderTilt / 0.38) * 100);
  }
}

function startGame() {
  ensureAudio();
  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  resetRound(false, "playing");
}

function mountTyre() {
  if (state.tyre.phase === "idle") {
    setMessage("Pick up the tyre and seat it by hand. One clean placement.");
  } else if (state.tyre.phase === "reloading") {
    setMessage("Wait for the next tyre to slide in.");
  }
}

function strikeTyre(source = "keyboard") {
  if (state.tyre.phase !== "mounted") {
    setMessage("Press the tyre against the launch disc first.");
    return;
  }
  const mounted = getMountedTyrePosition();
  const contactDistance = state.striker.tipCurrent.distanceTo(mounted);
  if (source === "mouse" && contactDistance > 1.18) {
    setMessage("Slide the stick into the tyre edge first.");
    state.striker.contact = 0.15;
    return;
  }
  const shoveOffset = source === "mouse"
    ? THREE.MathUtils.clamp((state.striker.tipCurrent.y - mounted.y) * 0.24 + (mounted.x - state.striker.tipCurrent.x) * 0.2, -0.42, 0.42)
    : 0;
  const stickStrength = source === "mouse" || source === "push"
    ? THREE.MathUtils.clamp(state.striker.pushSpeed / 5.2, 0, 1)
    : 0.45;
  const launchPower = THREE.MathUtils.clamp(state.flywheelSpin / 10.4, 0, 1.08);
  state.tyre.phase = "rolling";
  state.launchCount += 1;
  const laneNoise = Math.random() * 2 - 1;
  state.tyre.laneTargetX = THREE.MathUtils.clamp(laneNoise * (LADDER_RANGE - 0.28) + shoveOffset * 0.7 + (stickStrength - 0.5) * 0.28, -LADDER_RANGE, LADDER_RANGE);
  state.lastLaneTargetX = state.tyre.laneTargetX;
  state.lastLaunchLadderX = state.ladderOffset;
  state.lastLaunchPower = launchPower;
  state.tyre.driftX = -0.2 + stickStrength * 0.18 + shoveOffset * 0.16 + Math.sin(state.launchCount * 1.71 + 0.45) * 0.08;
  state.tyre.wobbleAmplitude = 0.18 + Math.abs(Math.cos(state.launchCount * 1.23)) * 0.2;
  state.tyre.wobblePhase = state.launchCount * 1.37;
  state.tyre.slideTimer = 0.22;
  state.tyre.rollTimer = 0;
  state.tyre.launchPower = launchPower;
  state.striker.hitOffset = shoveOffset;
  const dropX = mounted.x - 1.08;
  const dropZ = world.machineZ - 0.58;
  state.tyre.spinRate = Math.max(3.2, 5.0 + Math.pow(launchPower, 1.15) * 54);
  const launchGroundY = getRollingTyreGroundY(dropX, dropZ);
  state.tyre.position.set(dropX, launchGroundY + 0.12, dropZ);
  state.tyre.velocity.set(-2.75 - launchPower * 2.55, -2.8 - launchPower * 1.4, -1.65 - launchPower * 2.55);
  state.stickFlash = 1;
  state.striker.swing = 1;
  state.striker.recoil = Math.max(state.striker.recoil, 0.62);
  state.striker.tipTarget.addScaledVector(STICK_PUSH_AXIS, -0.28);
  state.striker.pushSpeed = 0;
  state.striker.cooldown = 0.35;
  state.dustBurst = 1;
  playSound("stick");
  playSound("launchSkid");
  setMessage(state.flywheelSpin < 2.8 ? "The stick knocked it off cold. It is crawling." : "Friction caught. The tyre picked a lane. Hunt it with the ladder.");
}

function getRollingGripSpeed(launchPower) {
  const power = THREE.MathUtils.clamp(launchPower, 0, 1.08);
  const lowPower = Math.min(power, 0.5);
  const lowSpeed = -0.85 - Math.pow(lowPower, 1.45) * 10.8;
  const highRamp = THREE.MathUtils.smoothstep(power, 0.5, 1.0);
  return lowSpeed - Math.pow(highRamp, 1.02) * 47.0;
}

function getLadderFlightVelocity(hitRatio, leanRatio, bankRatio, incomingVelocityX, launchPower) {
  const power = THREE.MathUtils.clamp(launchPower, 0, 1.08);
  const climbEnergy = Math.pow(power, 1.5);
  const overPower = Math.max(0, power - 0.96);
  const edgeWildness = THREE.MathUtils.smoothstep(Math.abs(hitRatio), 0.62, 1.0);
  const edgeSign = Math.sign(hitRatio || incomingVelocityX || 1);
  const pitchInfluence = leanRatio * (0.7 + power * 0.95);
  return new THREE.Vector3(
    -hitRatio * 1.8 + edgeSign * edgeWildness * (6.8 + power * 4.5) + bankRatio * 2.45 + pitchInfluence * 2.0 + incomingVelocityX * 0.012,
    15.2 + climbEnergy * 35.5 + pitchInfluence * 14.0 - Math.abs(hitRatio) * 4.0 - edgeWildness * 9.2 - Math.abs(bankRatio) * 1.15,
    -10.4 - Math.pow(power, 1.12) * 29.0 + pitchInfluence * 16.0 - Math.abs(hitRatio) * 0.55 - edgeWildness * (5.5 + power * 4.8) - overPower * 13.5
  );
}

function getLadderContactCenter(ladderOffset, ladderTilt, ladderBank, out = tempVec2) {
  const pitch = ladderTilt * 0.16;
  const bank = ladderBank * 0.72;
  const localY = LADDER_CONTACT_LOCAL_Y;
  const yAfterPitch = Math.cos(pitch) * localY;
  const zAfterPitch = Math.sin(pitch) * localY;
  out.set(
    ladderOffset - Math.sin(bank) * yAfterPitch,
    Math.cos(bank) * yAfterPitch,
    world.ladderZ + LADDER_CONTACT_Z_OFFSET + zAfterPitch
  );
  return out;
}

function getLadderContactAtPlane(previousPosition, currentPosition, ladderOffset, ladderTilt, ladderBank) {
  const center = getLadderContactCenter(ladderOffset, ladderTilt, ladderBank, tempVec2);
  const crossedLadderPlane =
    previousPosition.z >= center.z &&
    currentPosition.z <= center.z;
  if (!crossedLadderPlane) return null;
  const crossingT = THREE.MathUtils.clamp(
    (previousPosition.z - center.z) / Math.max(0.0001, previousPosition.z - currentPosition.z),
    0,
    1
  );
  const crossingX = THREE.MathUtils.lerp(previousPosition.x, currentPosition.x, crossingT);
  const hitOffset = crossingX - center.x;
  return { center, crossingX, hitOffset };
}

function getChimneyMouthCrossing(previousPosition, currentPosition) {
  return getChimneyMouthCrossingFor(previousPosition, currentPosition, state.tyre.velocity);
}

function getWellMouthCrossingFor(previousPosition, currentPosition, velocity) {
  const entryY = world.wellHeight + 0.2;
  const descendingThroughWell =
    velocity.y < -1.2 &&
    previousPosition.y >= entryY &&
    currentPosition.y <= entryY;

  if (!descendingThroughWell) {
    return { crossed: false, scored: false, position: currentPosition };
  }

  const t = THREE.MathUtils.clamp((previousPosition.y - entryY) / Math.max(0.0001, previousPosition.y - currentPosition.y), 0, 1);
  const crossingX = THREE.MathUtils.lerp(previousPosition.x, currentPosition.x, t);
  const crossingZ = THREE.MathUtils.lerp(previousPosition.z, currentPosition.z, t);
  const horizontalDistance = Math.hypot(crossingX - world.wellX, crossingZ - world.wellZ);
  return {
    crossed: true,
    scored: horizontalDistance < world.wellRadius,
    distance: horizontalDistance,
    position: new THREE.Vector3(crossingX, entryY, crossingZ),
  };
}

function isInWellAttemptCorridor(position) {
  return position.z < world.chimneyZ + 10 && position.z > world.wellZ - 70;
}

function isTyreTrulyOutOfPlay(position) {
  const pastWell = position.z < world.wellZ - 115;
  const tooWideBeforeWell = position.z < world.chimneyZ + 18 && Math.abs(position.x) > 78;
  const wildlyWideEarly = position.z >= world.chimneyZ + 18 && Math.abs(position.x) > 92;
  return pastWell || tooWideBeforeWell || wildlyWideEarly;
}

function getDoorCrossing(previousPosition, currentPosition) {
  if (
    currentPosition.z < world.ladderZ - 62 &&
    previousPosition.z > world.doorZ &&
    currentPosition.z <= world.doorZ
  ) {
    const t = THREE.MathUtils.clamp((previousPosition.z - world.doorZ) / Math.max(0.0001, previousPosition.z - currentPosition.z), 0, 1);
    const crossingX = THREE.MathUtils.lerp(previousPosition.x, currentPosition.x, t);
    if (Math.abs(crossingX - world.doorX) <= world.doorHalfWidth) {
      return new THREE.Vector3(crossingX, currentPosition.y, world.doorZ);
    }
  }
  return null;
}

function isDoorLane(position) {
  return Math.abs(position.x - world.doorX) <= world.doorHalfWidth + 1.25 && position.z > world.doorZ - 8;
}

function beginDoorApproach() {
  const tyreState = state.tyre;
  tyreState.phase = "doorApproach";
  tyreState.velocity.x = THREE.MathUtils.clamp((world.doorX - tyreState.position.x) * 1.8, -4.2, 4.2);
  tyreState.velocity.z = -28;
  tyreState.velocity.y = 0;
  tyreState.slideTimer = 0;
  tyreState.spinRate = Math.max(tyreState.spinRate, 20);
  setMessage("It missed the ladder and is knocking anyway.");
}

function explodeTyreAtDoor(doorHit) {
  state.tyre.position.copy(doorHit);
  state.tyre.position.y = groundHeightAt(doorHit.x, doorHit.z) + getVisualTyreOuterRadius() + 0.08;
  spawnTyreDisposalEffect(state.tyre.position, true);
  primeNextTyre();
  playSound("doorHit");
  playSound("tyrePop");
  setMessage("Knock knock. The door won.");
}

function getChimneyMouthCrossingFor(previousPosition, currentPosition, velocity) {
  const entryY = world.chimneyHeight + 0.25;

  const descendingThroughMouth =
    velocity.y < -1.4 &&
    previousPosition.y >= entryY &&
    currentPosition.y <= entryY;

  if (!descendingThroughMouth) {
    return { crossed: false, scored: false, position: currentPosition };
  }

  const t = THREE.MathUtils.clamp((previousPosition.y - entryY) / Math.max(0.0001, previousPosition.y - currentPosition.y), 0, 1);
  const crossingX = THREE.MathUtils.lerp(previousPosition.x, currentPosition.x, t);
  const crossingZ = THREE.MathUtils.lerp(previousPosition.z, currentPosition.z, t);
  const horizontalDistance = Math.hypot(crossingX - world.chimneyX, crossingZ - world.chimneyZ);
  const cleanCatchRadius = world.chimneyMouthRadius * 0.82;
  const rimMissRadius = world.chimneyRimRadius * 0.96;

  return {
    crossed: true,
    scored: horizontalDistance < cleanCatchRadius,
    rimMiss: horizontalDistance >= cleanCatchRadius && horizontalDistance < rimMissRadius,
    distance: horizontalDistance,
    position: new THREE.Vector3(crossingX, entryY, crossingZ),
  };
}

function missRound(reason, options = {}) {
  if (state.mode === "win" || state.mode === "miss") {
    return;
  }
  const beforeChimneyZone = state.tyre.position.z > world.chimneyZ + 7;
  const shouldArchive = options.archive !== false && beforeChimneyZone;
  if (options.dispose) {
    disposeFailedTyre();
  } else if (shouldArchive) {
    const visualGroundY = groundHeightAt(state.tyre.position.x, state.tyre.position.z) + getVisualTyreOuterRadius() + 0.05;
    state.tyre.position.y = Math.max(state.tyre.position.y, visualGroundY);
    leaveSpentTyre();
  }
  primeNextTyre();
  playSound("miss");
  setMessage(reason);
  updateHud();
}

function scoreRound(entryPosition = state.tyre.position) {
  const entryFallSpeed = Math.min(state.tyre.velocity.y, -9.2);
  const entrySpin = Math.max(state.tyre.spinRate, 28);
  state.mode = "win";
  state.tyre.phase = "scored";
  state.tyre.scoreTarget = "chimney";
  state.tyre.reloadTimer = 3.8;
  state.tyre.position.copy(entryPosition);
  state.tyre.velocity.set(state.tyre.velocity.x * 0.22, entryFallSpeed, state.tyre.velocity.z * 0.22);
  state.tyre.spinRate = entrySpin;
  state.score += 1;
  state.justScored = true;
  state.blackSmoke = 0;
  state.audio.smokeHitPlayed = false;
  playSound("chimney");
  setMessage("The tyre is visibly dropping into the chimney. Smoke builds after it enters.");
  updateHud();
}

function scoreWellRound(entryPosition = state.tyre.position) {
  const entryFallSpeed = Math.min(state.tyre.velocity.y, -8.4);
  state.mode = "win";
  state.tyre.phase = "scored";
  state.tyre.scoreTarget = "well";
  state.tyre.reloadTimer = 3.8;
  state.tyre.position.copy(entryPosition);
  state.tyre.velocity.set(state.tyre.velocity.x * 0.08, entryFallSpeed, state.tyre.velocity.z * 0.08);
  state.tyre.spinRate = Math.max(state.tyre.spinRate, 22);
  state.score += 1;
  state.wellHits += 1;
  state.justScored = true;
  playSound("well");
  setMessage("Swish. Easter egg: the tyre disappeared into the old well.");
  updateHud();
}

function bounceTyreOffChimneyRim(tyreState, mouthCrossing) {
  const rimCenter = tempVec2.set(world.chimneyX, mouthCrossing.position.y, world.chimneyZ);
  const radial = tempVec.copy(mouthCrossing.position).sub(rimCenter);
  radial.y = 0;
  if (radial.lengthSq() < 0.0001) {
    radial.set(Math.sign(tyreState.velocity.x || 1), 0, 0);
  }
  radial.normalize();
  const distance = mouthCrossing.distance || world.chimneyMouthRadius;
  const rimSpan = Math.max(0.001, world.chimneyRimRadius - world.chimneyMouthRadius);
  const rimDepth = THREE.MathUtils.clamp((distance - world.chimneyMouthRadius * 0.82) / rimSpan, 0, 1);
  const incomingRadialSpeed = tyreState.velocity.dot(radial);
  tyreState.position.copy(mouthCrossing.position).addScaledVector(radial, 0.18 + rimDepth * 0.24);
  tyreState.position.y += 0.18;
  tyreState.velocity.addScaledVector(radial, -(1.35 + rimDepth * 0.55) * incomingRadialSpeed);
  tyreState.velocity.addScaledVector(radial, (rimDepth - 0.42) * 3.1);
  tyreState.velocity.y = Math.max(3.6 + (1 - rimDepth) * 2.2, Math.abs(tyreState.velocity.y) * (0.34 + (1 - rimDepth) * 0.16));
  tyreState.velocity.z *= 0.62 + (1 - rimDepth) * 0.12;
  tyreState.spinRate = Math.max(tyreState.spinRate * 0.82, 18);
  tyreState.rimBounces = (tyreState.rimBounces || 0) + 1;
  tyreState.rimCooldown = 0.24;
  state.dustBurst = Math.max(state.dustBurst, 0.45);
  playSound("rim");
  setMessage(tyreState.rimBounces > 1 ? "It rattled around the chimney rim." : "Rim hit. It might still drop in.");
}

function beginEngineStart(strength = 1) {
  ensureAudio();
  if (state.engineStarted || state.engineStarting) {
    return;
  }
  state.engineStarting = true;
  state.startTimer = THREE.MathUtils.lerp(1.05, 0.62, THREE.MathUtils.clamp(strength, 0, 1));
  state.exhaustStartupBurst = 1.1 + strength * 0.75;
  state.exhaustFlameBurst = Math.max(state.exhaustFlameBurst, 0.55 + strength * 0.35);
  state.ropePull = Math.max(state.ropePull, state.starter.pull);
  playSound("starter");
  setMessage("Good yank. The old diesel is catching.");
}

function failStarterPull() {
  state.starter.failedKick = 1;
  state.exhaustStartupBurst = Math.max(state.exhaustStartupBurst, 0.32);
  state.exhaustFlameBurst = Math.max(state.exhaustFlameBurst, 0.18);
  playSound("starter");
  setMessage("Too slow. Yank the starter rope harder.");
}

function onKeyChange(code, pressed) {
  if (code === "ArrowLeft" || code === "KeyA") keys.left = pressed;
  if (code === "ArrowRight" || code === "KeyD") keys.right = pressed;
  if (code === "ArrowUp" || code === "KeyW") keys.up = pressed;
  if (code === "ArrowDown" || code === "KeyS") keys.down = pressed;
  if (code === "KeyQ") keys.bankLeft = pressed;
  if (code === "KeyE") keys.bankRight = pressed;
}

function handleKeyDown(event) {
  ensureAudio();
  if (event.repeat) {
    if (event.code.startsWith("Arrow")) {
      event.preventDefault();
    }
  }

  onKeyChange(event.code, true);

  switch (event.code) {
    case "Enter":
      if (state.mode === "menu") startGame();
      if (!state.engineStarted && !state.engineStarting) {
        setMessage("Grab the little starter rope on the flywheel and yank it.");
      }
      break;
    case "KeyT":
      mountTyre();
      break;
    case "KeyH":
    case "KeyB":
      strikeTyre();
      break;
    case "Space":
      skipCurrentShot();
      event.preventDefault();
      break;
    case "KeyR":
      resetRound(true);
      break;
    case "KeyF":
      toggleFullscreen();
      break;
    default:
      break;
  }
  updateHud();
}

function handleKeyUp(event) {
  onKeyChange(event.code, false);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

function groundHeightAt(x, z) {
  const duneRise = Math.max(0, 1.8 - Math.abs(x) * 0.06 - Math.max(0, -(z + 38)) * 0.18);
  const apronBlend = THREE.MathUtils.clamp(1 - Math.hypot(x * 0.18, (z - world.machineZ) * 0.24), 0, 1);
  const laneBlend = THREE.MathUtils.clamp(1 - Math.hypot(x * 0.22, (z + 3) * 0.045), 0, 1);
  const base = duneRise * (1 - apronBlend * 0.92 - laneBlend * 0.32);
  return Math.max(0.02, base + Math.sin(x * 0.22) * 0.04 + Math.cos(z * 0.14) * 0.04);
}

function supportHeightAt(x, z) {
  let supportY = groundHeightAt(x, z);
  if (boardSupportBox) {
    const withinX = x >= boardSupportBox.min.x - 0.15 && x <= boardSupportBox.max.x + 0.15;
    const frontBoardCenterZ = boardSupportBox.min.z + (boardSupportBox.max.z - boardSupportBox.min.z) * 0.22;
    const rearBoardCenterZ = boardSupportBox.min.z + (boardSupportBox.max.z - boardSupportBox.min.z) * 0.78;
    const boardHalfWidth = Math.max(0.28, (boardSupportBox.max.z - boardSupportBox.min.z) * 0.15);
    const onBoardStrip =
      Math.abs(z - frontBoardCenterZ) <= boardHalfWidth ||
      Math.abs(z - rearBoardCenterZ) <= boardHalfWidth;
    if (withinX && onBoardStrip) {
      supportY = Math.max(supportY, boardSupportBox.max.y);
    }
  }
  return supportY;
}

function getTyreStretchAmount() {
  const spinForStretch =
    state.tyre.phase === "mounted"
      ? state.flywheelSpin
      : state.tyre.phase === "rolling" || state.tyre.phase === "flying" || state.tyre.phase === "scored" || state.tyre.phase === "missed"
        ? state.tyre.spinRate * 0.42
        : 0;
  return THREE.MathUtils.clamp(spinForStretch / 8.8, 0, 1);
}

function getTyreRadiusScale() {
  return 1 + getTyreStretchAmount() * 0.18;
}

function getVisualTyreOuterRadius() {
  return (TYRE_MODEL_SCALE * 0.5) * Math.max(1, getTyreRadiusScale());
}

function getRollingTyreRideHeight() {
  return getVisualTyreOuterRadius() * 0.94;
}

function getTyrePoseRotation(poseBlend, idleAngle = state.tyre.idleAngle) {
  const blend = THREE.MathUtils.clamp(poseBlend || 0, 0, 1);
  tempEuler.set(
    THREE.MathUtils.lerp(Math.PI / 2, 0, blend),
    THREE.MathUtils.lerp(0, Math.PI / 2, blend),
    THREE.MathUtils.lerp(idleAngle || 0, 0, blend)
  );
  return tempQuat.setFromEuler(tempEuler);
}

function getTyrePoseBottomOffset(poseBlend, idleAngle = state.tyre.idleAngle, scaleMultiplier = 1) {
  if (!tyre.geometry || !tyre.geometry.attributes?.position) {
    return -IDLE_TYRE_HALF_THICKNESS;
  }
  if (!tyre.geometry.boundingBox) {
    tyre.geometry.computeBoundingBox();
  }
  const box = tyre.geometry.boundingBox;
  const rotation = getTyrePoseRotation(poseBlend, idleAngle);
  let minY = Infinity;
  for (let xi = 0; xi < 2; xi++) {
    for (let yi = 0; yi < 2; yi++) {
      for (let zi = 0; zi < 2; zi++) {
        tempCorner.set(
          xi ? box.max.x : box.min.x,
          yi ? box.max.y : box.min.y,
          zi ? box.max.z : box.min.z
        );
        tempCorner.multiplyScalar(TYRE_MODEL_SCALE * scaleMultiplier).applyQuaternion(rotation);
        minY = Math.min(minY, tempCorner.y);
      }
    }
  }
  return Number.isFinite(minY) ? minY : -IDLE_TYRE_HALF_THICKNESS;
}

function getTyreRestY(x, z, poseBlend, clearance = 0.025, scaleMultiplier = 1) {
  return supportHeightAt(x, z) - getTyrePoseBottomOffset(poseBlend, state.tyre.idleAngle, scaleMultiplier) + clearance;
}

function getDragTyreRideHeight(poseBlend) {
  return -getTyrePoseBottomOffset(poseBlend);
}

function getRollingTyreGroundY(x, z) {
  const radiusScale = Math.max(1, getTyreRadiusScale());
  return getTyreRestY(x, z, 1, -0.035, radiusScale);
}

function getSpindleLift() {
  return 0;
}

function getSpindleLocalY() {
  return SPINDLE_BASE_Y + getSpindleLift();
}

function getIdleTyrePosition() {
  const { x, z } = getIdleTyreSpawn();
  return new THREE.Vector3(x, getTyreRestY(x, z, 0, -0.07), z);
}

function getIdleTyreSpawn() {
  if (touchLayoutQuery.matches) {
    return {
      x: MOBILE_IDLE_TYRE_SPAWN_X,
      z: MOBILE_IDLE_TYRE_SPAWN_Z,
    };
  }
  return {
    x: IDLE_TYRE_SPAWN_X,
    z: IDLE_TYRE_SPAWN_Z,
  };
}

function getMountedTyrePosition() {
  return machineGroup.localToWorld(new THREE.Vector3(TYRE_CONTACT_X, getSpindleLocalY(), 0.67));
}

function getTyreMountFit(position = state.tyre.position) {
  const mounted = getMountedTyrePosition();
  const dx = position.x - mounted.x;
  const dy = position.y - mounted.y;
  const dz = position.z - mounted.z;
  const score = Math.sqrt(
    Math.pow(dx / TYRE_MOUNT_WINDOW_X, 2) +
    Math.pow(dy / TYRE_MOUNT_WINDOW_Y, 2) +
    Math.pow(dz / TYRE_MOUNT_WINDOW_Z, 2)
  );
  return { fits: score <= 1, score, dx, dy, dz, mounted };
}

function isInTyreMountFunnel(fit = getTyreMountFit()) {
  return (
    Math.abs(fit.dx) <= TYRE_MOUNT_FUNNEL_X &&
    Math.abs(fit.dy) <= TYRE_MOUNT_FUNNEL_Y &&
    Math.abs(fit.dz) <= TYRE_MOUNT_FUNNEL_Z
  );
}

function seatTyreOnDisc() {
  const mounted = getMountedTyrePosition();
  state.tyre.phase = "mounted";
  state.tyre.dragging = false;
  state.tyre.poseBlend = 1;
  state.tyre.position.copy(mounted);
  state.tyre.dragDepth = mounted.z;
  state.tyre.velocity.set(0, 0, 0);
  playSound("mount");
  setMessage(state.engineStarted ? "Tyre pressed against the launch disc. Build revs with W." : "Tyre seated. Yank the starter rope to start the engine.");
}

function tyreTouchesSpinningDisc(fit = getTyreMountFit()) {
  return (
    state.flywheelSpin >= TYRE_MOUNT_REJECT_MIN_SPIN &&
    !fit.fits &&
    fit.dx >= TYRE_SPINNING_DISC_REJECT_PLANE_X &&
    Math.abs(fit.dy) <= TYRE_SPINNING_DISC_CONTACT_Y &&
    Math.abs(fit.dz) <= TYRE_SPINNING_DISC_CONTACT_Z
  );
}

function getDefaultStickTip() {
  return getStickRailStart();
}

function getStickRailStart() {
  const mounted = getMountedTyrePosition();
  return mounted.add(new THREE.Vector3(1.15, 2.52, 0.03));
}

function getStickHandlePosition(tip) {
  return tip.clone().addScaledVector(STICK_PUSH_AXIS, -STICK_LENGTH);
}

function getStickGrabInfo(event) {
  mouseNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouseNdc, camera);
  const intersection = raycaster.intersectObject(stickHitbox, false)[0];
  const hit = intersection?.point || pointerToWorldOnZ(event, state.striker.tipCurrent.z, tempVec2);
  if (!hit) {
    return { hit: null, along: STICK_LENGTH, distance: Infinity };
  }
  const handle = getStickHandlePosition(state.striker.tipCurrent);
  const toHit = tempVec.copy(hit).sub(handle);
  const along = THREE.MathUtils.clamp(toHit.dot(STICK_PUSH_AXIS), 0, STICK_LENGTH);
  const closest = handle.addScaledVector(STICK_PUSH_AXIS, along);
  const distance = closest.distanceTo(hit);
  return { hit, along, distance: intersection ? 0 : distance };
}

function pointerToWorldOnZ(event, z, out = tempVec2) {
  mouseNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouseNdc, camera);
  stickPlane.constant = -z;
  return raycaster.ray.intersectPlane(stickPlane, out);
}

function getEngineOrbitTarget() {
  return machineGroup.localToWorld(tempVec2.set(0, 1.85, 0.15));
}

function beginOrbitCamera(event) {
  orbitCamera.active = true;
  orbitCamera.lastX = event.clientX;
  orbitCamera.lastY = event.clientY;
  orbitCamera.target.copy(getEngineOrbitTarget());
  const offset = tempVec.copy(camera.position).sub(orbitCamera.target);
  orbitCamera.radius = THREE.MathUtils.clamp(offset.length(), 6.5, 19);
  orbitCamera.yaw = Math.atan2(offset.x, offset.z);
  orbitCamera.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(offset.y / orbitCamera.radius, -0.72, 0.72)), 0.12, 0.92);
}

function updateOrbitCameraFromPointer(event) {
  const dx = event.clientX - orbitCamera.lastX;
  const dy = event.clientY - orbitCamera.lastY;
  orbitCamera.lastX = event.clientX;
  orbitCamera.lastY = event.clientY;
  orbitCamera.yaw -= dx * 0.006;
  orbitCamera.pitch = THREE.MathUtils.clamp(orbitCamera.pitch - dy * 0.0045, 0.12, 0.92);
}

function updateStickTargetFromPointer(event) {
  const mounted = getMountedTyrePosition();
  const hit = pointerToWorldOnZ(event, mounted.z, tempVec2);
  if (!hit) {
    return;
  }
  state.striker.mouseActive = true;
  const railStart = getStickRailStart();
  const previousTravel = state.striker.lastTravel;
  const now = event.timeStamp || performance.now();
  const hasPointerHistory = state.striker.lastPointerTime > 0;
  const elapsed = hasPointerHistory ? Math.max(0.016, (now - state.striker.lastPointerTime) / 1000) : 0.016;
  const travel = THREE.MathUtils.clamp(hit.clone().sub(railStart).dot(STICK_PUSH_AXIS) + state.striker.grabOffset, 0, 2.45);
  const forwardSpeed = hasPointerHistory ? Math.max(0, (travel - previousTravel) / elapsed) : 0;
  state.striker.pushSpeed = THREE.MathUtils.damp(state.striker.pushSpeed, forwardSpeed, forwardSpeed > state.striker.pushSpeed ? 12 : 4, 1 / 60);
  state.striker.lastPointerTime = now;
  state.striker.lastTravel = travel;
  state.striker.tipTarget.copy(railStart).addScaledVector(STICK_PUSH_AXIS, travel);
  state.striker.tipTarget.z = mounted.z;
}

function updateTyreDragFromPointer(event) {
  const mounted = getMountedTyrePosition();
  const dragDepth = state.tyre.dragDepth || state.tyre.position.z;
  const hit = pointerToWorldOnZ(event, dragDepth, tempVec2);
  if (!hit) {
    return false;
  }
  const x = THREE.MathUtils.clamp(hit.x, TYRE_DRAG_MIN_X, TYRE_DRAG_MAX_X);
  const idleSpawn = getIdleTyreSpawn();
  const progress = THREE.MathUtils.smoothstep(
    THREE.MathUtils.clamp((x - idleSpawn.x) / (mounted.x - idleSpawn.x), 0, 1),
    0.22,
    0.95
  );
  const z = THREE.MathUtils.lerp(idleSpawn.z, mounted.z, progress);
  state.tyre.dragDepth = z;
  const minY = getTyreRestY(x, z, state.tyre.poseBlend || 0, 0.08);
  state.tyre.position.set(
    x,
    THREE.MathUtils.clamp(hit.y, minY, mounted.y + 0.9),
    z
  );
  const fit = getTyreMountFit();
  if (tyreTouchesSpinningDisc(fit)) {
    rejectTyreMount(fit);
    return false;
  }
  state.tyre.velocity.set(0, 0, 0);
  return true;
}

function handlePointerMove(event) {
  if (orbitCamera.active) {
    updateOrbitCameraFromPointer(event);
    return;
  }
  if (state.tyre.dragging) {
    updateTyreDragFromPointer(event);
    return;
  }
  if (state.starter.dragging) {
    updateStarterDragFromPointer(event);
    return;
  }
  if (state.striker.mouseDown && state.striker.mouseActive) {
    updateStickTargetFromPointer(event);
  }
}

function handlePointerDown(event) {
  if (event.button === 2) {
    beginOrbitCamera(event);
    event.preventDefault();
    return;
  }
  if (event.button !== 0) {
    return;
  }
  ensureAudio();
  state.striker.mouseDown = true;
  state.striker.mouseActive = false;
  if (state.mode === "menu") {
    startGame();
    return;
  }
  if (!state.engineStarted && !state.engineStarting && pointerHitsStarter(event)) {
    state.starter.dragging = true;
    state.starter.maxPullSpeed = 0;
    state.starter.pullSpeed = 0;
    state.starter.lastPointerTime = 0;
    state.starter.lastPull = state.starter.pull;
    updateStarterDragFromPointer(event);
    setMessage("Yank the starter rope hard.");
    return;
  }
  const stickGrab = getStickGrabInfo(event);
  if ((stickGrab && stickGrab.distance < 1.85) || state.tyre.phase === "mounted") {
    state.striker.grabOffset = stickGrab && stickGrab.distance < 1.85 ? STICK_LENGTH - stickGrab.along : 0;
    state.striker.mouseActive = true;
    state.striker.lastPointerTime = 0;
    state.striker.lastTravel = 0;
    state.striker.pushSpeed = 0;
    updateStickTargetFromPointer(event);
    if (state.tyre.phase !== "mounted") {
      setMessage("Move the stick into position. Drag the tyre against the disc when ready.");
    }
    return;
  }
  if (state.tyre.phase === "idle") {
    const hit = pointerToWorldOnZ(event, state.tyre.position.z, tempVec2);
    if (hit && hit.distanceTo(state.tyre.position) < TYRE_OUTER_RADIUS + 0.65) {
      state.tyre.phase = "dragging";
      state.tyre.dragging = true;
      state.tyre.dragDepth = state.tyre.position.z;
      updateTyreDragFromPointer(event);
      setMessage("Drag the tyre against the spinning steel disc.");
      return;
    }
  }
  if (!state.engineStarted && !state.engineStarting) {
    setMessage("Grab the little starter rope on the flywheel and yank it.");
    return;
  }
}

function handlePointerUp(event) {
  if (event.button === 2) {
    orbitCamera.active = false;
    event.preventDefault();
    return;
  }
  if (event.button === 0) {
    state.striker.mouseDown = false;
    state.striker.mouseActive = false;
    if (state.starter.dragging) {
      finishStarterPull();
      return;
    }
    if (state.tyre.dragging) {
      state.tyre.dragging = false;
      const fit = getTyreMountFit();
      if (fit.fits) {
        seatTyreOnDisc();
      } else {
        if (state.flywheelSpin < TYRE_MOUNT_REJECT_MIN_SPIN) {
          state.tyre.phase = "idle";
          state.tyre.poseBlend = 0;
          state.tyre.velocity.set(0, 0, 0);
          state.tyre.dragDepth = state.tyre.position.z;
          setMessage("Drop it closer to the launch disc.");
        } else if (!tyreTouchesSpinningDisc(fit)) {
          dropUnseatedTyre();
        } else {
          rejectTyreMount(fit);
        }
      }
    }
  }
}

function setMeshBetween(mesh, start, end) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(0.001, delta.length());
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  if (mesh === stick) {
    mesh.scale.set(STICK_MODEL_THICKNESS_SCALE, length, STICK_MODEL_THICKNESS_SCALE);
  } else {
    mesh.scale.set(1, length, 1);
  }
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

function setCylinderBetween(mesh, start, end, radiusX = 1, radiusZ = 1) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(0.001, delta.length());
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.scale.set(radiusX, length, radiusZ);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

function getStarterAnchorPosition() {
  const tuning = getStarterTuning();
  return machineGroup.localToWorld(new THREE.Vector3(TYRE_CONTACT_X + tuning.anchorX, getSpindleLocalY() + tuning.anchorY, tuning.anchorZ));
}

function getStarterRestHandlePosition() {
  return getStarterAnchorPosition().add(new THREE.Vector3(-0.18, -1.26, 0.02));
}

function getStarterPullDirection() {
  return new THREE.Vector3(-0.24, -0.97, 0.02).normalize();
}

function getStarterHandlePosition() {
  return getStarterRestHandlePosition().addScaledVector(getStarterPullDirection(), state.starter.pull);
}

function pointerHitsStarter(event) {
  const handle = getStarterHandlePosition();
  const hit = pointerToWorldOnZ(event, handle.z, tempVec2);
  return Boolean(hit && hit.distanceTo(handle) < 0.72);
}

function updateStarterDragFromPointer(event) {
  const rest = getStarterRestHandlePosition();
  const pullDirection = getStarterPullDirection();
  const hit = pointerToWorldOnZ(event, rest.z, tempVec2);
  if (!hit) {
    return false;
  }
  const previousPull = state.starter.pull;
  const now = event.timeStamp || performance.now();
  const hasHistory = state.starter.lastPointerTime > 0;
  const elapsed = hasHistory ? Math.max(0.016, (now - state.starter.lastPointerTime) / 1000) : 0.016;
  const pull = THREE.MathUtils.clamp(hit.clone().sub(rest).dot(pullDirection), 0, STARTER_PULL_MAX_DISTANCE);
  state.starter.pull = pull;
  state.starter.pullSpeed = Math.max(0, (pull - previousPull) / elapsed);
  state.starter.maxPullSpeed = Math.max(state.starter.maxPullSpeed, state.starter.pullSpeed);
  state.starter.lastPull = pull;
  state.starter.lastPointerTime = now;
  state.ropePull = Math.max(state.ropePull, pull * 0.42);
  return true;
}

function finishStarterPull() {
  const pull = state.starter.pull;
  const speed = state.starter.maxPullSpeed;
  const releasePosition = getStarterHandlePosition();
  state.starter.dragging = false;
  state.starter.lastPointerTime = 0;
  state.starter.lastPull = 0;
  state.starter.pullSpeed = 0;
  state.starter.maxPullSpeed = 0;
  if (state.engineStarted || state.engineStarting) {
    return;
  }
  const distanceOk = pull >= STARTER_PULL_MIN_DISTANCE;
  const speedOk = speed >= STARTER_PULL_MIN_SPEED;
  if (distanceOk && speedOk) {
    const strength = THREE.MathUtils.clamp((speed - STARTER_PULL_MIN_SPEED) / 6.8 + (pull - STARTER_PULL_MIN_DISTANCE) / 2.2, 0.25, 1);
    state.starter.detached = true;
    starterGroup.position.copy(releasePosition);
    starterSleeve.position.sub(releasePosition);
    starterRope.position.sub(releasePosition);
    starterHandle.position.sub(releasePosition);
    state.starter.fallVelocity.set(-1.1 - strength * 1.6, -0.9, 0.2 + Math.random() * 0.35);
    state.starter.fallSpin = 7 + strength * 10;
    beginEngineStart(strength);
  } else {
    failStarterPull();
  }
}

function updateStarterRope(dt) {
  if (state.starter.detached) {
    state.starter.fallVelocity.y -= 9.8 * dt;
    starterGroup.position.addScaledVector(state.starter.fallVelocity, dt);
    starterGroup.rotation.z += state.starter.fallSpin * dt;
    starterGroup.rotation.x += state.starter.fallSpin * 0.38 * dt;
    const groundY = groundHeightAt(starterGroup.position.x, starterGroup.position.z) + 0.02;
    if (starterGroup.position.y < groundY - 0.85) {
      starterGroup.visible = false;
    }
    return;
  }
  starterGroup.position.set(0, 0, 0);
  starterGroup.rotation.set(0, 0, 0);
  if (!state.starter.dragging) {
    state.starter.pull = damping(state.starter.pull, 0, 9.5, dt);
  }
  state.starter.failedKick = Math.max(0, state.starter.failedKick - dt * 3.2);
  const anchor = getStarterAnchorPosition();
  const restHandle = getStarterRestHandlePosition();
  const handle = getStarterHandlePosition();
  const tuning = getStarterTuning();
  const ropeStart = anchor.clone().add(new THREE.Vector3(-0.06, -tuning.sleeveRadius * 0.82, 0.0));
  if (state.starter.pull <= 0.04) {
    starterGroup.position.set(0, 0, 0);
  }
  const pullRatio = THREE.MathUtils.clamp(state.starter.pull / STARTER_PULL_MAX_DISTANCE, 0, 1);
  const kick = state.engineStarting ? Math.sin(state.startTimer * 40) * 0.03 : state.starter.failedKick * Math.sin(state.smokeTime * 42) * 0.08;
  const innerRatio = tuning.sleeveInnerRadius / tuning.sleeveRadius;
  if (
    Math.abs((starterSleeve.userData.innerRatio ?? -1) - innerRatio) > 0.004 ||
    Math.abs((starterSleeve.userData.span ?? -1) - tuning.sleeveSpan) > 0.004
  ) {
    starterSleeve.geometry.dispose();
    starterSleeve.geometry = createSleeveTubeGeometry(STARTER_SLEEVE_RADIUS, STARTER_SLEEVE_RADIUS * innerRatio, tuning.sleeveSpan);
    starterSleeve.userData.innerRatio = innerRatio;
    starterSleeve.userData.span = tuning.sleeveSpan;
  }
  const sleeveScale = tuning.sleeveRadius / STARTER_SLEEVE_RADIUS;
  const ropeScale = tuning.ropeRadius / STARTER_ROPE_RADIUS;
  starterSleeve.position.copy(anchor);
  starterSleeve.quaternion.identity();
  starterSleeve.scale.set(sleeveScale * (1 + pullRatio * 0.18), sleeveScale * (1 - pullRatio * 0.1), sleeveScale);
  setCylinderBetween(starterRope, ropeStart, handle, ropeScale * (1.12 + pullRatio * 0.16), ropeScale * (0.86 - pullRatio * 0.08));
  starterHandle.position.copy(handle);
  starterHandle.position.x += kick;
  starterHandle.rotation.z = Math.PI / 2 + pullRatio * 0.25;
  starterHandle.rotation.x = Math.PI / 2;
  starterGroup.visible = state.gameplayModelsLoaded;
}

function leaveSpentTyre() {
  const spent = new THREE.Group();
  const carcass = new THREE.Mesh(tyre.geometry, tyreMaterial);
  carcass.castShadow = true;
  carcass.receiveShadow = true;
  carcass.rotation.copy(tyre.rotation);
  carcass.scale.copy(tyre.scale);
  spent.add(carcass);

  const inner = new THREE.Mesh(
    tyreInnerShadow.geometry,
    new THREE.MeshBasicMaterial({ color: 0x070707, transparent: true, opacity: 0.28 })
  );
  inner.rotation.y = Math.PI / 2;
  inner.scale.copy(tyreInnerShadow.scale);
  carcass.add(inner);

  spent.position.copy(state.tyre.position);
  spent.rotation.z = THREE.MathUtils.clamp(state.tyre.velocity.x * 0.09, -0.35, 0.35);
  spentTyreGroup.add(spent);
  state.spentTyres.push(spent);
}

function disposeFailedTyre() {
  const explode = Math.random() < 0.5;
  spawnTyreDisposalEffect(state.tyre.position, explode);
}

function dropUnseatedTyre() {
  disposeFailedTyre();
  primeNextTyre();
  setMessage("Missed the slot. Fresh tyre ready.");
}

function spawnTyreDisposalEffect(position, explode = true) {
  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10),
    tyreDisposalSmokeMaterial.clone()
  );
  smoke.position.y = 0.2;
  group.add(smoke);

  const effect = {
    type: explode ? "explode" : "sink",
    life: 0,
    group,
    smoke,
    startY: position.y,
    pieces: [],
  };

  if (explode) {
    for (let i = 0; i < 7; i++) {
      const piece = new THREE.Mesh(tyreChunkGeometry, tyreChunkMaterial);
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      piece.position.set(Math.cos(angle) * 0.18, Math.random() * 0.35, Math.sin(angle) * 0.18);
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      piece.castShadow = true;
      piece.receiveShadow = true;
      group.add(piece);
      effect.pieces.push({
        mesh: piece,
        velocity: new THREE.Vector3(Math.cos(angle) * (2.8 + Math.random() * 2.8), 3.2 + Math.random() * 2.6, Math.sin(angle) * (2.8 + Math.random() * 2.8)),
        spin: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4),
      });
    }
    playSound("tyrePop");
    state.dustBurst = Math.max(state.dustBurst, 1);
  } else {
    const carcass = createLooseTyreMesh(tyre);
    carcass.position.set(0, 0, 0);
    group.add(carcass);
    effect.carcass = carcass;
    playSound("sandSink");
    state.dustBurst = Math.max(state.dustBurst, 0.75);
  }

  state.tyreDisposals.push(effect);
}

function rejectTyreMount(fit = getTyreMountFit()) {
  const sourcePosition = state.tyre.position.clone();
  const mesh = createLooseTyreMesh(tyre);
  mesh.position.copy(sourcePosition);
  orphanTyreGroup.add(mesh);

  const spinPower = THREE.MathUtils.clamp((state.flywheelSpin - TYRE_MOUNT_REJECT_MIN_SPIN) / (10.4 - TYRE_MOUNT_REJECT_MIN_SPIN), 0, 1);
  const wham = Math.pow(spinPower, 1.55);
  const missSeverity = THREE.MathUtils.clamp(fit.score - 0.65, 0.45, 3.2);
  const sideSign = Math.sign(fit.dx || (Math.random() - 0.5)) || 1;
  const behindSign = Math.random() < THREE.MathUtils.lerp(0.18, 0.48, wham) ? 1 : -1;
  const verticalKick =
    THREE.MathUtils.lerp(1.8, 13.0, wham) +
    missSeverity * THREE.MathUtils.lerp(0.65, 4.6, wham) +
    Math.random() * THREE.MathUtils.lerp(0.8, 8.5, wham);
  const sideKick = sideSign * (
    THREE.MathUtils.lerp(1.8, 13.5, wham) +
    missSeverity * THREE.MathUtils.lerp(0.7, 5.6, wham) +
    Math.random() * THREE.MathUtils.lerp(0.8, 7.5, wham)
  );
  const depthKick = behindSign * (
    THREE.MathUtils.lerp(1.5, 12.0, wham) +
    missSeverity * THREE.MathUtils.lerp(0.55, 6.6, wham) +
    Math.random() * THREE.MathUtils.lerp(0.8, 7.0, wham)
  );

  state.orphanTyres.push({
    mesh,
    phase: "mountReject",
    position: sourcePosition,
    velocity: new THREE.Vector3(sideKick, verticalKick, depthKick),
    spinRate: THREE.MathUtils.lerp(7, 38, wham) + missSeverity * THREE.MathUtils.lerp(2, 14, wham) + Math.random() * THREE.MathUtils.lerp(2, 18, wham),
    bounceCount: 0,
    life: 0,
  });

  state.tyre.dragging = false;
  state.striker.mouseDown = false;
  state.striker.mouseActive = false;
  playSound("miss");
  state.dustBurst = Math.max(state.dustBurst, THREE.MathUtils.lerp(0.35, 1.25, wham));
  primeNextTyre();
  setMessage(wham > 0.72 ? "Bad seat. WHAM." : "Bad seat. The spinning disc kicked it out.");
}

function createLooseTyreMesh(sourceMesh = tyre) {
  const loose = new THREE.Group();
  const carcass = new THREE.Mesh(tyre.geometry, tyreMaterial);
  carcass.castShadow = true;
  carcass.receiveShadow = true;
  carcass.rotation.copy(sourceMesh.rotation);
  carcass.scale.copy(sourceMesh.scale);
  loose.add(carcass);

  const inner = new THREE.Mesh(
    tyreInnerShadow.geometry,
    new THREE.MeshBasicMaterial({ color: 0x070707, transparent: true, opacity: 0.26 })
  );
  inner.rotation.y = Math.PI / 2;
  carcass.add(inner);
  return loose;
}

function handOffActiveTyre() {
  const tyreState = state.tyre;
  if (!(tyreState.phase === "rolling" || tyreState.phase === "flying" || tyreState.phase === "scored")) {
    return false;
  }
  if (tyreState.phase === "scored" && !tyre.visible) {
    return false;
  }

  const mesh = createLooseTyreMesh(tyre);
  mesh.position.copy(tyreState.position);
  orphanTyreGroup.add(mesh);
  state.orphanTyres.push({
    mesh,
    phase: tyreState.phase,
    position: tyreState.position.clone(),
    velocity: tyreState.velocity.clone(),
    spinRate: tyreState.spinRate,
    slideTimer: tyreState.slideTimer,
    driftX: tyreState.driftX,
    wobbleAmplitude: tyreState.wobbleAmplitude,
    wobblePhase: tyreState.wobblePhase,
    laneTargetX: tyreState.laneTargetX,
    launchPower: tyreState.launchPower,
    rollTimer: tyreState.rollTimer,
    airborneTime: tyreState.airborneTime,
    scoreTarget: tyreState.scoreTarget,
    ladderOffset: state.ladderOffset,
    ladderTilt: state.ladderTilt,
    ladderBank: state.ladderBank,
    life: 0,
  });
  return true;
}

function skipCurrentShot() {
  const handedOff = handOffActiveTyre();
  primeNextTyre();
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  cameraTarget.copy(DEFAULT_CAMERA_TARGET);
  desiredCameraPosition.copy(camera.position);
  desiredCameraTarget.copy(cameraTarget);
  setMessage(handedOff ? "Shot skipped. Fresh tyre ready while the old one keeps going." : "Fresh tyre ready.");
}

function primeNextTyre() {
  state.mode = "playing";
  state.tyre.phase = "idle";
  state.tyre.dragging = false;
  state.tyre.reloadTimer = 0;
  state.tyre.velocity.set(0, 0, 0);
  state.tyre.spinRate = 0;
  state.tyre.airborneTime = 0;
  state.tyre.driftX = 0;
  state.tyre.wobbleAmplitude = 0;
  state.tyre.wobblePhase = 0;
  state.tyre.slideTimer = 0;
  state.tyre.bounceCount = 0;
  state.tyre.rimBounces = 0;
  state.tyre.rimCooldown = 0;
  state.tyre.restTimer = 0;
  state.tyre.laneTargetX = 0;
  state.tyre.launchPower = 0;
  state.tyre.rollTimer = 0;
  state.tyre.curveSpin = 0;
  state.tyre.scoreTarget = null;
  state.tyre.poseBlend = 0;
  state.tyre.idleAngle = THREE.MathUtils.lerp(-0.7, 0.7, Math.random());
  state.tyre.position.copy(getIdleTyrePosition());
  state.tyre.dragDepth = state.tyre.position.z;
  tyre.visible = true;
  setMessage(state.engineStarted ? "Fresh tyre ready. Old misses stay in the yard." : "Yank the starter rope, then drag the tyre against the launch disc.");
}

function updateMachine(dt) {
  if (state.engineStarting) {
    state.startTimer = Math.max(0, state.startTimer - dt);
    const progress = 1 - state.startTimer / 1.05;
    state.crankAngle -= dt * (10.5 + (1 - progress) * 4.5);
    state.ropePull = damping(state.ropePull, 0.35, 4.8, dt);
    if (state.startTimer === 0) {
      state.engineStarting = false;
      state.engineStarted = true;
      state.ropePull = 0;
      playSound("engineCatch");
      setMessage("Engine running. Drag the tyre against the steel launch disc.");
    }
  } else {
    state.ropePull = damping(state.ropePull, 0, 7, dt);
    state.crankAngle -= state.flywheelSpin * 0.12 * dt;
  }

  const targetSpin = state.engineStarted ? 1.35 + state.throttle * 9.45 : state.engineStarting ? 1.35 : 0;
  state.flywheelSpin = damping(state.flywheelSpin, targetSpin, 5, dt);
  const shake = state.engineStarted ? Math.min(1, state.flywheelSpin / 6) : 0;
  machineGroup.position.set(
    MACHINE_X + Math.sin(state.smokeTime * 24) * 0.018 * shake,
    machinePadY + PLATFORM_BASE_Y + BOARD_LIFT + MACHINE_BOARD_CLEARANCE + Math.cos(state.smokeTime * 19) * 0.012 * shake,
    world.machineZ + Math.sin(state.smokeTime * 17) * 0.014 * shake
  );
  const boardShake = shake * 0.28;
  boardGroup.position.set(
    MACHINE_X + Math.sin(state.smokeTime * 11.6 + 1.8) * 0.006 * boardShake,
    machinePadY + PLATFORM_BASE_Y + BOARD_LIFT - Math.abs(Math.sin(state.smokeTime * 9.4 + 0.7)) * 0.005 * boardShake,
    world.machineZ + Math.sin(state.smokeTime * 8.7 + 2.3) * 0.005 * boardShake
  );
  refreshBoardSupportBox();
  if (flywheelModelPivot) {
    flywheelModelPivot.rotation.x -= state.flywheelSpin * dt;
  }
  updateStarterRope(dt);

  if (state.tyre.phase === "mounted") {
    state.tyre.spinRate = state.flywheelSpin * 7.8;
    state.tyre.position.copy(getMountedTyrePosition());
    state.tyre.position.z += Math.sin(state.smokeTime * 14) * 0.02;
    state.tyre.position.y += Math.cos(state.smokeTime * 18) * 0.02;
    if (state.flywheelSpin > 3.2) {
      setMessage("Tyre is biting on the launch disc. Shove it off with the stick.");
    }
  }

  state.stickFlash = Math.max(0, state.stickFlash - dt * 3.2);
  state.striker.swing = Math.max(0, state.striker.swing - dt * 5.2);
  state.striker.cooldown = Math.max(0, state.striker.cooldown - dt);
  state.smokeTime += dt * (state.engineStarted ? 1.2 + state.throttle * 2 : 0.15);
  state.blackSmoke = Math.max(0, state.blackSmoke - dt * 0.22);
  state.dustBurst = Math.max(0, state.dustBurst - dt * 1.9);
}

function updateLadder(dt) {
  const slideSpeed = 7.8;
  const leanSpeed = 0.72;
  const bankSpeed = 0.86;
  const tyreAirborne = state.tyre.phase === "flying" || state.tyre.phase === "scored";
  const ladderPitchLive = state.tyre.phase === "rolling";
  if (!tyreAirborne && keys.left) state.ladderOffset = Math.max(-LADDER_RANGE, state.ladderOffset - slideSpeed * dt);
  if (!tyreAirborne && keys.right) state.ladderOffset = Math.min(LADDER_RANGE, state.ladderOffset + slideSpeed * dt);
  if (ladderPitchLive && keys.up) state.ladderTilt = Math.min(0.38, state.ladderTilt + leanSpeed * dt);
  if (ladderPitchLive && keys.down) state.ladderTilt = Math.max(-0.38, state.ladderTilt - leanSpeed * dt);
  if (!tyreAirborne && keys.bankLeft) state.ladderBank = Math.max(-0.46, state.ladderBank - bankSpeed * dt);
  if (!tyreAirborne && keys.bankRight) state.ladderBank = Math.min(0.46, state.ladderBank + bankSpeed * dt);
  if (!ladderPitchLive) state.ladderTilt = damping(state.ladderTilt, 0, 2.8, dt);

  ladderGroup.position.set(state.ladderOffset, 0, world.ladderZ);
  ladderGroup.rotation.x = state.ladderTilt * 0.16;
  ladderGroup.rotation.z = state.ladderBank * 0.72;
  ladderShadow.position.set(state.ladderOffset, 0.02, world.ladderZ);
  ladderShadow.rotation.z = state.ladderBank * 0.72;
  ladderShadow.scale.setScalar(1.28 + Math.abs(state.ladderBank) * 0.25);
}

function updateTyreVisualShape(dt) {
  const radiusScale = getTyreRadiusScale();
  const stretch = getTyreStretchAmount();
  let visualRadiusScale = radiusScale;
  let axleThicknessScale = 1 - stretch * 0.18;
  tyre.scale.x = damping(tyre.scale.x, TYRE_MODEL_SCALE * visualRadiusScale, 10, dt);
  tyre.scale.y = damping(tyre.scale.y, TYRE_MODEL_SCALE * visualRadiusScale, 10, dt);
  tyre.scale.z = damping(tyre.scale.z, TYRE_MODEL_SCALE * axleThicknessScale, 10, dt);
}

function updateTyreContactShadow() {
  const phase = state.tyre.phase;
  const grounded = phase === "idle" || phase === "dragging" || phase === "rolling" || phase === "doorApproach" || phase === "mounted";
  tyre.castShadow = !grounded;
  tyreContactShadow.visible = tyre.visible && grounded;
  if (!tyreContactShadow.visible) {
    tyreContactShadow.material.opacity = 0;
    return;
  }
  const supportY = supportHeightAt(state.tyre.position.x, state.tyre.position.z);
  tyreContactShadow.position.set(state.tyre.position.x, supportY + 0.018, state.tyre.position.z);
  if (phase === "idle") {
    tyreContactShadow.scale.set(1.75, 1.0, 1);
    tyreContactShadow.material.opacity = 0.22;
  } else if (phase === "rolling") {
    tyreContactShadow.scale.set(0.42, 0.82, 1);
    tyreContactShadow.material.opacity = 0.2;
  } else {
    tyreContactShadow.scale.set(0.55, 0.7, 1);
    tyreContactShadow.material.opacity = 0.13;
  }
}

function updateTyre(dt) {
  const tyreState = state.tyre;

  if (tyreState.phase === "rolling") {
    tyreState.rollTimer += dt;
    const previousPosition = tempVec.copy(tyreState.position);
    const launchPower = THREE.MathUtils.clamp(tyreState.launchPower, 0, 1.08);
    if (tyreState.slideTimer > 0) {
      tyreState.slideTimer = Math.max(0, tyreState.slideTimer - dt);
      const sideSlipTarget = -2.3 - launchPower * 3.0 + tyreState.driftX * 0.25;
      tyreState.velocity.x = THREE.MathUtils.damp(tyreState.velocity.x, sideSlipTarget, 4.2, dt);
      tyreState.velocity.z = THREE.MathUtils.damp(tyreState.velocity.z, -1.6 - launchPower * 2.7, 3.5, dt);
      tyreState.velocity.y -= 24 * dt;
      tyreState.spinRate = damping(tyreState.spinRate, 5.0 + Math.pow(launchPower, 1.15) * 54, 3.8, dt);
    } else {
      const gripSpeed = getRollingGripSpeed(launchPower);
      tyreState.velocity.z = THREE.MathUtils.damp(tyreState.velocity.z, gripSpeed, 4.6, dt);
      const lanePull = THREE.MathUtils.clamp((tyreState.laneTargetX - tyreState.position.x) * 1.05, -4.2, 4.2);
      const wobbleTarget =
        lanePull * THREE.MathUtils.clamp(launchPower * 1.35, 0.08, 1) +
        tyreState.driftX +
        Math.sin(tyreState.wobblePhase + Math.abs(tyreState.position.z - world.ladderZ) * 0.34) * tyreState.wobbleAmplitude;
      tyreState.velocity.x = THREE.MathUtils.damp(tyreState.velocity.x, wobbleTarget, 4.6, dt);
      tyreState.spinRate = Math.max(2.4, Math.abs(tyreState.velocity.z) * (0.8 + launchPower * 0.42));
    }
    tyreState.position.addScaledVector(tyreState.velocity, dt);
    const groundY = getRollingTyreGroundY(tyreState.position.x, tyreState.position.z);
    if (tyreState.position.y > groundY + 0.025) {
      tyreState.velocity.y -= 16.5 * dt;
    }
    if (tyreState.slideTimer > 0 || tyreState.position.y > groundY + 0.025) {
      if (tyreState.position.y <= groundY) {
        tyreState.position.y = groundY;
        tyreState.velocity.y = 0;
        tyreState.slideTimer = 0;
        tyreState.velocity.z = Math.min(tyreState.velocity.z, getRollingGripSpeed(launchPower) * 0.72);
        state.dustBurst = 1;
      }
    } else {
      tyreState.position.y = groundY;
      tyreState.velocity.y = 0;
    }

    if (
      launchPower < 0.18 &&
      tyreState.rollTimer > 1.45 &&
      tyreState.position.z > world.ladderZ + 12
    ) {
      tyreState.velocity.multiplyScalar(0.15);
      missRound("Too little spin. The sand dealt with that tyre.", { dispose: true });
      return;
    }
    const ladderCatchWidth = LADDER_CONTACT_HALF_WIDTH;
    const ladderContact = getLadderContactAtPlane(previousPosition, tyreState.position, state.ladderOffset, state.ladderTilt, state.ladderBank);
    const doorHit = getDoorCrossing(previousPosition, tyreState.position);
    if (ladderContact && Math.abs(ladderContact.hitOffset) <= ladderCatchWidth) {
      const hitOffset = THREE.MathUtils.clamp(ladderContact.hitOffset, -ladderCatchWidth, ladderCatchWidth);
      const hitRatio = hitOffset / ladderCatchWidth;
      const leanRatio = THREE.MathUtils.clamp(state.ladderTilt / 0.38, -1, 1);
      const bankRatio = THREE.MathUtils.clamp(state.ladderBank / 0.46, -1, 1);
      tyreState.phase = "flying";
      tyreState.airborneTime = 0;
      tyreState.velocity.copy(getLadderFlightVelocity(hitRatio, leanRatio, bankRatio, tyreState.velocity.x, launchPower));
      tyreState.position.z = ladderContact.center.z;
      tyreState.position.x = ladderContact.crossingX;
      tyreState.position.y = groundHeightAt(ladderContact.crossingX, ladderContact.center.z) + getVisualTyreOuterRadius() + 1.45;
      tyreState.spinRate += 6;
      playSound("ladder");
      setMessage(Math.abs(hitRatio) < 0.14 ? "Clean center hit. Watch the chimney." : Math.abs(hitRatio) > 0.72 ? "Edge hit. Wild bounce." : "Off-center ladder hit. The arc is drifting.");
    } else if (doorHit) {
      explodeTyreAtDoor(doorHit);
    } else if (tyreState.position.z < world.ladderZ - 5 && isDoorLane(tyreState.position)) {
      beginDoorApproach();
    } else if (tyreState.position.z < world.ladderZ - 5) {
      missRound("The tyre skipped past the ladder. Fresh tyre ready.");
    }
  } else if (tyreState.phase === "doorApproach") {
    const previousPosition = tempVec.copy(tyreState.position);
    tyreState.velocity.x = damping(tyreState.velocity.x, THREE.MathUtils.clamp((world.doorX - tyreState.position.x) * 1.6, -5.5, 5.5), 2.8, dt);
    tyreState.velocity.z = damping(tyreState.velocity.z, -30, 2.2, dt);
    tyreState.position.addScaledVector(tyreState.velocity, dt);
    tyreState.position.y = getRollingTyreGroundY(tyreState.position.x, tyreState.position.z);
    tyreState.spinRate = Math.max(20, Math.abs(tyreState.velocity.z) * 0.85);
    const doorHit = getDoorCrossing(previousPosition, tyreState.position);
    if (doorHit) {
      explodeTyreAtDoor(doorHit);
    } else if (tyreState.position.z < world.doorZ - 10) {
      missRound("It missed the door too. Fresh tyre ready.", { archive: false });
    }
  } else if (tyreState.phase === "flying") {
    tyreState.airborneTime += dt;
    tyreState.rimCooldown = Math.max(0, (tyreState.rimCooldown || 0) - dt);
    const previousPosition = tempVec.copy(tyreState.position);
    applyAirSteering(tyreState, dt);
    tyreState.velocity.y -= 14.6 * dt;
    tyreState.position.addScaledVector(tyreState.velocity, dt);

    const mouthCrossing = tyreState.rimCooldown > 0
      ? { crossed: false, scored: false, rimMiss: false, position: tyreState.position }
      : getChimneyMouthCrossing(previousPosition, tyreState.position);
    const wellCrossing = getWellMouthCrossingFor(previousPosition, tyreState.position, tyreState.velocity);
    if (mouthCrossing.scored) {
      scoreRound(mouthCrossing.position);
    } else if (wellCrossing.scored) {
      scoreWellRound(wellCrossing.position);
    } else if (mouthCrossing.rimMiss) {
      if ((tyreState.rimBounces || 0) < 3) {
        bounceTyreOffChimneyRim(tyreState, mouthCrossing);
      } else {
        missRound("It rattled off the chimney rim. Fresh tyre ready.", { archive: false });
      }
    } else if (
      tyreState.airborneTime > 0.45 &&
      tyreState.velocity.y < -1.4 &&
      tyreState.position.y <= groundHeightAt(tyreState.position.x, tyreState.position.z) + getVisualTyreOuterRadius() + 0.2
    ) {
      const wellCorridor = isInWellAttemptCorridor(tyreState.position);
      tyreState.position.y = groundHeightAt(tyreState.position.x, tyreState.position.z) + getVisualTyreOuterRadius() + 0.22;
      if (wellCorridor && (tyreState.bounceCount || 0) < 9) {
        tyreState.bounceCount = (tyreState.bounceCount || 0) + 1;
        const skipLift = Math.max(3.2, 7.4 - tyreState.bounceCount * 0.42);
        tyreState.velocity.y = Math.max(skipLift, Math.abs(tyreState.velocity.y) * 0.46);
        tyreState.velocity.x *= 0.92;
        tyreState.velocity.z *= 0.88;
        tyreState.spinRate = Math.max(tyreState.spinRate, 18);
        state.dustBurst = Math.max(state.dustBurst, 0.8);
        setMessage("It skipped off the yard. Keep steering for the well.");
      } else {
        tyreState.velocity.y = Math.max(3.4, Math.abs(tyreState.velocity.y) * 0.38);
        tyreState.velocity.x *= 0.8;
        tyreState.velocity.z *= 0.68;
        missRound("Close, but it crashed back to the yard. Fresh tyre ready.");
      }
    } else if (isTyreTrulyOutOfPlay(tyreState.position)) {
      missRound("That arc missed the chimney line. Fresh tyre ready.", { archive: false });
    }
  } else if (tyreState.phase === "scored") {
    const isWellScore = tyreState.scoreTarget === "well";
    tyreState.velocity.y = damping(tyreState.velocity.y, isWellScore ? -8.8 : -10.4, 1.8, dt);
    tyreState.position.y = Math.max((isWellScore ? world.wellHeight : world.chimneyHeight) - 3.6, tyreState.position.y + tyreState.velocity.y * dt);
    tyreState.spinRate = damping(tyreState.spinRate, 24, 0.45, dt);
    if (!isWellScore) {
      const enteredLip = THREE.MathUtils.clamp((world.chimneyHeight + 1.25 - tyreState.position.y) / 3.2, 0, 1);
      state.blackSmoke = Math.max(state.blackSmoke, enteredLip * 1.25);
    }
  }

  if (tyreState.phase === "idle") {
    tyreState.position.copy(getIdleTyrePosition());
    tyreState.dragDepth = tyreState.position.z;
    tyreState.poseBlend = 0;
  } else if (tyreState.phase === "dragging") {
    tyreState.spinRate = 0;
    tyreState.poseBlend = damping(tyreState.poseBlend || 0, 1, 5.8, dt);
    const minDragY = getTyreRestY(tyreState.position.x, tyreState.position.z, tyreState.poseBlend, 0.08);
    tyreState.position.y = Math.max(tyreState.position.y, minDragY);
  } else if (tyreState.phase === "scored") {
    tyreState.reloadTimer = Math.max(0, tyreState.reloadTimer - dt);
    if (tyreState.reloadTimer === 0) {
      tyreState.phase = "reloading";
      primeNextTyre();
    }
  }

  tyre.position.copy(tyreState.position);
  if (tyreState.phase === "idle" || tyreState.phase === "dragging") {
    const poseBlend = tyreState.phase === "idle" ? 0 : THREE.MathUtils.clamp(tyreState.poseBlend || 0, 0, 1);
    tyre.rotation.set(
      THREE.MathUtils.lerp(Math.PI / 2, 0, poseBlend),
      THREE.MathUtils.lerp(0, Math.PI / 2, poseBlend),
      THREE.MathUtils.lerp(tyreState.idleAngle, 0, poseBlend)
    );
  } else {
    tyreState.poseBlend = 1;
    tyre.rotation.y = Math.PI / 2;
    tyre.rotation.z =
      tyreState.phase === "flying"
        ? THREE.MathUtils.clamp(-(tyreState.curveSpin || 0) * 0.24 - tyreState.velocity.x * 0.025, -0.52, 0.52)
        : 0;
    tyre.rotation.x -= tyreState.spinRate * dt;
  }
  const scoredHideY = tyreState.scoreTarget === "well" ? world.wellHeight + 0.22 : world.chimneyHeight + 0.28;
  tyre.visible = state.gameplayModelsLoaded && (tyreState.phase !== "scored" || tyreState.position.y > scoredHideY);
  updateTyreVisualShape(dt);
  updateTyreContactShadow();
}

function applyAirSteering(tyreState, dt) {
  const steerRamp = THREE.MathUtils.clamp(tyreState.airborneTime / 0.32, 0, 1);
  const power = THREE.MathUtils.clamp(tyreState.launchPower || state.lastLaunchPower || 0.7, 0.45, 1.08);
  const sideInput = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const pitchInput = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  tyreState.curveSpin = damping(tyreState.curveSpin || 0, sideInput * (1.45 + power * 1.05), sideInput ? 6.2 : 1.35, dt);
  if (sideInput !== 0) {
    tyreState.velocity.x += sideInput * (4.2 + power * 2.4) * steerRamp * dt;
    tyreState.velocity.x = THREE.MathUtils.clamp(tyreState.velocity.x, -16.5, 16.5);
    tyreState.velocity.y += -sideInput * (2.9 + power * 1.25) * steerRamp * dt;
    tyreState.velocity.z += -Math.abs(sideInput) * (0.62 + power * 0.48) * steerRamp * dt;
  }
  if (pitchInput > 0) {
    tyreState.velocity.y += (3.9 + power * 1.8) * steerRamp * dt;
    tyreState.velocity.z += (1.35 + power * 0.8) * steerRamp * dt;
  } else if (pitchInput < 0) {
    const brake = (9.5 + power * 4.5) * steerRamp * dt;
    tyreState.velocity.z = Math.min(-3.8, tyreState.velocity.z + brake);
    tyreState.velocity.y -= (1.4 + power * 0.8) * steerRamp * dt;
  }
  tyreState.velocity.x += (tyreState.curveSpin || 0) * (1.75 + power * 1.05) * steerRamp * dt;
  tyreState.velocity.y += -(tyreState.curveSpin || 0) * (0.95 + power * 0.52) * steerRamp * dt;
  if (sideInput || pitchInput) {
    tyreState.spinRate += (Math.abs(sideInput) * 0.95 + Math.abs(pitchInput) * 0.55) * steerRamp;
  }
}

function updateLooseTyrePhysics(projectile, dt) {
  projectile.life += dt;

  if (projectile.phase === "mountReject") {
    projectile.velocity.y -= 16.8 * dt;
    projectile.velocity.x = damping(projectile.velocity.x, 0, 0.42, dt);
    projectile.velocity.z = damping(projectile.velocity.z, 0, 0.36, dt);
    projectile.position.addScaledVector(projectile.velocity, dt);
    const visualRadius = TYRE_OUTER_RADIUS * Math.max(1, projectile.mesh.children[0].scale.x);
    const groundY = groundHeightAt(projectile.position.x, projectile.position.z) + visualRadius + 0.08;
    if (projectile.position.y <= groundY) {
      projectile.position.y = groundY;
      if ((projectile.bounceCount || 0) < 2 && Math.abs(projectile.velocity.y) > 3.5) {
        projectile.bounceCount = (projectile.bounceCount || 0) + 1;
        projectile.velocity.y = Math.abs(projectile.velocity.y) * (0.36 - projectile.bounceCount * 0.07);
        projectile.velocity.x *= 0.56;
        projectile.velocity.z *= 0.54;
        projectile.spinRate *= 0.72;
        playSound("miss");
      } else if (projectile.life > 0.85) {
        projectile.phase = "dead";
      }
    }
  } else if (projectile.phase === "rolling") {
    projectile.rollTimer = (projectile.rollTimer || 0) + dt;
    const launchPower = THREE.MathUtils.clamp(projectile.launchPower || 0, 0, 1.08);
    if (projectile.slideTimer > 0) {
      projectile.slideTimer = Math.max(0, projectile.slideTimer - dt);
      const sideSlipTarget = (0.12 + launchPower * 0.14) + projectile.driftX * 0.35;
      projectile.velocity.x = THREE.MathUtils.damp(projectile.velocity.x, sideSlipTarget, 3.4, dt);
      projectile.velocity.z = THREE.MathUtils.damp(projectile.velocity.z, -0.8 - launchPower * 1.5, 3.2, dt);
    } else {
      const gripSpeed = getRollingGripSpeed(launchPower);
      projectile.velocity.z = THREE.MathUtils.damp(projectile.velocity.z, gripSpeed, 3.1, dt);
      const lanePull = THREE.MathUtils.clamp((projectile.laneTargetX - projectile.position.x) * 1.05, -4.2, 4.2);
      const wobbleTarget =
        lanePull * THREE.MathUtils.clamp(launchPower * 1.35, 0.08, 1) +
        projectile.driftX +
        Math.sin(projectile.wobblePhase + Math.abs(projectile.position.z - world.ladderZ) * 0.34) * projectile.wobbleAmplitude;
      projectile.velocity.x = THREE.MathUtils.damp(projectile.velocity.x, wobbleTarget, 4.6, dt);
    }
    const previousPosition = tempVec2.copy(projectile.position);
    projectile.position.addScaledVector(projectile.velocity, dt);
    const visualRadius = TYRE_OUTER_RADIUS * Math.max(1, projectile.mesh.children[0].scale.x);
    projectile.position.y = groundHeightAt(projectile.position.x, projectile.position.z) + visualRadius + 0.18;
    projectile.spinRate = Math.max(5, Math.abs(projectile.velocity.z) * 0.9);

    if (
      launchPower < 0.18 &&
      projectile.rollTimer > 1.45 &&
      projectile.position.z > world.ladderZ + 12
    ) {
      projectile.phase = "dead";
    }

    const ladderCatchWidth = LADDER_CONTACT_HALF_WIDTH;
    const ladderContact = getLadderContactAtPlane(previousPosition, projectile.position, projectile.ladderOffset, projectile.ladderTilt, projectile.ladderBank);
    if (ladderContact && Math.abs(ladderContact.hitOffset) <= ladderCatchWidth) {
      const hitOffset = THREE.MathUtils.clamp(ladderContact.hitOffset, -ladderCatchWidth, ladderCatchWidth);
      const hitRatio = hitOffset / ladderCatchWidth;
      const leanRatio = THREE.MathUtils.clamp(projectile.ladderTilt / 0.38, -1, 1);
      const bankRatio = THREE.MathUtils.clamp(projectile.ladderBank / 0.46, -1, 1);
      projectile.phase = "flying";
      projectile.airborneTime = 0;
      projectile.velocity.copy(getLadderFlightVelocity(hitRatio, leanRatio, bankRatio, projectile.velocity.x, launchPower));
      projectile.position.z = ladderContact.center.z;
      projectile.position.x = ladderContact.crossingX;
      projectile.position.y = groundHeightAt(ladderContact.crossingX, ladderContact.center.z) + visualRadius + 1.45;
      projectile.spinRate += 6;
      playSound("ladder");
    } else if (projectile.position.z < world.ladderZ - 5) {
      projectile.phase = "dead";
    }
  } else if (projectile.phase === "flying") {
    projectile.airborneTime += dt;
    projectile.rimCooldown = Math.max(0, (projectile.rimCooldown || 0) - dt);
    const previousPosition = tempVec.copy(projectile.position);
    projectile.velocity.y -= 14.6 * dt;
    projectile.position.addScaledVector(projectile.velocity, dt);
    const mouthCrossing = projectile.rimCooldown > 0
      ? { crossed: false, scored: false, rimMiss: false, position: projectile.position }
      : getChimneyMouthCrossingFor(previousPosition, projectile.position, projectile.velocity);
    const wellCrossing = getWellMouthCrossingFor(previousPosition, projectile.position, projectile.velocity);
    if (mouthCrossing.scored) {
      state.score += 1;
      state.blackSmoke = Math.max(state.blackSmoke, 1.15);
      projectile.phase = "scored";
      projectile.scoreTarget = "chimney";
      projectile.position.copy(mouthCrossing.position);
      projectile.velocity.y = Math.min(projectile.velocity.y, -9.2);
      playSound("chimney");
    } else if (wellCrossing.scored) {
      state.score += 1;
      state.wellHits += 1;
      projectile.phase = "scored";
      projectile.scoreTarget = "well";
      projectile.position.copy(wellCrossing.position);
      projectile.velocity.y = Math.min(projectile.velocity.y, -8.4);
      playSound("well");
    } else if (mouthCrossing.rimMiss) {
      if ((projectile.rimBounces || 0) < 3) {
        bounceTyreOffChimneyRim(projectile, mouthCrossing);
      } else {
        projectile.phase = "dead";
      }
    } else if (isTyreTrulyOutOfPlay(projectile.position)) {
      projectile.phase = "dead";
    } else if (projectile.position.y <= groundHeightAt(projectile.position.x, projectile.position.z) + TYRE_OUTER_RADIUS + 0.26) {
      projectile.phase = "dead";
    }
  } else if (projectile.phase === "scored") {
    const isWellScore = projectile.scoreTarget === "well";
    projectile.velocity.y = damping(projectile.velocity.y, isWellScore ? -8.8 : -10.4, 1.8, dt);
    projectile.position.y = Math.max((isWellScore ? world.wellHeight : world.chimneyHeight) - 3.6, projectile.position.y + projectile.velocity.y * dt);
    projectile.spinRate = damping(projectile.spinRate, 24, 0.45, dt);
    if (projectile.position.y <= (isWellScore ? world.wellHeight + 0.22 : world.chimneyHeight + 0.28)) {
      projectile.phase = "dead";
    }
  }

  projectile.mesh.position.copy(projectile.position);
  projectile.mesh.children[0].rotation.x -= projectile.spinRate * dt;
  return projectile.phase !== "dead" && projectile.life < 12;
}

function updateOrphanTyres(dt) {
  for (let i = state.orphanTyres.length - 1; i >= 0; i--) {
    const projectile = state.orphanTyres[i];
    if (!updateLooseTyrePhysics(projectile, dt)) {
      orphanTyreGroup.remove(projectile.mesh);
      state.orphanTyres.splice(i, 1);
    }
  }
}

function createBirdMesh() {
  const bird = new THREE.Group();
  const body = new THREE.Mesh(birdBodyGeometry, birdBodyMaterial);
  body.scale.set(1.35, 0.55, 0.5);
  body.castShadow = true;
  bird.add(body);

  const leftWing = new THREE.Mesh(birdWingGeometry, birdWingMaterial);
  const rightWing = new THREE.Mesh(birdWingGeometry, birdWingMaterial);
  leftWing.position.set(-0.32, 0.04, 0);
  rightWing.position.set(0.32, 0.04, 0);
  leftWing.castShadow = true;
  rightWing.castShadow = true;
  bird.add(leftWing, rightWing);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0xb88028, roughness: 0.8 })
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.3, 0, 0);
  bird.add(beak);

  return { bird, leftWing, rightWing };
}

function spawnBird() {
  const direction = Math.random() < 0.5 ? 1 : -1;
  const { bird, leftWing, rightWing } = createBirdMesh();
  const z = THREE.MathUtils.lerp(-18, -44, Math.random());
  const y = THREE.MathUtils.lerp(7.2, 15.5, Math.random());
  const x = direction > 0 ? -17 : 17;
  bird.position.set(x, y, z);
  bird.rotation.y = direction > 0 ? 0 : Math.PI;
  birdGroup.add(bird);
  state.birds.push({
    mesh: bird,
    leftWing,
    rightWing,
    phase: "flying",
    position: bird.position.clone(),
    velocity: new THREE.Vector3(direction * THREE.MathUtils.lerp(3.0, 5.6, Math.random()), Math.random() * 0.3 - 0.1, Math.random() * 0.45 - 0.2),
    flapPhase: Math.random() * Math.PI * 2,
    life: 0,
  });
}

function projectileHitsBird(bird, position, velocity, radius) {
  const distance = bird.position.distanceTo(position);
  if (distance > radius + 0.58) {
    return false;
  }
  bird.phase = "falling";
  bird.velocity.set(
    velocity.x * 0.34 + (Math.random() - 0.5) * 1.2,
    Math.min(-1.4, velocity.y * 0.18 - 1.6),
    velocity.z * 0.2
  );
  bird.mesh.rotation.x += 0.55;
  state.birdsHit += 1;
  state.dustBurst = Math.max(state.dustBurst, 0.55);
  playSound("stick");
  setMessage("Bird clipped. It is tumbling down.");
  return true;
}

function updateBirdCollisions(bird) {
  if (bird.phase !== "flying") {
    return;
  }

  if (
    (state.tyre.phase === "rolling" || state.tyre.phase === "flying" || state.tyre.phase === "scored") &&
    tyre.visible &&
    projectileHitsBird(bird, state.tyre.position, state.tyre.velocity, getVisualTyreOuterRadius())
  ) {
    return;
  }

  for (const projectile of state.orphanTyres) {
    if (projectile.phase === "dead") {
      continue;
    }
    const carcass = projectile.mesh.children[0];
    const projectileRadius = TYRE_OUTER_RADIUS * Math.max(1, carcass?.scale.x || 1);
    if (projectileHitsBird(bird, projectile.position, projectile.velocity, projectileRadius)) {
      return;
    }
  }
}

function updateBirds(dt) {
  if (state.mode !== "menu") {
    state.nextBirdTimer -= dt;
    if (state.nextBirdTimer <= 0) {
      spawnBird();
      state.nextBirdTimer = THREE.MathUtils.lerp(5.5, 11.5, Math.random());
    }
  }

  for (let i = state.birds.length - 1; i >= 0; i--) {
    const bird = state.birds[i];
    bird.life += dt;
    bird.flapPhase += dt * (bird.phase === "flying" ? 12 : 5);

    if (bird.phase === "flying") {
      bird.position.addScaledVector(bird.velocity, dt);
      bird.position.y += Math.sin(bird.flapPhase * 0.7) * dt * 0.35;
      updateBirdCollisions(bird);
    } else {
      bird.velocity.y -= 8.8 * dt;
      bird.velocity.x *= 0.992;
      bird.velocity.z *= 0.992;
      bird.position.addScaledVector(bird.velocity, dt);
      bird.mesh.rotation.x += dt * 4.4;
      bird.mesh.rotation.z += dt * 2.2;
    }

    const wingAngle = Math.sin(bird.flapPhase) * (bird.phase === "flying" ? 0.72 : 0.28);
    bird.leftWing.rotation.z = wingAngle;
    bird.rightWing.rotation.z = -wingAngle;
    bird.mesh.position.copy(bird.position);

    const offWorld =
      bird.life > 22 ||
      bird.position.y < -0.8 ||
      Math.abs(bird.position.x) > 22 ||
      bird.position.z > 12 ||
      bird.position.z < world.chimneyZ - 12;
    if (offWorld) {
      birdGroup.remove(bird.mesh);
      state.birds.splice(i, 1);
    }
  }
}

function updateTyreDisposals(dt) {
  for (let i = state.tyreDisposals.length - 1; i >= 0; i--) {
    const effect = state.tyreDisposals[i];
    effect.life += dt;
    const t = effect.life;
    if (effect.type === "sink") {
      const sink = THREE.MathUtils.clamp(t / 0.72, 0, 1);
      const squash = 1 - sink * 0.28;
      effect.carcass.position.y = -sink * 2.8;
      effect.carcass.scale.set(1 + sink * 0.18, squash, 1 + sink * 0.18);
      effect.carcass.rotation.y += dt * 2.4;
      effect.smoke.position.y = 0.15 + sink * 0.45;
      effect.smoke.scale.setScalar(0.35 + sink * 2.0);
      effect.smoke.material.opacity = Math.max(0, 0.34 * (1 - Math.abs(t - 0.45) / 0.55));
    } else {
      effect.pieces.forEach((piece) => {
        piece.velocity.y -= 9.8 * dt;
        piece.mesh.position.addScaledVector(piece.velocity, dt);
        piece.mesh.rotation.x += piece.spin.x * dt;
        piece.mesh.rotation.y += piece.spin.y * dt;
        piece.mesh.rotation.z += piece.spin.z * dt;
        const localGround = groundHeightAt(effect.group.position.x + piece.mesh.position.x, effect.group.position.z + piece.mesh.position.z) - effect.group.position.y;
        if (piece.mesh.position.y < localGround + 0.08) {
          piece.mesh.position.y = localGround + 0.08;
          piece.velocity.multiplyScalar(0.42);
          piece.velocity.y = Math.abs(piece.velocity.y) * 0.18;
        }
      });
      const fade = THREE.MathUtils.clamp(1 - t / 1.2, 0, 1);
      effect.smoke.scale.setScalar(0.7 + t * 2.6);
      effect.smoke.material.opacity = fade * 0.42;
    }
    if (t > 1.8) {
      scene.remove(effect.group);
      state.tyreDisposals.splice(i, 1);
    }
  }
}

function updateEffects(dt) {
  updateTyreDisposals(dt);
  dustCloud.position.set(1.2, 0.9, world.machineZ - 0.8);
  dustCloud.material.opacity = state.dustBurst * 0.38;
  const dustScale = 1 + (1 - state.dustBurst) * 1.6;
  dustCloud.scale.set(1.4 * dustScale, 0.55 * dustScale, 1.1 * dustScale);

  state.exhaustStartupBurst = Math.max(0, state.exhaustStartupBurst - dt * 0.55);
  state.exhaustFlameBurst = Math.max(0, state.exhaustFlameBurst - dt * 6.8);
  const throttleSmoke = state.engineStarted ? state.throttle : 0;
  const smokeLevel = Math.max(state.engineStarting ? 1 : 0, state.exhaustStartupBurst, throttleSmoke);
  if (state.engineStarted && state.throttle >= 0.995) {
    state.nextExhaustFlameBurst -= dt;
    if (state.nextExhaustFlameBurst <= 0) {
      state.exhaustFlameBurst = 1;
      state.nextExhaustFlameBurst = THREE.MathUtils.lerp(0.24, 0.95, Math.random());
    }
  } else {
    state.nextExhaustFlameBurst = 0.18;
  }
  const flameFlicker = 0.74 + Math.random() * 0.24 + Math.pow(Math.sin(state.smokeTime * 38) * 0.5 + 0.5, 2.6) * 0.22;
  const exhaustPulse = state.exhaustFlameBurst * flameFlicker;
  const flameLength = 0.62 + state.exhaustFlameBurst * (0.95 + Math.random() * 0.38);
  engineFlame.material.opacity = exhaustPulse * 0.72;
  engineFlameCore.material.opacity = exhaustPulse * 0.88;
  engineFlame.scale.set(0.85 + exhaustPulse * 0.28, flameLength, 0.85 + exhaustPulse * 0.16);
  engineFlameCore.scale.set(0.72 + exhaustPulse * 0.18, flameLength * 0.74, 0.72);
  exhaustLight.intensity = exhaustPulse * 2.2;
  engineSmokePuffs.forEach((puff, index) => {
    const drift = (state.smokeTime * (1.25 + smokeLevel * 0.8) + index * 0.24) % 1;
    puff.position.x = -0.62 - index * 0.42 - drift * (1.05 + smokeLevel * 0.82);
    puff.position.y = 0.02 + index * 0.035 + Math.sin(state.smokeTime * 2.1 + index) * 0.08 + drift * 0.28;
    puff.position.z = Math.sin(state.smokeTime * 3.4 + index * 1.7) * (0.08 + drift * 0.12);
    puff.material.opacity = smokeLevel * (0.18 + smokeLevel * 0.28) * (1 - drift);
    puff.scale.setScalar(0.65 + drift * 1.5 + smokeLevel * 0.24);
  });

  chimneySmoke.children.forEach((puff, index) => {
    const drift = state.smokeTime * 0.52 + index * 0.36;
    const plumeAge = index / Math.max(1, chimneySmoke.children.length - 1);
    puff.position.x = Math.sin(drift) * (1.25 + index * 0.18) + Math.sin(drift * 0.31) * plumeAge * 1.6;
    puff.position.y = index * 1.25 + Math.cos(drift * 0.7) * 0.22;
    puff.position.z = index * 0.72 + Math.sin(drift * 0.42) * plumeAge * 0.75;
    const smokeHeat = THREE.MathUtils.clamp(state.blackSmoke, 0, 1);
    const soot = THREE.MathUtils.clamp((smokeHeat - 0.18) / 0.6, 0, 1);
    puff.material.color.setHex(soot > 0.04 ? 0x090909 : 0x9f9b93);
    puff.material.opacity = 0.28 + Math.sin(drift * 0.9) * 0.06 + plumeAge * 0.08 + soot * 0.58;
    const sootScale = 1.25 + plumeAge * 0.72 + soot * (1.65 + index * 0.1);
    puff.scale.setScalar(sootScale);
  });

  const mounted = getMountedTyrePosition();
  if (!state.striker.mouseActive) {
    state.striker.tipTarget.lerp(getDefaultStickTip(), 1 - Math.exp(-dt * 2.2));
  }
  state.striker.recoil = damping(state.striker.recoil, 0, 12, dt);
  const desiredTip = tempVec2.copy(state.striker.tipTarget).addScaledVector(STICK_PUSH_AXIS, -state.striker.recoil);
  state.striker.tipCurrent.lerp(desiredTip, 1 - Math.exp(-dt * 18));
  const stickHandle = getStickHandlePosition(state.striker.tipCurrent);
  setMeshBetween(stick, stickHandle, state.striker.tipCurrent);
  setMeshBetween(stickHitbox, stickHandle, state.striker.tipCurrent);
  stickTip.position.copy(state.striker.tipCurrent);
  stickTip.quaternion.copy(stick.quaternion);
  const previousContact = state.striker.contact;
  const contactEdgeX = mounted.x - 0.48;
  const contactY = mounted.y + 1.78;
  const edgeDepth = THREE.MathUtils.clamp((contactEdgeX - state.striker.tipCurrent.x) / 0.36, 0, 1);
  const verticalFit = THREE.MathUtils.clamp(1 - Math.abs(state.striker.tipCurrent.y - contactY) / 0.9, 0, 1);
  const contactAmount = edgeDepth * verticalFit;
  state.striker.contact = damping(state.striker.contact, contactAmount, 14, dt);
  if (
    state.tyre.phase === "mounted" &&
    state.flywheelSpin > 3.4 &&
    contactAmount > 0.18 &&
    previousContact <= 0.18
  ) {
    state.striker.recoil = Math.max(state.striker.recoil, 0.2 + state.throttle * 0.22);
  }
  state.striker.pushDepth = contactEdgeX - state.striker.tipCurrent.x;
  const pushedThroughTyre =
    state.tyre.phase === "mounted" &&
    contactAmount > 0.18 &&
    state.striker.pushDepth > 0.04;
  if (pushedThroughTyre) {
    strikeTyre("push");
  }
  stickContactRing.position.copy(mounted);
  stickContactRing.material.opacity = state.tyre.phase === "mounted" ? 0.05 + state.striker.contact * 0.35 : 0;
  stickContactRing.scale.setScalar(0.92 + Math.sin(state.smokeTime * 8) * 0.05);
}

function updateCamera(dt) {
  const tyrePhase = state.tyre.phase;
  if (orbitCamera.active) {
    orbitCamera.target.copy(getEngineOrbitTarget());
    const cosPitch = Math.cos(orbitCamera.pitch);
    desiredCameraPosition.set(
      orbitCamera.target.x + Math.sin(orbitCamera.yaw) * cosPitch * orbitCamera.radius,
      orbitCamera.target.y + Math.sin(orbitCamera.pitch) * orbitCamera.radius,
      orbitCamera.target.z + Math.cos(orbitCamera.yaw) * cosPitch * orbitCamera.radius
    );
    desiredCameraTarget.copy(orbitCamera.target);
  } else if (tyrePhase === "rolling" || tyrePhase === "doorApproach" || tyrePhase === "flying" || tyrePhase === "scored") {
    const tyrePosition = state.tyre.position;
    const flightProgress = THREE.MathUtils.clamp(
      (world.machineZ - tyrePosition.z) / (world.machineZ - world.chimneyZ),
      0,
      1
    );
    const airborneView = tyrePhase === "flying" || tyrePhase === "scored";
    const chimneyApproach = THREE.MathUtils.smoothstep(flightProgress, 0.82, 1.0);
    const isWellScore = tyrePhase === "scored" && state.tyre.scoreTarget === "well";
    const wellApproach = isWellScore
      ? 1
      : THREE.MathUtils.smoothstep((world.chimneyZ - tyrePosition.z) / Math.max(1, world.chimneyZ - world.wellZ), 0.02, 0.92);
    const terminalTargetZ = THREE.MathUtils.lerp(world.chimneyZ, world.wellZ, wellApproach);
    const chimneyCameraStopZ = THREE.MathUtils.lerp(world.chimneyZ + 28, world.wellZ + 30, wellApproach);
    const chimneyTargetStopZ = THREE.MathUtils.lerp(world.chimneyZ - 4, world.wellZ - 2, wellApproach);
    const chaseZ = airborneView
      ? THREE.MathUtils.clamp(tyrePosition.z + THREE.MathUtils.lerp(10.5, 22, wellApproach), chimneyCameraStopZ, 18)
      : THREE.MathUtils.clamp(tyrePosition.z + 24.5, -25, 23.5);
    const targetHeight =
      tyrePhase === "scored"
        ? (isWellScore ? world.wellHeight + 3.2 : world.chimneyHeight + 2.6)
        : airborneView ? tyrePosition.y + 0.6 : tyrePosition.y * 0.72 + 3.0;
    const airborneCameraX = THREE.MathUtils.lerp(
      (airborneView ? -6.2 - chimneyApproach * 3.2 : -1.8) + tyrePosition.x * (airborneView ? 0.62 : 0.14),
      world.wellX - 8 + tyrePosition.x * 0.16,
      wellApproach
    );

    desiredCameraPosition.set(
      THREE.MathUtils.clamp(airborneCameraX, -18, 30),
      THREE.MathUtils.clamp(
        airborneView ? tyrePosition.y + THREE.MathUtils.lerp(28.0 + chimneyApproach * 20.0, 18.0, wellApproach) : 7.2 + tyrePosition.y * 0.18 + flightProgress * 4.2,
        airborneView ? 18 : 6.8,
        airborneView ? 260 : 96
      ),
      chaseZ
    );
    desiredCameraTarget.set(
      airborneView
        ? THREE.MathUtils.lerp(tyrePosition.x * 0.82, world.wellX, wellApproach * 0.96)
        : tyrePosition.x * 0.42,
      THREE.MathUtils.clamp(targetHeight + (airborneView ? THREE.MathUtils.lerp(-10.0 - chimneyApproach * 5.0, 1.8, wellApproach) : 2.6), isWellScore ? 1.8 : 6.2, airborneView ? 240 : world.chimneyHeight + 12.5),
      airborneView
        ? Math.max(THREE.MathUtils.lerp(tyrePosition.z - 1.6, terminalTargetZ, THREE.MathUtils.lerp(flightProgress * 0.5, 0.8, wellApproach)), chimneyTargetStopZ)
        : THREE.MathUtils.lerp(tyrePosition.z - 8, world.chimneyZ, flightProgress * 0.55)
    );
  } else {
    desiredCameraPosition.copy(DEFAULT_CAMERA_POSITION);
    desiredCameraTarget.copy(DEFAULT_CAMERA_TARGET);
  }

  const cameraEase = orbitCamera.active ? 18 : tyrePhase === "flying" ? 7.2 : tyrePhase === "scored" ? 4.8 : 2.9;
  camera.position.x = damping(camera.position.x, desiredCameraPosition.x, cameraEase, dt);
  camera.position.y = damping(camera.position.y, desiredCameraPosition.y, cameraEase, dt);
  camera.position.z = damping(camera.position.z, desiredCameraPosition.z, cameraEase, dt);
  cameraTarget.x = damping(cameraTarget.x, desiredCameraTarget.x, cameraEase, dt);
  cameraTarget.y = damping(cameraTarget.y, desiredCameraTarget.y, cameraEase, dt);
  cameraTarget.z = damping(cameraTarget.z, desiredCameraTarget.z, cameraEase, dt);
  camera.lookAt(cameraTarget);
}

function updateThrottle(dt) {
  if (state.mode === "menu") {
    return;
  }
  const ladderLive = state.tyre.phase === "rolling" || state.tyre.phase === "flying";
  if (state.engineStarted) {
    if (window.__heldKeys?.KeyW && !ladderLive) {
      state.throttle = Math.min(1, state.throttle + dt * 0.55);
    }
    if (window.__heldKeys?.KeyS && !ladderLive) {
      state.throttle = Math.max(0, state.throttle - dt * 0.65);
    }
  } else {
    state.throttle = Math.max(0, state.throttle - dt * 0.9);
  }
}

window.__heldKeys = {};

window.addEventListener("keydown", (event) => {
  window.__heldKeys[event.code] = true;
  if (event.code.startsWith("Arrow")) {
    event.preventDefault();
  }
  handleKeyDown(event);
});

window.addEventListener("keyup", (event) => {
  window.__heldKeys[event.code] = false;
  if (event.code.startsWith("Arrow")) {
    event.preventDefault();
  }
  handleKeyUp(event);
});

window.addEventListener("blur", () => {
  Object.keys(window.__heldKeys).forEach((key) => {
    window.__heldKeys[key] = false;
  });
  keys.left = false;
  keys.right = false;
  keys.up = false;
  keys.down = false;
  keys.bankLeft = false;
  keys.bankRight = false;
  releaseFlightStick();
});

function setFlightStickAxes(x, y) {
  touchInput.joystickX = THREE.MathUtils.clamp(x, -1, 1);
  touchInput.joystickY = THREE.MathUtils.clamp(y, -1, 1);
  const threshold = 0.22;
  keys.left = touchInput.joystickX < -threshold;
  keys.right = touchInput.joystickX > threshold;
  keys.up = touchInput.joystickY > threshold;
  keys.down = touchInput.joystickY < -threshold;

  if (flightStickKnob) {
    const travel = flightStick ? flightStick.clientWidth * 0.28 : 34;
    flightStickKnob.style.transform = `translate(calc(-50% + ${touchInput.joystickX * travel}px), calc(-50% + ${-touchInput.joystickY * travel}px))`;
  }
}

function releaseFlightStick() {
  const wasJoystickActive = touchInput.joystickPointerId !== null || Math.abs(touchInput.joystickX) > 0.01 || Math.abs(touchInput.joystickY) > 0.01;
  touchInput.joystickPointerId = null;
  if (state.tyre.phase === "flying") {
    setFlightStickAxes(0, 0);
  } else {
    touchInput.joystickX = 0;
    touchInput.joystickY = 0;
    if (wasJoystickActive) {
      keys.left = false;
      keys.right = false;
      keys.up = false;
      keys.down = false;
    }
    if (flightStickKnob) {
      flightStickKnob.style.transform = "translate(-50%, -50%)";
    }
  }
}

function updateFlightStickFromPointer(event) {
  if (!flightStick) {
    return;
  }
  const rect = flightStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.max(1, rect.width * 0.5);
  const dx = (event.clientX - centerX) / radius;
  const dy = (event.clientY - centerY) / radius;
  const length = Math.hypot(dx, dy);
  const scale = length > 1 ? 1 / length : 1;
  setFlightStickAxes(dx * scale, -dy * scale);
}

function installTouchControls() {
  const releaseSliders = () => {
    touchInput.throttleDragging = false;
    touchInput.ladderDragging = false;
    touchInput.pitchDragging = false;
  };

  if (touchThrottle) {
    touchThrottle.addEventListener("pointerdown", (event) => {
      touchInput.throttleDragging = true;
      event.stopPropagation();
    });
    touchThrottle.addEventListener("input", () => {
      if (touchInput.throttleActive) {
        state.throttle = THREE.MathUtils.clamp(Number(touchThrottle.value) / 100, 0, 1);
        updateHud();
      }
    });
    touchThrottle.addEventListener("pointerup", () => {
      touchInput.throttleDragging = false;
    });
    touchThrottle.addEventListener("pointercancel", () => {
      touchInput.throttleDragging = false;
    });
  }

  if (touchLadder) {
    touchLadder.addEventListener("pointerdown", (event) => {
      touchInput.ladderDragging = true;
      event.stopPropagation();
    });
    touchLadder.addEventListener("input", () => {
      if (touchInput.ladderActive) {
        state.ladderOffset = THREE.MathUtils.clamp((Number(touchLadder.value) / 100) * LADDER_RANGE, -LADDER_RANGE, LADDER_RANGE);
        updateHud();
      }
    });
    touchLadder.addEventListener("pointerup", () => {
      touchInput.ladderDragging = false;
    });
    touchLadder.addEventListener("pointercancel", () => {
      touchInput.ladderDragging = false;
    });
  }

  if (touchPitch) {
    touchPitch.addEventListener("pointerdown", (event) => {
      touchInput.pitchDragging = true;
      event.stopPropagation();
    });
    touchPitch.addEventListener("input", () => {
      if (touchInput.pitchActive) {
        state.ladderTilt = THREE.MathUtils.clamp((Number(touchPitch.value) / 100) * 0.38, -0.38, 0.38);
        updateHud();
      }
    });
    touchPitch.addEventListener("pointerup", () => {
      touchInput.pitchDragging = false;
    });
    touchPitch.addEventListener("pointercancel", () => {
      touchInput.pitchDragging = false;
    });
  }

  if (flightStick) {
    flightStick.addEventListener("pointerdown", (event) => {
      if (state.tyre.phase !== "flying") {
        return;
      }
      touchInput.joystickPointerId = event.pointerId;
      flightStick.setPointerCapture?.(event.pointerId);
      updateFlightStickFromPointer(event);
      event.preventDefault();
      event.stopPropagation();
    });
    flightStick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== touchInput.joystickPointerId) {
        return;
      }
      updateFlightStickFromPointer(event);
      event.preventDefault();
    });
    const endStick = (event) => {
      if (event.pointerId === touchInput.joystickPointerId) {
        releaseFlightStick();
      }
    };
    flightStick.addEventListener("pointerup", endStick);
    flightStick.addEventListener("pointercancel", endStick);
  }

  window.addEventListener("pointerup", releaseSliders);
  window.addEventListener("pointercancel", releaseSliders);
}

window.addEventListener("resize", onResize);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("fullscreenchange", onResize);
startButton.addEventListener("click", startGame);
installTouchControls();

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateTouchControls();
}

function update(dt) {
  updateThrottle(dt);
  updateMachine(dt);
  updateLadder(dt);
  updateTyre(dt);
  updateOrphanTyres(dt);
  updateBirds(dt);
  updateEffects(dt);
  updateCamera(dt);
  updateAudio(dt);
  updateHud();
}

function render() {
  renderer.render(scene, camera);
}

function updateFps(dt) {
  state.perf.frameCount += 1;
  state.perf.frameTime += dt;
  if (state.perf.frameTime >= 0.35) {
    state.perf.fps = state.perf.frameCount / state.perf.frameTime;
    state.perf.frameCount = 0;
    state.perf.frameTime = 0;
  }
}

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  updateFps(dt);
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function stepFor(ms) {
  const dt = 1 / 60;
  const steps = Math.max(1, Math.round(ms / (dt * 1000)));
  for (let i = 0; i < steps; i++) {
    update(dt);
  }
  render();
}

window.advanceTime = (ms) => {
  stepFor(ms);
};

window.__THREE_GAME__ = {
  state,
  world,
  scene,
  renderer,
  camera,
  cameraTarget,
  get buildingModel() {
    return buildingModel;
  },
  get wellModel() {
    return wellModel;
  },
  update,
  groundHeightAt,
  supportHeightAt,
  getTyreRestY,
  getTyrePoseBottomOffset,
  getVisualTyreOuterRadius,
  getDragTyreRideHeight,
  getTyreMountFit,
  isInTyreMountFunnel,
  getLadderFlightVelocity,
  getChimneyMouthCrossingFor,
  getWellMouthCrossingFor,
};

window.render_game_to_text = () =>
  JSON.stringify({
    coordinateSystem: "origin at ground center, +x right, +y up, -z toward ladder and chimney",
    mode: state.mode,
    engineStarted: state.engineStarted,
    throttle: Number(state.throttle.toFixed(2)),
    flywheelSpin: Number(state.flywheelSpin.toFixed(2)),
    tyre: {
      phase: state.tyre.phase,
      position: {
        x: Number(state.tyre.position.x.toFixed(2)),
        y: Number(state.tyre.position.y.toFixed(2)),
        z: Number(state.tyre.position.z.toFixed(2)),
      },
      velocity: {
        x: Number(state.tyre.velocity.x.toFixed(2)),
        y: Number(state.tyre.velocity.y.toFixed(2)),
        z: Number(state.tyre.velocity.z.toFixed(2)),
      },
      laneTargetX: Number(state.tyre.laneTargetX.toFixed(2)),
      launchPower: Number(state.tyre.launchPower.toFixed(2)),
      rollTimer: Number(state.tyre.rollTimer.toFixed(2)),
      spinRate: Number(state.tyre.spinRate.toFixed(2)),
      mountFit: (() => {
        const fit = getTyreMountFit();
        return {
          fits: fit.fits,
          score: Number(fit.score.toFixed(2)),
          dx: Number(fit.dx.toFixed(2)),
          dy: Number(fit.dy.toFixed(2)),
          dz: Number(fit.dz.toFixed(2)),
          funnel: isInTyreMountFunnel(fit),
        };
      })(),
      visible: tyre.visible,
    },
    ladder: {
      x: Number(state.ladderOffset.toFixed(2)),
      tiltDeg: Number(THREE.MathUtils.radToDeg(state.ladderTilt).toFixed(1)),
      bankDeg: Number(THREE.MathUtils.radToDeg(state.ladderBank).toFixed(1)),
      z: world.ladderZ,
    },
    lastLaunch: {
      laneTargetX: Number(state.lastLaneTargetX.toFixed(2)),
      ladderX: Number(state.lastLaunchLadderX.toFixed(2)),
      power: Number(state.lastLaunchPower.toFixed(2)),
    },
    stick: {
      tip: {
        x: Number(state.striker.tipCurrent.x.toFixed(2)),
        y: Number(state.striker.tipCurrent.y.toFixed(2)),
        z: Number(state.striker.tipCurrent.z.toFixed(2)),
      },
      contact: Number(state.striker.contact.toFixed(2)),
      pushSpeed: Number(state.striker.pushSpeed.toFixed(2)),
    },
    starter: {
      dragging: state.starter.dragging,
      pull: Number(state.starter.pull.toFixed(2)),
      pullSpeed: Number(state.starter.pullSpeed.toFixed(2)),
      maxPullSpeed: Number(state.starter.maxPullSpeed.toFixed(2)),
      tuning: {
        ...(() => {
          const t = getStarterTuning();
          return {
            sleeveRadius: Number(t.sleeveRadius.toFixed(3)),
            sleeveInnerRadius: Number(t.sleeveInnerRadius.toFixed(3)),
            anchorX: Number(t.anchorX.toFixed(3)),
            anchorY: Number(t.anchorY.toFixed(3)),
            anchorZ: Number(t.anchorZ.toFixed(3)),
            sleeveSpan: Number(t.sleeveSpan.toFixed(3)),
            ropeRadius: Number(t.ropeRadius.toFixed(3)),
          };
        })(),
      },
    },
    chimney: {
      x: world.chimneyX,
      y: world.chimneyHeight,
      z: world.chimneyZ,
      radius: world.chimneyRadius,
      mouthRadius: world.chimneyMouthRadius,
      rimRadius: world.chimneyRimRadius,
    },
    well: {
      x: world.wellX,
      y: world.wellHeight,
      z: world.wellZ,
      radius: world.wellRadius,
      hits: state.wellHits,
    },
    camera: {
      x: Number(camera.position.x.toFixed(2)),
      y: Number(camera.position.y.toFixed(2)),
      z: Number(camera.position.z.toFixed(2)),
      targetY: Number(cameraTarget.y.toFixed(2)),
      targetZ: Number(cameraTarget.z.toFixed(2)),
    },
    audio: {
      enabled: state.audio.enabled,
      unavailable: state.audio.unavailable,
      contextState: audioSystem.ctx?.state || "none",
      skidLevel: Number(state.audio.skidLevel.toFixed(2)),
    },
    perf: {
      fps: Number(state.perf.fps.toFixed(1)),
    },
    engineModel: {
      loaded: state.engineModelLoaded,
      info: state.engineModelInfo,
    },
    blackSmoke: Number(state.blackSmoke.toFixed(2)),
    score: state.score,
    orphanTyres: state.orphanTyres.length,
    birds: state.birds.map((bird) => ({
      phase: bird.phase,
      x: Number(bird.position.x.toFixed(2)),
      y: Number(bird.position.y.toFixed(2)),
      z: Number(bird.position.z.toFixed(2)),
    })),
    birdsHit: state.birdsHit,
    spentTyres: state.spentTyres.length,
    tyreDisposals: state.tyreDisposals.length,
    spentTyrePositions: state.spentTyres.slice(-6).map((spent) => ({
      x: Number(spent.position.x.toFixed(2)),
      y: Number(spent.position.y.toFixed(2)),
      z: Number(spent.position.z.toFixed(2)),
    })),
    message: state.message,
  });

initDebugStarterControls();
resetRound(false, "menu");
render();
requestAnimationFrame(frame);
