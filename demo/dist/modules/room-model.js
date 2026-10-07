/** A very large room for a very small, very important computer. */
export function createBlueRoom(THREE) {
  const group = new THREE.Group();
  group.name = 'The blue computer room';
  const computerTargets = [];
  const screenCenter = new THREE.Vector3(0, 2.25, .62);
  const screenWidth = 2.45;
  const screenHeight = 1.8375;
  const TAU = Math.PI * 2;

  function canvasTexture(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Broad photographic highlights keep the chrome legible without external assets.
  const reflections = canvasTexture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#626fa1');
    gradient.addColorStop(.32, '#b8c5d5');
    gradient.addColorStop(.44, '#f2f2e8');
    gradient.addColorStop(.48, '#1a335f');
    gradient.addColorStop(.64, '#1b2c55');
    gradient.addColorStop(1, '#02091d');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2f3e9'; ctx.fillRect(61, 18, 65, 109);
    ctx.fillStyle = '#a9bdd2'; ctx.fillRect(352, 35, 43, 83);
    ctx.fillStyle = '#344a73'; ctx.fillRect(214, 0, 25, h);
  });
  reflections.mapping = THREE.EquirectangularReflectionMapping;

  const chrome = new THREE.MeshStandardMaterial({ color: '#c8ccd1', metalness: .9, roughness: .23, envMap: reflections, envMapIntensity: .72 });
  const brushed = new THREE.MeshStandardMaterial({ color: '#a5afb9', metalness: .7, roughness: .4, envMap: reflections, envMapIntensity: .52 });
  const silver = new THREE.MeshStandardMaterial({ color: '#c3c5c7', metalness: .55, roughness: .38, envMap: reflections, envMapIntensity: .4 });
  const darkSilver = new THREE.MeshStandardMaterial({ color: '#565f6e', metalness: .7, roughness: .43, envMap: reflections, envMapIntensity: .45 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#101219', roughness: .9, metalness: .02 });
  const charcoal = new THREE.MeshStandardMaterial({ color: '#24252a', roughness: .66, metalness: .1 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#e5e1d5', roughness: .32, metalness: .04 });
  const black = new THREE.MeshStandardMaterial({ color: '#090d14', roughness: .68 });
  const wallTexture = canvasTexture(1536, 768, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w * TAU;
        const band = Math.pow(.5 + .5 * Math.sin(u * 7 + .5 * Math.sin(u * 3)), 3);
        const broad = .5 + .5 * Math.sin(u * 3 + 1.5);
        const height = .36 + .64 * Math.sin(y / h * Math.PI * .84);
        const line = x % 13 === 0 ? -.035 : 0;
        const scan = y % 36 === 0 ? -.015 : 0;
        const light = Math.max(0, Math.min(1, (.17 + band * .6 + broad * .28) * height + line + scan));
        const i = (y * w + x) * 4;
        pixels.data[i] = 5 + light * 16;
        pixels.data[i + 1] = 43 + light * 154;
        pixels.data[i + 2] = 154 + light * 85;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: wallTexture, emissive: '#ffffff', emissiveMap: wallTexture, emissiveIntensity: .65, roughness: .9, metalness: 0, side: THREE.BackSide });
  const ribMaterial = new THREE.MeshBasicMaterial({ color: '#60c9f8', transparent: true, opacity: .075, depthWrite: false });
  const seamMaterial = new THREE.MeshBasicMaterial({ color: '#74c5fa', transparent: true, opacity: .045, depthWrite: false });

  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = group) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, material, x, y, z, parent = group) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  }
  function roundedShape(w, h, radius) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    const r = Math.min(radius, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function roundedGeometry(w, h, d, radius = .08, bevel = .025) {
    const b = Math.min(bevel, d * .45, radius * .8);
    const geometry = new THREE.ExtrudeGeometry(roundedShape(w - b * 2, h - b * 2, Math.max(.005, radius - b)), {
      depth: d - b * 2, bevelEnabled: true, bevelSegments: 3,
      steps: 1, bevelSize: b, bevelThickness: b, curveSegments: 6,
    });
    geometry.translate(0, 0, -d / 2 + b);
    return geometry;
  }
  function rounded(w, h, d, radius, material, x, y, z, parent = group, bevel = .025) {
    return mesh(roundedGeometry(w, h, d, radius, bevel), material, x, y, z, parent);
  }
  function rod(a, b, radius, material, parent = group, sides = 10) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), sides), material, 0, 0, 0, parent);
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return object;
  }

  // A continuous cylindrical chamber. Deep vertical fluting, not luminous stripes.
  const wall = mesh(new THREE.CylinderGeometry(14.1, 14.1, 20, 128, 1, true), wallMaterial, 0, 3, 0);
  wall.name = 'Cobalt chamber'; wall.castShadow = false;
  const ribGeometry = new THREE.BoxGeometry(.085, 20, .18);
  const ribs = new THREE.InstancedMesh(ribGeometry, ribMaterial, 112);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 112; i++) {
    const angle = i / 112 * TAU;
    dummy.position.set(Math.sin(angle) * 14, 3, Math.cos(angle) * 14);
    dummy.rotation.set(0, angle, 0); dummy.updateMatrix();
    ribs.setMatrixAt(i, dummy.matrix);
  }
  ribs.receiveShadow = true; group.add(ribs);
  for (const y of [-3.7, 1.7, 7.1, 12.8]) {
    const seam = mesh(new THREE.TorusGeometry(13.995, .043, 6, 128), seamMaterial, 0, y, 0);
    seam.rotation.x = Math.PI / 2; seam.castShadow = false;
  }
  const abyss = mesh(new THREE.CircleGeometry(14.05, 96), new THREE.MeshStandardMaterial({ color: '#010821', roughness: 1 }), 0, -6.95, 0);
  abyss.rotation.x = -Math.PI / 2; abyss.castShadow = false;

  // A circular, dark platform floats inside its broad polished-silver rim.
  const platformRim = mesh(new THREE.CylinderGeometry(3.55, 3.55, .27, 112), chrome, 0, -.195, .05);
  platformRim.name = 'Floating circular platform';
  mesh(new THREE.CylinderGeometry(3.27, 3.27, .017, 112), charcoal, 0, -.052, .05);
  const rimBead = mesh(new THREE.TorusGeometry(3.51, .024, 8, 112), silver, 0, -.053, .05);
  rimBead.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(3.42, 3.5, .15, 112), darkSilver, 0, -.385, .05);

  // Ribbed metal walkway: narrow, open-edged, and suspended above the blue void.
  box(2.42, .14, 14.4, darkSilver, 0, -.13, 10.1);
  const treadMaterial = new THREE.MeshStandardMaterial({ color: '#aebbc4', roughness: .49, metalness: .63, envMap: reflections, envMapIntensity: .35 });
  const treadGeometry = new THREE.BoxGeometry(2.34, .035, .144);
  const treads = new THREE.InstancedMesh(treadGeometry, treadMaterial, 83);
  for (let i = 0; i < 83; i++) {
    dummy.position.set(0, -.045, 3.42 + i * .167);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); treads.setMatrixAt(i, dummy.matrix);
  }
  treads.receiveShadow = true; group.add(treads);
  box(.045, .065, 14.4, chrome, -1.205, -.045, 10.1);
  box(.045, .065, 14.4, chrome, 1.205, -.045, 10.1);
  for (const x of [-.85, .85]) box(.09, .14, 14.25, darkSilver, x, -.258, 10.1);

  // Thin metal desktop on an open, square-tube chrome frame, as in the sketch.
  const desktop = rounded(6.30, 1.98, .062, .15, chrome, -.40, 1.12, .05);
  desktop.rotation.x = -Math.PI / 2;
  const topInset = rounded(6.19, 1.88, .009, .125, brushed, -.40, 1.157, .05);
  topInset.rotation.x = -Math.PI / 2;
  for (const x of [-2.82, 2.12]) {
    for (const z of [-.69, .81]) {
      box(.045, 1.10, .045, chrome, x, .53, z);
      box(.055, .025, .055, rubber, x, -.006, z);
    }
    box(.045, .045, 1.54, chrome, x, 1.045, .06);
    box(.045, .038, 1.54, chrome, x, .12, .06);
  }
  for (const z of [-.69, .81]) box(4.98, .052, .048, chrome, -.35, 1.045, z);
  box(4.98, .038, .038, chrome, -.35, .29, -.69);
  // A slim keyboard tray has its own visible metal runners.
  rounded(2.14, .045, .62, .042, charcoal, -.16, 1.132, 1.018, group, .012);
  for (const x of [-.99, .67]) box(.026, .035, .81, chrome, x, 1.078, .95);

  // The main flat display stays perfectly axis aligned for the live HTML screen.
  const monitorShell = rounded(2.65, 2.045, .155, .035, charcoal, 0, 2.25, .526, group, .017);
  computerTargets.push(monitorShell);
  const screenSurround = rounded(2.49, 1.88, .01, .012, black, 0, 2.25, .61, group, .003);
  computerTargets.push(screenSurround);
  box(.12, .38, .095, charcoal, 0, 1.40, .39);
  const monitorBase = rounded(.72, .043, .42, .15, charcoal, 0, 1.185, .40, group, .014);
  computerTargets.push(monitorBase);
  const ledMaterial = new THREE.MeshBasicMaterial({ color: '#96dfe8' });
  const led = mesh(new THREE.SphereGeometry(.009, 8, 6), ledMaterial, 1.195, 1.274, .608);
  const labelTexture = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#24252a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b7bcc0'; ctx.font = '500 29px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('C I N C O', w / 2, 42);
  });
  const badge = mesh(new THREE.PlaneGeometry(.25, .058), new THREE.MeshBasicMaterial({ map: labelTexture }), 0, 1.275, .608);
  badge.castShadow = false;

  const desktopTexture = canvasTexture(800, 600, (ctx, w, h) => {
    ctx.fillStyle = '#368f92'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#062629'; ctx.fillRect(90, 73, 641, 451);
    ctx.fillStyle = '#c4c7c2'; ctx.fillRect(81, 64, 641, 451);
    ctx.fillStyle = '#eff0e9'; ctx.fillRect(84, 67, 635, 3); ctx.fillRect(84, 67, 3, 445);
    ctx.fillStyle = '#075256'; ctx.fillRect(91, 76, 621, 37);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.fillText('CINCO PERSONAL COMPUTER', 107, 102);
    ctx.fillStyle = '#133839'; ctx.fillRect(104, 131, 594, 336);
    ctx.fillStyle = '#d6e5d3'; ctx.font = '22px monospace';
    ctx.fillText('Good morning, Paul.', 131, 181);
    ctx.font = '18px monospace'; ctx.fillText('Your computer is ready.', 131, 223);
    ctx.fillText('Please enter a command.', 131, 264);
    ctx.fillStyle = '#8fbc9c'; ctx.fillRect(132, 301, 12, 22);
    ctx.fillStyle = '#323e40'; ctx.font = '16px monospace'; ctx.fillText('SYSTEM READY', 105, 497);
    ctx.fillStyle = '#c9cbc6'; ctx.fillRect(0, 568, 800, 32);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 568, 800, 2);
    ctx.fillStyle = '#354145'; ctx.font = 'bold 16px monospace'; ctx.fillText('CINCO', 16, 590);
    ctx.font = '15px monospace'; ctx.fillText('09:00 AM', 701, 590);
  });
  desktopTexture.minFilter = THREE.LinearFilter;
  desktopTexture.magFilter = THREE.LinearFilter;
  const screenMesh = mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), new THREE.MeshBasicMaterial({ map: desktopTexture, toneMapped: false }), ...screenCenter.toArray());
  screenMesh.name = 'Computer screen'; screenMesh.castShadow = false; screenMesh.receiveShadow = false;
  computerTargets.push(screenMesh);

  const secondDisplay = new THREE.Group();
  secondDisplay.position.set(-2.285, 2.055, .195);
  secondDisplay.rotation.y = .29;
  secondDisplay.name = 'Secondary inward-facing display';
  group.add(secondDisplay);
  computerTargets.push(secondDisplay);
  rounded(1.91, 1.48, .13, .032, charcoal, 0, 0, -.069, secondDisplay, .015);
  const secondaryScreen = mesh(new THREE.PlaneGeometry(1.745, 1.309), new THREE.MeshBasicMaterial({ map: desktopTexture, toneMapped: false }), 0, .005, .006, secondDisplay);
  secondaryScreen.castShadow = false;
  box(.10, .26, .07, charcoal, 0, -.81, -.13, secondDisplay);
  rounded(.57, .035, .37, .13, charcoal, 0, -.866, -.1, secondDisplay, .012);


  // A proper keyboard: a sloped enclosure, individual ivory keys, and a long space bar.
  const keyboard = new THREE.Group(); keyboard.position.set(-.28, 1.193, .967); keyboard.rotation.y = -.025; group.add(keyboard);
  const keyboardCase = rounded(1.52, .072, .48, .065, silver, 0, 0, 0, keyboard, .021);
  computerTargets.push(keyboardCase);
  box(1.408, .018, .383, darkSilver, 0, .036, -.013, keyboard);
  const keyGeometry = roundedGeometry(.081, .037, .063, .011, .006);
  const keyInstances = new THREE.InstancedMesh(keyGeometry, ivory, 52);
  let keyIndex = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 13; col++) {
      dummy.position.set(-.629 + col * .101 + (row % 2) * .012, .06 + (3 - row) * .003, -.139 + row * .076);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); keyInstances.setMatrixAt(keyIndex++, dummy.matrix);
    }
  }
  keyInstances.castShadow = true; keyInstances.receiveShadow = true; keyboard.add(keyInstances);
  rounded(.59, .033, .065, .012, ivory, -.07, .057, .169, keyboard, .006);
  for (const x of [-.63, -.525, .445, .55, .655]) rounded(.084, .033, .065, .012, ivory, x, .057, .169, keyboard, .006);
  const mousePad = rounded(.56, .58, .008, .075, charcoal, 1.085, 1.17, .928);
  mousePad.rotation.x = -Math.PI / 2;
  const mouse = mesh(new THREE.SphereGeometry(.13, 20, 16), silver, 1.073, 1.222, .938);
  mouse.scale.set(.69, .47, 1.02); computerTargets.push(mouse);
  box(.006, .006, .11, darkSilver, 1.073, 1.279, .901);
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.073, 1.209, .82), new THREE.Vector3(1.1, 1.179, .65),
    new THREE.Vector3(1.4, 1.172, .43), new THREE.Vector3(1.64, 1.17, .12), new THREE.Vector3(1.53, 1.153, -.4),
  ]);
  mesh(new THREE.TubeGeometry(cableCurve, 28, .008, 5, false), rubber);

  // White ceramic mug, including a visible dark interior and round handle.
  const mug = new THREE.Group(); mug.position.set(-1.88, 1.164, .78); mug.rotation.y = -.22; group.add(mug);
  const mugProfile = [
    new THREE.Vector2(0, 0), new THREE.Vector2(.105, 0), new THREE.Vector2(.12, .02),
    new THREE.Vector2(.126, .235), new THREE.Vector2(.124, .253), new THREE.Vector2(.108, .253),
    new THREE.Vector2(.106, .234), new THREE.Vector2(.101, .036), new THREE.Vector2(0, .036),
  ];
  mesh(new THREE.LatheGeometry(mugProfile, 32), ivory, 0, 0, 0, mug);
  const coffee = mesh(new THREE.CircleGeometry(.105, 32), new THREE.MeshStandardMaterial({ color: '#291a12', roughness: .27 }), 0, .219, 0, mug);
  coffee.rotation.x = -Math.PI / 2;
  const handle = mesh(new THREE.TorusGeometry(.075, .023, 10, 28), ivory, -.139, .137, 0, mug);
  handle.scale.y = 1.21;

  // Soft office upholstery: a five-star base and ten caster wheels below it.
  const fabricTexture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#292c30'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        ctx.fillStyle = ((x * 13 + y * 7) % 9 < 4) ? '#303337' : '#202327';
        ctx.fillRect(x + ((y / 3) % 2), y, 1, 2);
      }
    }
  });
  fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping; fabricTexture.repeat.set(3, 3);
  const upholstery = new THREE.MeshStandardMaterial({ color: '#4e5158', map: fabricTexture, roughness: .94, metalness: 0 });
  const chair = new THREE.Group(); chair.name = 'Paul’s chair'; chair.position.set(0, 0, 2.55); group.add(chair);
  mesh(new THREE.CylinderGeometry(.066, .073, .38, 16), chrome, 0, .34, 0, chair);
  mesh(new THREE.CylinderGeometry(.105, .115, .21, 16), rubber, 0, .26, 0, chair);
  mesh(new THREE.CylinderGeometry(.19, .15, .06, 20), charcoal, 0, .535, 0, chair);
  const seatShell = rounded(1.02, .10, .91, .16, charcoal, 0, .56, 0, chair, .035);
  const seat = rounded(.98, .17, .91, .15, upholstery, 0, .65, -.02, chair, .067);
  seat.rotation.x = -.025;
  const back = new THREE.Group(); back.position.set(0, 1.23, .405); back.rotation.x = .13; chair.add(back);
  rounded(.96, .96, .13, .19, charcoal, 0, 0, .065, back, .055);
  rounded(.89, .89, .14, .19, upholstery, 0, .015, -.043, back, .06);
  // Subtle lumbar roll gives the backrest a shaped, upholstered silhouette.
  const lumbar = mesh(new THREE.SphereGeometry(.5, 24, 16), upholstery, 0, 1.005, .308, chair);
  lumbar.scale.set(.86, .29, .19);
  for (const x of [-.37, .37]) rod([x, .55, .31], [x, 1.03, .48], .034, charcoal, chair);
  for (const side of [-1, 1]) {
    rod([side * .42, .54, .18], [side * .56, .91, .16], .028, chrome, chair);
    rod([side * .49, .63, -.24], [side * .56, .91, -.19], .028, chrome, chair);
    rounded(.135, .074, .54, .047, rubber, side * .56, .96, -.012, chair, .025);
  }
  const wheelGeometry = new THREE.CylinderGeometry(.074, .074, .045, 16);
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * TAU + .24;
    const x = Math.sin(angle) * .555, z = Math.cos(angle) * .555;
    rod([0, .244, 0], [x, .145, z], .036, chrome, chair);
    rod([x, .145, z], [x, .091, z], .026, darkSilver, chair);
    const caster = new THREE.Group(); caster.position.set(x, .074, z); caster.rotation.y = angle + .3; chair.add(caster);
    for (const wheelX of [-.037, .037]) {
      const wheel = mesh(wheelGeometry, rubber, wheelX, 0, 0, caster);
      wheel.rotation.z = Math.PI / 2;
    }
    box(.05, .08, .04, charcoal, 0, .025, 0, caster);
  }
  rod([.12, .5, -.04], [.42, .49, -.1], .014, chrome, chair);
  rounded(.13, .044, .055, .016, rubber, .45, .49, -.1, chair, .012);

  // Power and display cables droop beneath the desk, then vanish below the platform.
  const powerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.35, 1.65, .43), new THREE.Vector3(.31, 1.24, -.38),
    new THREE.Vector3(.4, .52, -.85), new THREE.Vector3(.12, .06, -.8), new THREE.Vector3(.12, -.07, -1.18),
  ]);
  mesh(new THREE.TubeGeometry(powerCurve, 28, .018, 6, false), rubber);

  return {
    group, screenMesh, screenCenter, screenWidth, screenHeight, computerTargets, chair,
    animate(t) {
      ledMaterial.color.setRGB(.56 + Math.sin(t * 1.2) * .025, .89, .53);
    },
  };
}
