/**
 * A completely procedural, asset-free little dance-floor celebrity.
 * Front is +Z, feet rest on Y=0, normal standing height is about 2.95.
 * import { createDancer } from './celery-dancer.js';
 * const dancer = createDancer(THREE, 'celery'); scene.add(dancer);
 * dancer.userData.animate(seconds, {motion:'dance', speed:1, intensity:0.7});
 */
export function createDancer(THREE, variant = 'celery') {
  const root = new THREE.Group();
  root.name = 'Procedural dance-floor gentleman';
  const TAU = Math.PI * 2;
  const materials = {};
  const mat = (name, color, roughness = .7, metalness = 0) => {
    materials[name] = new THREE.MeshStandardMaterial({color, roughness, metalness, flatShading: true});
    return materials[name];
  };
  const skin = mat('skin', '#d99870', .86);
  const skinLight = mat('skinLight', '#e4ac83', .9);
  const skinShadow = mat('skinShadow', '#b67153', .92);
  const silver = mat('silver', '#a9b9bf', .32, .58);
  const silverDark = mat('silverDark', '#677982', .48, .46);
  const silverEdge = mat('silverEdge', '#dce7e9', .3, .7);
  const red = mat('red', '#d6502d', .82);
  const redDark = mat('redDark', '#a53326', .85);
  const oysterRed = mat('oysterRed', '#ba352c', .56);
  const oysterEdge = mat('oysterEdge', '#e76143', .6);
  const goldShirt = mat('goldShirt', '#bc963f', .56, .12);
  const goldPattern = mat('goldPattern', '#1b1a14', .75);
  const whiteShirt = mat('whiteShirt', '#e5e5dc', .92);
  const blackTrousers = mat('blackTrousers', '#191d1d', .27, .13);
  const oysterPants = mat('oysterPants', '#222322', .98);
  const leather = mat('leather', '#202426', .42, .05);
  const leatherEdge = mat('leatherEdge', '#454a47', .5);
  const shirtDark = mat('shirtDark', '#31312b');
  const denim = mat('denim', '#405c73', .98);
  const denimEdge = mat('denimEdge', '#75909b', .97);
  const brown = mat('brown', '#705340', .91);
  const brownDark = mat('brownDark', '#3e2e24', .8);
  const hair = mat('hair', '#37251d', .91);
  const hairLight = mat('hairLight', '#53382a', .96);
  const eyeWhite = mat('eyeWhite', '#ebe3cf', .6);
  const iris = mat('iris', '#455241', .45);
  const pupil = mat('pupil', '#131c17', .45);
  const mouthMat = mat('mouth', '#743f32', .9);
  const gold = mat('gold', '#bf974b', .35, .72);
  const black = mat('black', '#090c0c', .68);
  const sole = mat('sole', '#171918', 1);
  const sock = mat('sock', '#ddd7c5', 1);
  const censorMat = new THREE.MeshBasicMaterial({color: '#070909'});

  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    if (parent) parent.add(object);
    return object;
  }
  function ellipsoid(parent, material, position, scale, segments = 12) {
    const object = mesh(new THREE.SphereGeometry(1, segments, 10), material, parent, position);
    object.scale.set(...scale);
    return object;
  }
  function box(parent, material, position, dimensions) {
    return mesh(new THREE.BoxGeometry(...dimensions), material, parent, position);
  }
  function group(parent, position = [0, 0, 0]) {
    const object = new THREE.Group(); object.position.set(...position); parent.add(object); return object;
  }
  // Elliptical rings give the jacket, limbs and trousers a tailored silhouette.
  function ringsGeometry(rings, sides = 12) {
    rings = [...rings].sort((a, b) => a[0] - b[0]);
    const vertices = [], indices = [];
    for (const [y, rx, rz] of rings) {
      for (let i = 0; i < sides; i++) {
        const a = i / sides * TAU;
        vertices.push(Math.sin(a) * rx, y, Math.cos(a) * rz);
      }
    }
    for (let j = 0; j < rings.length - 1; j++) {
      for (let i = 0; i < sides; i++) {
        const a = j * sides + i, b = j * sides + (i + 1) % sides;
        const c = a + sides, d = b + sides;
        indices.push(a, b, c, b, d, c);
      }
    }
    vertices.push(0, rings[0][0], 0, 0, rings[rings.length - 1][0], 0);
    const bottom = rings.length * sides, top = bottom + 1;
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      indices.push(bottom, next, i);
      indices.push(top, (rings.length - 1) * sides + i, (rings.length - 1) * sides + next);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }
  function panel(parent, material, points, z = .223) {
    const shape = new THREE.Shape(); shape.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => shape.lineTo(x, y)); shape.closePath();
    const object = mesh(new THREE.ShapeGeometry(shape), material, parent, [0, 0, z]);
    return object;
  }
  function curve(parent, material, points, radius = .01) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(path, Math.max(8, points.length * 4), radius, 5, false), material, parent);
  }

  const pelvis = group(root, [0, 1.3, 0]);
  const waist = mesh(ringsGeometry([[-.17, .29, .18], [.03, .325, .205], [.15, .315, .195]], 14), silver, pelvis);
  const torso = group(pelvis, [0, .045, 0]);
  const jacket = mesh(ringsGeometry([[0, .31, .184], [.16, .326, .207], [.48, .405, .222], [.73, .452, .187], [.84, .39, .164], [.89, .175, .12]], 16), silver, torso);
  const neck = mesh(new THREE.CylinderGeometry(.115, .135, .2, 10), skin, torso, [0, .916, 0]);
  const headPivot = group(torso, [0, 1.19, 0]);
  // Distinct cheeks, ears and chin, with the eyes set into a quietly angular face.
  const head = ellipsoid(headPivot, skin, [0, 0, 0], [.282, .348, .241], 18);
  ellipsoid(headPivot, skinLight, [0, -.165, .071], [.206, .164, .172], 12);
  const expressionEyes = [], expressionCheeks = [], expressionBrows = [];
  for (const side of [-1, 1]) {
    ellipsoid(headPivot, skin, [side * .278, -.027, -.007], [.054, .092, .045], 10);
    ellipsoid(headPivot, skinShadow, [side * .291, -.027, .027], [.025, .056, .014], 8);
    const cheek = ellipsoid(headPivot, skinLight, [side * .145, -.09, .153], [.084, .075, .064], 10);
    cheek.userData.expressionPart = true; expressionCheeks.push(cheek);
    const eye = group(headPivot, [side * .106, .044, .216]);
    eye.rotation.y = side * .13; expressionEyes.push(eye);
    ellipsoid(eye, skinShadow, [0, 0, -.006], [.068, .042, .025], 10);
    ellipsoid(eye, eyeWhite, [0, 0, .011], [.056, .028, .02], 12);
    ellipsoid(eye, iris, [0, 0, .029], [.019, .022, .009], 10);
    ellipsoid(eye, pupil, [0, .001, .036], [.0095, .015, .006], 8);
    ellipsoid(eye, eyeWhite, [-.005, .007, .041], [.005, .006, .003], 6);
    const brow = curve(headPivot, hair, [[side * .050, .11, .222], [side * .106, .125, .23], [side * .167, .111, .203]], .019);
    brow.userData.expressionPart = true; expressionBrows.push(brow);
    curve(headPivot, skinShadow, [[side * .069, .078, .228], [side * .108, .083, .234], [side * .153, .067, .213]], .007);
  }
  const noseGeometry = new THREE.BufferGeometry();
  noseGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.037, .065, .226, .037, .065, .226, 0, -.044, .333,
    -.037, .065, .226, 0, -.044, .333, -.048, -.083, .257,
    .037, .065, .226, .048, -.083, .257, 0, -.044, .333,
    -.048, -.083, .257, 0, -.044, .333, .048, -.083, .257,
  ], 3));
  // Winding points outward so the nose remains solid with ordinary front-face culling.
  const nosePositions = noseGeometry.attributes.position;
  for (let i = 0; i < nosePositions.count; i += 3) {
    const x = nosePositions.getX(i + 1), y = nosePositions.getY(i + 1), z = nosePositions.getZ(i + 1);
    nosePositions.setXYZ(i + 1, nosePositions.getX(i + 2), nosePositions.getY(i + 2), nosePositions.getZ(i + 2));
    nosePositions.setXYZ(i + 2, x, y, z);
  }
  noseGeometry.computeVertexNormals(); mesh(noseGeometry, skinLight, headPivot);
  for (const s of [-1, 1]) ellipsoid(headPivot, skinShadow, [s * .03, -.078, .282], [.016, .009, .009], 8);
  const neutralMouth = group(headPivot);
  curve(neutralMouth, mouthMat, [[-.099, -.16, .213], [-.045, -.176, .249], [.016, -.177, .253], [.080, -.155, .228]], .011);
  curve(neutralMouth, skinLight, [[-.067, -.195, .227], [0, -.205, .247], [.059, -.184, .234]], .009);
  const smileMouth = group(headPivot);
  smileMouth.name = 'Oyster genuinely smiling';
  // A curved open smile with visible teeth, raised cheeks and narrowed eyes.
  function smilePatch(material, points, depth) {
    const patch = panel(smileMouth, material, points, 0);
    const positions = patch.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      positions.setZ(i, depth - .042 * Math.pow(x / .14, 2));
    }
    patch.geometry.computeVertexNormals(); return patch;
  }
  smilePatch(mouthMat, [[-.126, -.126], [-.058, -.151], [.053, -.151], [.126, -.126], [.095, -.193], [.041, -.218], [-.035, -.218], [-.093, -.194]], .272);
  smilePatch(eyeWhite, [[-.109, -.137], [-.052, -.157], [.052, -.157], [.109, -.137], [.080, -.175], [.031, -.187], [-.033, -.187], [-.080, -.176]], .275);
  curve(smileMouth, skinLight, [[-.112, -.144, .239], [-.087, -.202, .253], [0, -.227, .27], [.087, -.202, .253], [.114, -.142, .239]], .01);
  for (const side of [-1, 1]) curve(smileMouth, skinShadow, [[side * .112, -.092, .23], [side * .137, -.12, .226], [side * .134, -.16, .22]], .007);
  smileMouth.visible = false;
  let smiling = false;
  function setSmile(value = false) {
    smiling = Boolean(value); root.userData.smiling = smiling;
    neutralMouth.visible = !smiling; smileMouth.visible = smiling;
    expressionEyes.forEach(eye => { eye.scale.y = smiling ? .70 : 1; eye.position.y = smiling ? .053 : .044; });
    expressionCheeks.forEach(cheek => { cheek.position.y = smiling ? -.064 : -.09; cheek.scale.y = smiling ? .082 : .075; });
    expressionBrows.forEach(brow => { brow.position.y = smiling ? .012 : 0; });
    return root;
  }
  // Sculpted side part: a fitted cap, broad sweep and restrained faceted locks.
  mesh(ringsGeometry([[.077, .274, .226], [.176, .297, .257], [.282, .25, .21], [.354, .151, .118], [.375, .015, .015]], 18), hair, headPivot);
  const sweep = ellipsoid(headPivot, hairLight, [-.065, .271, .145], [.224, .092, .145], 12);
  sweep.rotation.z = -.19;
  for (let i = 0; i < 4; i++) {
    const lock = ellipsoid(headPivot, i % 2 ? hair : hairLight, [-.195 + i * .055, .18 + i * .018, .204], [.058, .111, .068], 8);
    lock.rotation.z = -.52;
  }
  for (const s of [-1, 1]) {
    const sideburn = box(headPivot, hair, [s * .252, .048, .071], [.028, .151, .069]);
    sideburn.rotation.z = s * -.08;
  }
  curve(headPivot, hair, [[.095, .31, .197], [.134, .261, .222], [.167, .207, .226]], .012);

  const costumes = {};
  for (const name of ['celery', 'oyster', 'tayne']) costumes[name] = group(torso);
  const shirtPoints = [[-.145, .025], [.145, .025], [.159, .723], [.099, .83], [-.099, .83], [-.159, .723]];
  function jacketFront(parent, shirtMaterial, lapelMaterial, trimMaterial) {
    panel(parent, shirtMaterial, shirtPoints, .227);
    for (const s of [-1, 1]) {
      const lapel = panel(parent, lapelMaterial, [[s * .102, .856], [s * .265, .732], [s * .19, .595], [s * .247, .547], [s * .117, .325], [s * .13, .663]], .238);
      lapel.material.side = THREE.DoubleSide;
      const pocket = box(parent, trimMaterial, [s * .276, .24, .207], [.16, .021, .015]);
      pocket.rotation.z = s * .1;
    }
  }
  jacketFront(costumes.celery, whiteShirt, silverEdge, silverDark);
  for (let i = 0; i < 4; i++) ellipsoid(costumes.celery, silverDark, [.012, .23 + i * .125, .243], [.012, .012, .006], 6);
  const celeryCollar = panel(costumes.celery, whiteShirt, [[-.125, .77], [-.043, .61], [0, .75], [.06, .61], [.13, .78], [0, .855]], .245);
  panel(costumes.celery, silverDark, [[-.027, .72], [.027, .72], [.042, .645], [-.042, .645]], .254);
  panel(costumes.celery, silverEdge, [[-.029, .65], [.029, .65], [.057, .219], [0, .157], [-.057, .219]], .253);
  box(costumes.celery, silverDark, [.288, .572, .195], [.117, .019, .018]);
  box(costumes.celery, whiteShirt, [.306, .602, .191], [.051, .038, .012]);
  jacketFront(costumes.oyster, shirtDark, oysterEdge, redDark);
  for (const s of [-1, 1]) {
    curve(costumes.oyster, silverEdge, [[s * .125, .16, .241], [s * .158, .4, .246], [s * .182, .59, .237]], .007);
    ellipsoid(costumes.oyster, silverEdge, [s * .188, .659, .249], [.018, .018, .007], 8);
    const chestZip = box(costumes.oyster, silverDark, [s * .285, .57, .202], [.108, .011, .009]);
    chestZip.rotation.z = s * -.14;
  }
  // A modest opening, exaggerated gold collar points, and a tiny gold chain.
  panel(costumes.tayne, goldShirt, [[-.134, .25], [.134, .25], [.162, .727], [.084, .852], [-.084, .852], [-.162, .727]], .227);
  for (const s of [-1, 1]) {
    panel(costumes.tayne, brownDark, [[s * .09, .85], [s * .235, .727], [s * .148, .549], [s * .093, .744]], .24).material.side = THREE.DoubleSide;
    for (let i = 0; i < 4; i++) ellipsoid(costumes.tayne, gold, [s * .152, .17 + i * .125, .235], [.009, .009, .005], 6);
  }
  curve(costumes.tayne, gold, [[-.093, .791, .235], [-.065, .648, .237], [0, .586, .237], [.065, .648, .237], [.093, .791, .235]], .008);
  ellipsoid(costumes.tayne, gold, [0, .568, .245], [.023, .029, .008], 8);

  // Irregular woven diamonds follow the curved front of Tayne's gold shirt.
  for (let row = 0; row < 5; row++) {
    const y = .13 + row * .131;
    const rx = .324 + Math.min(y / .73, 1) * .125;
    const rz = .224 - Math.max(0, y - .5) * .16;
    for (let col = -3; col <= 3; col++) {
      const x = col * .092 + (row % 2 ? .03 : -.011);
      if (Math.abs(x) > rx * .86) continue;
      const z = rz * Math.sqrt(1 - (x / rx) ** 2) + .009;
      const size = .02 + ((row * 7 + col * 3 + 25) % 4) * .003;
      panel(costumes.tayne, goldPattern, [[x - size, y], [x + size * .2, y + size * 1.6], [x + size, y + .004], [x - size * .1, y - size * 1.3]], Math.max(z, Math.abs(x) < .15 ? .236 : z));
    }
  }

  function shirtSurface(x, y) {
    const rows = [[0, .31, .184], [.16, .326, .207], [.48, .405, .222], [.73, .452, .187], [.84, .39, .164], [.89, .175, .12]];
    let index = 1;
    while (index < rows.length - 1 && rows[index][0] < y) index++;
    const a = rows[index - 1], b = rows[index], blend = (y - a[0]) / (b[0] - a[0]);
    const rx = a[1] + (b[1] - a[1]) * blend, rz = a[2] + (b[2] - a[2]) * blend;
    return Math.max(Math.abs(x) < .163 ? .238 : 0, rz * Math.sqrt(Math.max(.03, 1 - (x / rx) ** 2)) + .012);
  }
  // Baroque medallions and curling leaves make the shirt legible even at stage distance.
  for (const [cx, cy, radius] of [[-.225, .50, .132], [.225, .31, .115], [.22, .69, .082], [-.20, .20, .077]]) {
    const vertices = [cx, cy, shirtSurface(cx, cy)], indices = [];
    for (let i = 0; i <= 32; i++) {
      const angle = i / 32 * TAU, r = radius * (1 + .07 * Math.sin(angle * 8));
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r * 1.16;
      vertices.push(x, y, shirtSurface(x, y));
      if (i > 0) indices.push(0, i, i + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    mesh(geometry, goldPattern, costumes.tayne);
    for (let ring = 0; ring < 3; ring++) {
      const points = [];
      for (let i = 0; i <= 40; i++) {
        const angle = i / 40 * TAU;
        const r = radius * (.40 + ring * .235) * (1 + .085 * Math.sin(angle * (ring ? 8 : 5)));
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r * 1.16;
        points.push([x, y, shirtSurface(x, y) + .008]);
      }
      curve(costumes.tayne, goldShirt, points, .0055);
    }
    for (let petal = 0; petal < 6; petal++) {
      const points = [];
      for (let i = 0; i <= 10; i++) {
        const angle = petal / 6 * TAU + Math.sin(i / 10 * Math.PI) * .28;
        const r = radius * (.17 + i / 10 * .64);
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r * 1.16;
        points.push([x, y, shirtSurface(x, y) + .01]);
      }
      curve(costumes.tayne, goldShirt, points, .005);
    }
  }

  const cap = group(headPivot, [0, .245, 0]);
  cap.name = 'Oyster tall flame-pattern red knit cap';
  const capRings = [[0, .303, .262], [.065, .299, .258], [.23, .258, .221], [.385, .176, .15], [.455, .083, .071], [.48, .006, .006]];
  mesh(ringsGeometry(capRings, 18), oysterRed, cap);
  mesh(ringsGeometry([[.003, .309, .267], [.065, .305, .265]], 18), redDark, cap);
  function capRadius(y, channel) {
    let index = 1;
    while (index < capRings.length - 1 && capRings[index][0] < y) index++;
    const a = capRings[index - 1], b = capRings[index];
    const blend = (y - a[0]) / (b[0] - a[0]);
    return a[channel] + (b[channel] - a[channel]) * blend + .005;
  }
  for (let flame = 0; flame < 10; flame++) {
    const vertices = [], indices = [];
    for (let step = 0; step <= 10; step++) {
      const u = step / 10, y = .118 + u * .336;
      const center = flame / 10 * TAU + .12 * Math.sin(u * 5 + flame);
      const width = .03 + .16 * Math.sin(u * Math.PI * .78);
      for (const side of [-1, 1]) {
        const angle = center + side * width * Math.sin(Math.min(1, u * 4) * Math.PI / 2);
        vertices.push(Math.sin(angle) * capRadius(y, 1), y, Math.cos(angle) * capRadius(y, 2));
      }
      if (step > 0) { const a = (step - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const flameGeometry = new THREE.BufferGeometry();
    flameGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    flameGeometry.setIndex(indices); flameGeometry.computeVertexNormals();
    mesh(flameGeometry, black, cap);
  }
  mesh(ringsGeometry([[.43, .117, .10], [.478, .01, .01]], 14), black, cap);
  cap.visible = false;

  const sunglasses = group(headPivot);
  sunglasses.name = 'Tayne tinted sunglasses';
  for (const side of [-1, 1]) {
    const lens = group(sunglasses, [side * .105, .044, .252]);
    lens.rotation.y = side * .15;
    ellipsoid(lens, gold, [0, 0, 0], [.082, .056, .016], 12);
    ellipsoid(lens, black, [0, 0, .009], [.072, .046, .014], 12);
    curve(sunglasses, gold, [[side * .174, .06, .251], [side * .245, .07, .15], [side * .28, .046, .028]], .008);
  }
  curve(sunglasses, gold, [[-.029, .059, .27], [0, .071, .278], [.029, .059, .27]], .009);
  sunglasses.visible = false;

  const beltGroup = group(pelvis, [0, .046, 0]);
  mesh(ringsGeometry([[-.025, .327, .21], [.025, .327, .21]], 16), leather, beltGroup);
  const buckle = box(beltGroup, silverEdge, [0, 0, .218], [.10, .07, .028]);
  box(beltGroup, black, [0, 0, .235], [.062, .039, .01]);
  const censor = group(pelvis, [0, -.022, .012]);
  // A solid opaque box wraps the featureless hips; the broad front reads as a censor bar.
  box(censor, censorMat, [0, 0, 0], [.765, .365, .56]);
  censor.visible = false;

  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const shoulder = group(torso, [side * .426, .748, 0]);
    const upper = mesh(ringsGeometry([[0, .128, .142], [-.10, .15, .15], [-.31, .12, .12], [-.47, .101, .102]]), silver, shoulder);
    const elbow = group(shoulder, [0, -.46, 0]);
    const elbowMesh = ellipsoid(elbow, silver, [0, -.006, 0], [.106, .106, .104]);
    const lower = mesh(ringsGeometry([[0, .102, .105], [-.15, .113, .109], [-.34, .084, .08], [-.405, .079, .075]]), silver, elbow);
    const cuff = mesh(ringsGeometry([[-.375, .085, .081], [-.424, .085, .081]]), silverDark, elbow);
    const wrist = group(elbow, [0, -.455, .006]);
    ellipsoid(wrist, skin, [0, -.035, 0], [.086, .108, .053]);
    for (let i = 0; i < 4; i++) {
      const finger = ellipsoid(wrist, skin, [-.048 + i * .032, -.123 + Math.abs(1.5 - i) * .007, .012], [.019, .057, .025], 8);
      finger.rotation.x = -.1;
    }
    const thumb = ellipsoid(wrist, skinLight, [-side * .079, -.018, .026], [.035, .066, .037], 8);
    thumb.rotation.z = -side * .44;
    const shoulderSeam = curve(shoulder, silverDark, [[-side * .103, -.018, .09], [0, -.047, .143], [side * .103, -.026, .09]], .007);
    const watch = mesh(new THREE.CylinderGeometry(.086, .086, .04, 12), leather, elbow, [0, -.378, 0]);
    const watchFace = box(elbow, silverEdge, [0, -.38, .084], [.074, .058, .012]);
    if (side === 1) {watch.visible = false; watchFace.visible = false;}
    const sleevePattern = group(shoulder);
    const forearmPattern = group(elbow);
    for (const [decoration, z, length] of [[sleevePattern, .15, .34], [forearmPattern, .113, .29]]) {
      for (let ring = 0; ring < 3; ring++) {
        const points = [];
        for (let i = 0; i <= 24; i++) {
          const angle = i / 24 * TAU;
          points.push([Math.cos(angle) * (.040 + ring * .017), -.12 - length * .2 + Math.sin(angle) * (.048 + ring * .03), z + .003]);
        }
        curve(decoration, goldPattern, points, .008);
      }
      for (const sideOfSleeve of [-1, 1]) curve(decoration, goldPattern, [[sideOfSleeve * .056, -.065, z], [sideOfSleeve * .071, -.15, z], [sideOfSleeve * .039, -.28, z]], .008);
    }
    arms.push({side, shoulder, upper, elbow, elbowMesh, lower, cuff, wrist, shoulderSeam, watch, watchFace, sleevePattern, forearmPattern});

    const hip = group(pelvis, [side * .17, -.067, 0]);
    const thigh = mesh(ringsGeometry([[.075, .167, .175], [-.10, .16, .169], [-.34, .132, .133], [-.493, .114, .112]]), silver, hip);
    const knee = group(hip, [0, -.493, 0]);
    const kneeMesh = ellipsoid(knee, silver, [0, 0, 0], [.112, .118, .112]);
    const shin = mesh(ringsGeometry([[0, .115, .113], [-.19, .121, .116], [-.42, .098, .099], [-.558, .092, .092]]), silver, knee);
    const crease = curve(hip, silverEdge, [[0, -.10, .169], [0, -.27, .145], [0, -.435, .121]], .005);
    const shinCrease = curve(knee, silverEdge, [[0, -.045, .119], [0, -.25, .116], [0, -.49, .1]], .005);
    const foot = group(knee, [0, -.558, .025]);
    const ankle = mesh(new THREE.CylinderGeometry(.087, .092, .12, 10), black, foot, [0, .035, 0]);
    const shoe = ellipsoid(foot, black, [0, -.065, .071], [.122, .085, .224], 12);
    box(foot, sole, [0, -.109, .063], [.219, .044, .35]);
    const shoeBridge = ellipsoid(foot, leatherEdge, [0, -.012, .067], [.097, .028, .107], 10);
    const bootUpper = mesh(ringsGeometry([[-.05, .107, .104], [.09, .116, .12], [.21, .117, .114]]), brownDark, foot);
    bootUpper.visible = false;
    const bootStrap = mesh(new THREE.CylinderGeometry(.121, .122, .03, 12), gold, foot, [0, .17, 0]); bootStrap.visible = false;
    legs.push({side, hip, thigh, knee, kneeMesh, shin, crease, shinCrease, foot, ankle, shoe, shoeBridge, bootUpper, bootStrap});
  }

  const hat = group(headPivot, [0, .284, 0]);
  hat.name = 'Tayne black fedora';
  // A modest fedora brim, softly raised sides, and a pinched crown.
  const brimVertices = [], brimIndices = [], brimSegments = 40;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < brimSegments; i++) {
      const a = i / brimSegments * TAU;
      const x = Math.cos(a), z = Math.sin(a);
      brimVertices.push(x * (r ? .405 : .265), r ? .018 + .025 * Math.pow(Math.abs(x), 3) : .025, z * (r ? .318 : .225));
    }
  }
  for (let i = 0; i < brimSegments; i++) {
    const n = (i + 1) % brimSegments;
    brimIndices.push(i, n, i + brimSegments, n, n + brimSegments, i + brimSegments);
  }
  const brimGeo = new THREE.BufferGeometry();
  brimGeo.setAttribute('position', new THREE.Float32BufferAttribute(brimVertices, 3)); brimGeo.setIndex(brimIndices); brimGeo.computeVertexNormals();
  const hatFelt = mat('hatFelt', '#252421', .98); hatFelt.side = THREE.DoubleSide;
  mesh(brimGeo, hatFelt, hat);
  mesh(ringsGeometry([[.025, .266, .228], [.12, .25, .21], [.31, .207, .172], [.385, .174, .142], [.4, .16, .13]], 16), hatFelt, hat);
  mesh(ringsGeometry([[.063, .268, .228], [.113, .263, .226]], 16), brownDark, hat);
  box(hat, gold, [.243, .09, .058], [.026, .043, .06]);
  curve(hat, brown, [[0, .403, -.11], [0, .39, -.02], [0, .403, .11]], .009);
  hat.visible = false;

  let currentVariant = 'celery';
  let nude = false;
  function applyWardrobe() {
    const isCelery = currentVariant === 'celery';
    const isOyster = currentVariant === 'oyster';
    const jacketMaterial = nude ? skin : isCelery ? silver : isOyster ? oysterRed : goldShirt;
    const pantsMaterial = nude ? skin : isCelery ? silver : isOyster ? oysterPants : blackTrousers;
    const edgeMaterial = nude ? skin : isCelery ? silverDark : isOyster ? oysterEdge : goldPattern;
    jacket.material = jacketMaterial;
    waist.material = nude ? black : pantsMaterial;
    beltGroup.visible = !nude;
    censor.visible = nude;
    cap.visible = !nude && currentVariant === 'oyster';
    sunglasses.visible = currentVariant === 'tayne';
    buckle.material = isCelery ? silverEdge : gold;
    for (const [name, costume] of Object.entries(costumes)) costume.visible = !nude && name === currentVariant;
    for (const arm of arms) {
      arm.upper.material = jacketMaterial; arm.lower.material = jacketMaterial; arm.elbowMesh.material = jacketMaterial;
      arm.cuff.material = edgeMaterial; arm.shoulderSeam.material = edgeMaterial;
      arm.shoulderSeam.visible = !nude; arm.cuff.visible = !nude;
      arm.sleevePattern.visible = !nude && currentVariant === 'tayne';
      arm.forearmPattern.visible = arm.sleevePattern.visible;
      arm.watch.visible = arm.side < 0 && !nude; arm.watchFace.visible = arm.side < 0 && !nude;
    }
    for (const leg of legs) {
      leg.thigh.material = pantsMaterial; leg.shin.material = pantsMaterial; leg.kneeMesh.material = pantsMaterial;
      const trouserWidth = !nude && isOyster ? 1.14 : 1;
      leg.thigh.scale.set(trouserWidth, 1, trouserWidth);
      leg.shin.scale.set(trouserWidth, 1, trouserWidth);
      leg.kneeMesh.scale.set(.112 * trouserWidth, .118, .112 * trouserWidth);
      leg.crease.material = isCelery ? silverEdge : isOyster ? leather : leatherEdge;
      leg.shinCrease.material = leg.crease.material;
      leg.crease.visible = !nude; leg.shinCrease.visible = !nude;
      leg.bootUpper.visible = !nude && currentVariant === 'tayne';
      leg.bootUpper.material = blackTrousers;
      leg.bootStrap.visible = false;
      leg.shoe.material = currentVariant === 'tayne' && !nude ? blackTrousers : black;
      leg.ankle.material = nude ? sock : black;
    }
  }
  function setVariant(value = 'celery') {
    currentVariant = ['celery', 'oyster', 'tayne'].includes(value) ? value : 'celery';
    root.userData.variant = currentVariant;
    applyWardrobe();
    hat.visible = currentVariant === 'tayne' && !nude;
    return root;
  }
  function resetPose() {
    pelvis.position.set(0, 1.3, 0); pelvis.rotation.set(0, 0, 0);
    torso.rotation.set(0, 0, 0); headPivot.rotation.set(0, 0, 0);
    hat.position.set(0, .284, 0); hat.rotation.set(0, 0, 0);
    for (const arm of arms) {
      arm.shoulder.rotation.set(0, 0, arm.side * .1); arm.elbow.rotation.set(-.13, 0, 0); arm.wrist.rotation.set(0, 0, 0);
    }
    for (const leg of legs) {
      leg.hip.rotation.set(0, 0, 0); leg.knee.rotation.set(0, 0, 0); leg.foot.rotation.set(0, 0, 0);
    }
  }
  const footMatrix = new THREE.Matrix4(), footPoint = new THREE.Vector3();
  const solePoints = [[-.105, -.131, -.11], [.105, -.131, -.11], [-.105, -.131, .238], [.105, -.131, .238], [0, -.15, .071]];
  const smooth = (a, b, value) => { const x = Math.max(0, Math.min(1, (value - a) / (b - a))); return x * x * (3 - 2 * x); };
  /** Stateless choreography; gestureTime lets the stage restart special gestures on command. */
  function animate(time = 0, options = {}) {
    const speed = Number.isFinite(options.speed) ? Math.max(0, options.speed) : 1;
    let amount = Number.isFinite(options.intensity) ? Math.max(0, Math.min(1, options.intensity)) : .8;
    const reduced = options.reducedMotion || options.lowMotion;
    if (reduced) amount *= .18;
    if (typeof options.smile === 'boolean' && options.smile !== smiling) setSmile(options.smile);
    const motion = options.motion || 'dance';
    const nextNude = motion === 'nude';
    if (nextNude !== nude) { nude = nextNude; applyWardrobe(); }
    const t = (Number.isFinite(time) ? time : 0) * speed;
    const gesture = (Number.isFinite(options.gestureTime) ? options.gestureTime : time) * speed;
    const beat = t * (currentVariant === 'oyster' ? 5.4 : currentVariant === 'tayne' ? 6.4 : 6);
    const s = Math.sin(beat), c = Math.cos(beat), half = Math.sin(beat * .5);
    let liftOff = 0;
    resetPose();
    hat.visible = !nude && (currentVariant === 'tayne' || (motion === 'hat' && currentVariant !== 'oyster'));
    cap.position.set(0, .245, 0); cap.rotation.set(0, 0, 0);
    pelvis.position.x = amount * .055 * s;
    pelvis.rotation.y = amount * .13 * half;
    pelvis.rotation.z = amount * .035 * s;
    torso.rotation.z = amount * -.10 * s;
    torso.rotation.y = amount * -.13 * half;
    headPivot.rotation.z = amount * .06 * s;
    headPivot.rotation.y = amount * .14 * Math.sin(beat * .5 - .4);
    headPivot.rotation.x = amount * -.03 * Math.sin(beat * 2);

    // Celery's tidy running-man shuffle: quick heel taps and alternating bent arms.
    for (const leg of legs) {
      const phase = beat + (leg.side < 0 ? Math.PI : 0), tap = Math.max(0, Math.sin(phase));
      leg.hip.rotation.x = -amount * .33 * Math.sin(phase);
      leg.hip.rotation.z = leg.side * amount * .065;
      leg.knee.rotation.x = amount * (.09 + .43 * tap);
      leg.foot.rotation.y = leg.side * amount * (.035 + .12 * tap);
    }
    for (const arm of arms) {
      const phase = beat + (arm.side < 0 ? Math.PI : 0);
      arm.shoulder.rotation.x = amount * (-.17 + .58 * Math.sin(phase));
      arm.shoulder.rotation.z = arm.side * (.1 + amount * (.14 + .09 * Math.cos(phase)));
      arm.elbow.rotation.x = -.20 - amount * (.82 + .24 * Math.sin(phase + .4));
      arm.wrist.rotation.z = arm.side * amount * .14 * c;
    }

    if (currentVariant === 'oyster') {
      // Planted feet and a loose upper-body groove, with alternating shoulder pops.
      torso.rotation.x = amount * .10;
      torso.rotation.z = amount * .14 * s;
      torso.rotation.y = amount * .24 * Math.sin(beat);
      pelvis.position.x = amount * .065 * half;
      pelvis.rotation.y = -amount * .13 * Math.sin(beat);
      headPivot.rotation.x = amount * .08 * Math.sin(beat * 2);
      headPivot.rotation.z = -amount * .13 * s;
      for (const leg of legs) {
        leg.hip.rotation.x = -amount * (.15 + .065 * c);
        leg.hip.rotation.z = leg.side * amount * .17;
        leg.knee.rotation.x = amount * (.3 + .13 * c);
        leg.foot.rotation.y = leg.side * amount * .15;
      }
      for (const arm of arms) {
        arm.shoulder.rotation.z = arm.side * (.13 + amount * (.34 + .11 * Math.sin(beat + arm.side)));
        arm.shoulder.rotation.x = -amount * (.25 + .18 * c);
        arm.elbow.rotation.x = -.1 - amount * (1.12 + .21 * Math.sin(beat + arm.side));
        arm.wrist.rotation.y = arm.side * amount * .42;
      }
    } else if (currentVariant === 'tayne') {
      // Wide-legged squat pulse and low pumping hands: Tayne's unmistakable stance.
      const pulse = .5 + .5 * Math.sin(beat * 2);
      pelvis.position.x = amount * .07 * half;
      pelvis.rotation.y = amount * .19 * half;
      torso.rotation.x = amount * (.05 + .10 * pulse);
      torso.rotation.z = -amount * .07 * half;
      for (const leg of legs) {
        leg.hip.rotation.z = leg.side * amount * (.40 + .035 * pulse);
        leg.hip.rotation.x = -amount * (.21 + .13 * pulse);
        leg.knee.rotation.x = amount * (.43 + .26 * pulse);
        leg.foot.rotation.y = leg.side * amount * .24;
      }
      for (const arm of arms) {
        arm.shoulder.rotation.z = arm.side * (-.18 - amount * .17);
        arm.shoulder.rotation.x = -amount * (.38 + .10 * pulse);
        arm.elbow.rotation.x = -.12 - amount * (.27 + .12 * pulse);
        arm.elbow.rotation.z = arm.side * amount * -.10;
        arm.wrist.rotation.y = arm.side * amount * .20;
      }
      hat.rotation.z = amount * .035 * Math.sin(beat + .5);
    }

    if (motion === 'hat') {
      const phase = ((gesture % 3.6) + 3.6) % 3.6;
      const reach = smooth(0, .55, phase) * (1 - smooth(2.45, 3.4, phase));
      const flourish = smooth(1.5, 2.2, phase) * (1 - smooth(2.65, 3.5, phase));
      const wobbleTime = Math.max(0, phase - .55);
      const wobble = Math.sin(wobbleTime * 19) * Math.exp(-wobbleTime * 1.5) * smooth(.5, .7, phase);
      const right = arms[1], left = arms[0];
      right.shoulder.rotation.x += (-.72 * amount - right.shoulder.rotation.x) * reach;
      right.shoulder.rotation.z += (1.95 * amount - right.shoulder.rotation.z) * reach;
      right.elbow.rotation.x += (-1.1 * amount - right.elbow.rotation.x) * reach;
      right.elbow.rotation.z = amount * .18 * reach;
      right.wrist.rotation.z = -amount * .7 * reach;
      left.shoulder.rotation.z -= amount * .90 * flourish;
      torso.rotation.z -= amount * .1 * flourish;
      headPivot.rotation.x += amount * .1 * reach;
      headPivot.rotation.z += amount * .10 * wobble;
      hat.rotation.z = amount * .27 * wobble;
      hat.rotation.x = -amount * .09 * reach;
      hat.position.y += amount * .015 * Math.abs(wobble);
      cap.rotation.z = amount * .23 * wobble;
      cap.rotation.x = -amount * .075 * reach;
    } else if (motion === 'flarhgunnstow') {
      // The tiny desktop dance: heel-out steps, two-foot hops and raised-elbow pumps.
      const cycle = gesture * TAU / 2.4;
      const step = Math.sin(cycle), pulse = Math.sin(cycle * 2);
      const hop = Math.pow(Math.max(0, Math.cos(cycle * 2)), 3);
      const crouch = .5 + .5 * Math.sin(cycle * 2 - .45);
      pelvis.position.x = amount * .045 * step;
      pelvis.rotation.y = amount * .045 * step;
      pelvis.rotation.z = amount * .035 * step;
      torso.rotation.x = amount * (.075 + .055 * crouch);
      torso.rotation.y = -amount * .035 * step;
      torso.rotation.z = -amount * .045 * step;
      headPivot.rotation.x = -amount * .035 * pulse;
      headPivot.rotation.y = -amount * .01 * step;
      headPivot.rotation.z = amount * .025 * step;
      liftOff = reduced ? 0 : amount * .09 * hop;
      for (const arm of arms) {
        const pump = Math.sin(cycle * 2 - .25 + arm.side * .28);
        arm.shoulder.rotation.set(-amount * .20, 0, arm.side * (.16 + amount * (1.55 + .10 * pulse)));
        arm.elbow.rotation.set(-amount * .32, 0, arm.side * amount * (.15 + .94 * pump));
        arm.wrist.rotation.set(-amount * .16 * pump, arm.side * amount * .16, arm.side * amount * .12 * pump);
      }
      for (const leg of legs) {
        const heelOut = Math.pow(Math.max(0, leg.side * step), 3);
        leg.hip.rotation.x = -amount * (.21 + .39 * heelOut + .10 * crouch * (1 - heelOut));
        leg.hip.rotation.z = leg.side * amount * (.24 + .18 * heelOut);
        leg.knee.rotation.x = amount * (.44 + .22 * crouch) * (1 - .79 * heelOut);
        leg.foot.rotation.y = leg.side * amount * (.13 + .44 * heelOut);
      }
      hat.rotation.z = amount * .035 * step;
      hat.rotation.x = -amount * .025 * pulse;
    } else if (motion === 'nude') {
      const shimmy = Math.sin(beat * 2);
      torso.rotation.y = amount * .24 * shimmy;
      pelvis.rotation.y = -amount * .15 * shimmy;
      pelvis.rotation.z = amount * .08 * s;
      headPivot.rotation.y = -amount * .12 * shimmy;
      for (const arm of arms) {
        arm.shoulder.rotation.z = arm.side * (.12 + amount * .38);
        arm.shoulder.rotation.x = -amount * .17;
        arm.elbow.rotation.x = -.6 - amount * (.55 + .15 * Math.sin(beat + arm.side));
        arm.wrist.rotation.z = arm.side * amount * .25 * shimmy;
      }
    }
    // Plant the lowest sole without changing limb lengths, including the deeper Tayne crouch.
    pelvis.updateMatrix();
    let lowest = Infinity;
    for (const leg of legs) {
      leg.foot.rotation.x = -leg.hip.rotation.x - leg.knee.rotation.x;
      leg.foot.rotation.z = -leg.hip.rotation.z - pelvis.rotation.z;
      leg.hip.updateMatrix(); leg.knee.updateMatrix(); leg.foot.updateMatrix();
      footMatrix.multiplyMatrices(pelvis.matrix, leg.hip.matrix).multiply(leg.knee.matrix).multiply(leg.foot.matrix);
      for (const point of solePoints) lowest = Math.min(lowest, footPoint.set(...point).applyMatrix4(footMatrix).y);
    }
    pelvis.position.y += -lowest + liftOff;
    return root;
  }

  root.userData.animate = animate;
  root.userData.setVariant = setVariant;
  root.userData.setSmile = setSmile;
  root.setSmile = setSmile;
  root.setVariant = setVariant;
  root.userData.dispose = () => {
    const geometries = new Set(), ownedMaterials = new Set(Object.values(materials));
    ownedMaterials.add(censorMat);
    root.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    ownedMaterials.forEach(material => material.dispose());
  };
  setVariant(variant);
  animate(0, {intensity: 0});
  return root;
}
