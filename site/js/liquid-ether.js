(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  function initLiquidEther(container, opts) {
    opts = opts || {};

    var colors = opts.colors || ['#00b4d8', '#48cae4', '#ffb703', '#fb8500', '#f97316'];
    var mouseForce = opts.mouseForce || 25;
    var cursorSize = opts.cursorSize || 120;
    var resolution = opts.resolution || 0.4;
    var autoDemo = opts.autoDemo !== false;
    var autoSpeed = opts.autoSpeed || 0.4;
    var autoIntensity = opts.autoIntensity || 2.5;
    var takeoverDuration = opts.takeoverDuration || 0.3;
    var autoResumeDelay = opts.autoResumeDelay || 2000;
    var autoRampDuration = opts.autoRampDuration || 0.8;
    var isViscous = opts.isViscous || false;
    var viscous = opts.viscous || 30;
    var iterationsViscous = opts.iterationsViscous || 32;
    var iterationsPoisson = opts.iterationsPoisson || 32;
    var dt = opts.dt || 0.014;
    var BFECC = opts.BFECC !== false;
    var isBounce = opts.isBounce || false;

    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    function makePaletteTexture(stops) {
      var arr = (Array.isArray(stops) && stops.length > 0) ? stops : ['#ffffff', '#ffffff'];
      var w = arr.length;
      var data = new Uint8Array(w * 4);
      for (var i = 0; i < w; i++) {
        var c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      var tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    var paletteTex = makePaletteTexture(colors);
    var bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    var Common = { width: 0, height: 0, aspect: 1, pixelRatio: 1, time: 0, delta: 0, container: null, renderer: null, clock: null };
    Common.init = function (c) {
      this.container = c;
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.resize();
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.autoClear = false;
      this.renderer.setClearColor(new THREE.Color(0x000000), 0);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.clock = new THREE.Clock();
      this.clock.start();
    };
    Common.resize = function () {
      if (!this.container) return;
      var rect = this.container.getBoundingClientRect();
      this.width = Math.max(1, Math.floor(rect.width));
      this.height = Math.max(1, Math.floor(rect.height));
      this.aspect = this.width / this.height;
      if (this.renderer) this.renderer.setSize(this.width, this.height, false);
    };
    Common.update = function () {
      this.delta = this.clock.getDelta();
      this.time += this.delta;
    };

    var Mouse = { mouseMoved: false, coords: new THREE.Vector2(), coords_old: new THREE.Vector2(), diff: new THREE.Vector2(), isHoverInside: false, hasUserControl: false, isAutoActive: false, autoIntensity: autoIntensity, takeoverActive: false, takeoverStartTime: 0, takeoverDuration: takeoverDuration, takeoverFrom: new THREE.Vector2(), takeoverTo: new THREE.Vector2(), onInteract: null, _timer: null, _container: null };
    Mouse._onMouseMove = function (event) {
      if (!Mouse._updateHover(event.clientX, event.clientY)) return;
      if (Mouse.onInteract) Mouse.onInteract();
      if (Mouse.isAutoActive && !Mouse.hasUserControl && !Mouse.takeoverActive) {
        if (!Mouse._container) return;
        var rect = Mouse._container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        var nx = (event.clientX - rect.left) / rect.width;
        var ny = (event.clientY - rect.top) / rect.height;
        Mouse.takeoverFrom.copy(Mouse.coords);
        Mouse.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1));
        Mouse.takeoverStartTime = performance.now();
        Mouse.takeoverActive = true;
        Mouse.hasUserControl = true;
        Mouse.isAutoActive = false;
        return;
      }
      Mouse._setCoords(event.clientX, event.clientY);
      Mouse.hasUserControl = true;
    };
    Mouse._onTouchStart = function (event) {
      if (event.touches.length !== 1) return;
      var t = event.touches[0];
      if (!Mouse._updateHover(t.clientX, t.clientY)) return;
      if (Mouse.onInteract) Mouse.onInteract();
      Mouse._setCoords(t.clientX, t.clientY);
      Mouse.hasUserControl = true;
    };
    Mouse._onTouchMove = function (event) {
      if (event.touches.length !== 1) return;
      var t = event.touches[0];
      if (!Mouse._updateHover(t.clientX, t.clientY)) return;
      if (Mouse.onInteract) Mouse.onInteract();
      Mouse._setCoords(t.clientX, t.clientY);
    };
    Mouse._onTouchEnd = function () { Mouse.isHoverInside = false; };
    Mouse._onLeave = function () { Mouse.isHoverInside = false; };
    Mouse._isInside = function (cx, cy) {
      if (!Mouse._container) return false;
      var rect = Mouse._container.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
    };
    Mouse._updateHover = function (cx, cy) { Mouse.isHoverInside = Mouse._isInside(cx, cy); return Mouse.isHoverInside; };
    Mouse._setCoords = function (x, y) {
      if (!Mouse._container) return;
      if (Mouse._timer) window.clearTimeout(Mouse._timer);
      var rect = Mouse._container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      var nx = (x - rect.left) / rect.width;
      var ny = (y - rect.top) / rect.height;
      Mouse.coords.set(nx * 2 - 1, -(ny * 2 - 1));
      Mouse.mouseMoved = true;
      Mouse._timer = window.setTimeout(function () { Mouse.mouseMoved = false; }, 100);
    };
    Mouse.setNormalized = function (nx, ny) { Mouse.coords.set(nx, ny); Mouse.mouseMoved = true; };
    Mouse.init = function (container) {
      Mouse._container = container;
      var doc = container.ownerDocument || document;
      var win = doc.defaultView || window;
      win.addEventListener('mousemove', Mouse._onMouseMove);
      win.addEventListener('touchstart', Mouse._onTouchStart, { passive: true });
      win.addEventListener('touchmove', Mouse._onTouchMove, { passive: true });
      win.addEventListener('touchend', Mouse._onTouchEnd);
      doc.addEventListener('mouseleave', Mouse._onLeave);
      Mouse._dispose = function () {
        win.removeEventListener('mousemove', Mouse._onMouseMove);
        win.removeEventListener('touchstart', Mouse._onTouchStart);
        win.removeEventListener('touchmove', Mouse._onTouchMove);
        win.removeEventListener('touchend', Mouse._onTouchEnd);
        doc.removeEventListener('mouseleave', Mouse._onLeave);
      };
    };
    Mouse.update = function () {
      if (Mouse.takeoverActive) {
        var t = (performance.now() - Mouse.takeoverStartTime) / (Mouse.takeoverDuration * 1000);
        if (t >= 1) {
          Mouse.takeoverActive = false;
          Mouse.coords.copy(Mouse.takeoverTo);
          Mouse.coords_old.copy(Mouse.coords);
          Mouse.diff.set(0, 0);
        } else {
          var k = t * t * (3 - 2 * t);
          Mouse.coords.copy(Mouse.takeoverFrom).lerp(Mouse.takeoverTo, k);
        }
      }
      Mouse.diff.subVectors(Mouse.coords, Mouse.coords_old);
      Mouse.coords_old.copy(Mouse.coords);
      if (Mouse.coords_old.x === 0 && Mouse.coords_old.y === 0) Mouse.diff.set(0, 0);
      if (Mouse.isAutoActive && !Mouse.takeoverActive) Mouse.diff.multiplyScalar(Mouse.autoIntensity);
    };

    var AutoDriver = { enabled: autoDemo, speed: autoSpeed, resumeDelay: autoResumeDelay, rampDurationMs: autoRampDuration * 1000, active: false, current: new THREE.Vector2(0, 0), target: new THREE.Vector2(), lastTime: performance.now(), activationTime: 0, margin: 0.2, _tmpDir: new THREE.Vector2(), lastUserInteraction: performance.now() };
    AutoDriver.pickTarget = function () { AutoDriver.target.set((Math.random() * 2 - 1) * (1 - AutoDriver.margin), (Math.random() * 2 - 1) * (1 - AutoDriver.margin)); };
    AutoDriver.forceStop = function () { AutoDriver.active = false; Mouse.isAutoActive = false; };
    AutoDriver.onInteract = function () { AutoDriver.lastUserInteraction = performance.now(); if (AutoDriver.active) AutoDriver.forceStop(); };
    AutoDriver.pickTarget();
    Mouse.onInteract = AutoDriver.onInteract;
    AutoDriver.update = function () {
      if (!AutoDriver.enabled) return;
      var now = performance.now();
      var idle = now - AutoDriver.lastUserInteraction;
      if (idle < AutoDriver.resumeDelay) { if (AutoDriver.active) AutoDriver.forceStop(); return; }
      if (Mouse.isHoverInside) { if (AutoDriver.active) AutoDriver.forceStop(); return; }
      if (!AutoDriver.active) { AutoDriver.active = true; AutoDriver.current.copy(Mouse.coords); AutoDriver.lastTime = now; AutoDriver.activationTime = now; }
      if (!AutoDriver.active) return;
      Mouse.isAutoActive = true;
      var dtSec = (now - AutoDriver.lastTime) / 1000;
      AutoDriver.lastTime = now;
      if (dtSec > 0.2) dtSec = 0.016;
      var dir = AutoDriver._tmpDir.subVectors(AutoDriver.target, AutoDriver.current);
      var dist = dir.length();
      if (dist < 0.01) { AutoDriver.pickTarget(); return; }
      dir.normalize();
      var ramp = 1;
      if (AutoDriver.rampDurationMs > 0) { var t = Math.min(1, (now - AutoDriver.activationTime) / AutoDriver.rampDurationMs); ramp = t * t * (3 - 2 * t); }
      var step = AutoDriver.speed * dtSec * ramp;
      var move = Math.min(step, dist);
      AutoDriver.current.addScaledVector(dir, move);
      Mouse.setNormalized(AutoDriver.current.x, AutoDriver.current.y);
    };

    var face_vert = 'attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}';
    var line_vert = 'attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}';
    var mouse_vert = 'precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}';
    var advection_frag = 'precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}';
    var color_frag = 'precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}';
    var divergence_frag = 'precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}';
    var externalForce_frag = 'precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}';
    var poisson_frag = 'precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}';
    var pressure_frag = 'precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float step=1.0;float p0=texture2D(pressure,uv+vec2(px.x*step,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*step,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*step)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*step)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}';
    var viscous_frag = 'precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}';

    function ShaderPass(props) { this.props = props || {}; this.uniforms = props.material && props.material.uniforms; this.scene = null; this.camera = null; this.material = null; this.geometry = null; this.plane = null; }
    ShaderPass.prototype.init = function () {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      if (this.uniforms) { this.material = new THREE.RawShaderMaterial(this.props.material); this.geometry = new THREE.PlaneGeometry(2, 2); this.plane = new THREE.Mesh(this.geometry, this.material); this.scene.add(this.plane); }
    };
    ShaderPass.prototype.update = function () { Common.renderer.setRenderTarget(this.props.output || null); Common.renderer.render(this.scene, this.camera); Common.renderer.setRenderTarget(null); };

    function Advection(simProps) { ShaderPass.call(this, { material: { vertexShader: face_vert, fragmentShader: advection_frag, uniforms: { boundarySpace: { value: simProps.cellScale }, px: { value: simProps.cellScale }, fboSize: { value: simProps.fboSize }, velocity: { value: simProps.src.texture }, dt: { value: simProps.dt }, isBFECC: { value: true } } }, output: simProps.dst }); this.init(); this._createBoundary(); }
    Advection.prototype = Object.create(ShaderPass.prototype);
    Advection.prototype._createBoundary = function () {
      var bg = new THREE.BufferGeometry();
      var verts = new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]);
      bg.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      var bm = new THREE.RawShaderMaterial({ vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms });
      this.line = new THREE.LineSegments(bg, bm);
      this.scene.add(this.line);
    };
    Advection.prototype.update = function (p) { this.uniforms.dt.value = p.dt; this.line.visible = p.isBounce; this.uniforms.isBFECC.value = p.BFECC; ShaderPass.prototype.update.call(this); };

    function ExternalForce(simProps) { ShaderPass.call(this, { output: simProps.dst }); this._init(simProps); }
    ExternalForce.prototype = Object.create(ShaderPass.prototype);
    ExternalForce.prototype._init = function (simProps) { ShaderPass.prototype.init.call(this); var mg = new THREE.PlaneGeometry(1, 1); var mm = new THREE.RawShaderMaterial({ vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { px: { value: simProps.cellScale }, force: { value: new THREE.Vector2(0, 0) }, center: { value: new THREE.Vector2(0, 0) }, scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) } } }); this.mouse = new THREE.Mesh(mg, mm); this.scene.add(this.mouse); };
    ExternalForce.prototype.update = function (p) {
      var fx = (Mouse.diff.x / 2) * p.mouse_force;
      var fy = (Mouse.diff.y / 2) * p.mouse_force;
      var csx = p.cursor_size * p.cellScale.x;
      var csy = p.cursor_size * p.cellScale.y;
      var cx = Math.min(Math.max(Mouse.coords.x, -1 + csx + p.cellScale.x * 2), 1 - csx - p.cellScale.x * 2);
      var cy = Math.min(Math.max(Mouse.coords.y, -1 + csy + p.cellScale.y * 2), 1 - csy - p.cellScale.y * 2);
      var u = this.mouse.material.uniforms;
      u.force.value.set(fx, fy);
      u.center.value.set(cx, cy);
      u.scale.value.set(p.cursor_size, p.cursor_size);
      ShaderPass.prototype.update.call(this);
    };

    function Viscous(simProps) { ShaderPass.call(this, { material: { vertexShader: face_vert, fragmentShader: viscous_frag, uniforms: { boundarySpace: { value: simProps.boundarySpace }, velocity: { value: simProps.src.texture }, velocity_new: { value: simProps.dst_.texture }, v: { value: simProps.viscous }, px: { value: simProps.cellScale }, dt: { value: simProps.dt } } }, output: simProps.dst, output0: simProps.dst_, output1: simProps.dst }); ShaderPass.prototype.init.call(this); }
    Viscous.prototype = Object.create(ShaderPass.prototype);
    Viscous.prototype.update = function (p) {
      var fbo_in, fbo_out;
      this.uniforms.v.value = p.viscous;
      for (var i = 0; i < p.iterations; i++) {
        if (i % 2 === 0) { fbo_in = this.props.output0; fbo_out = this.props.output1; } else { fbo_in = this.props.output1; fbo_out = this.props.output0; }
        this.uniforms.velocity_new.value = fbo_in.texture;
        this.props.output = fbo_out;
        this.uniforms.dt.value = p.dt;
        ShaderPass.prototype.update.call(this);
      }
      return fbo_out;
    };

    function Divergence(simProps) { ShaderPass.call(this, { material: { vertexShader: face_vert, fragmentShader: divergence_frag, uniforms: { boundarySpace: { value: simProps.boundarySpace }, velocity: { value: simProps.src.texture }, px: { value: simProps.cellScale }, dt: { value: simProps.dt } } }, output: simProps.dst }); ShaderPass.prototype.init.call(this); }
    Divergence.prototype = Object.create(ShaderPass.prototype);
    Divergence.prototype.update = function (p) { this.uniforms.velocity.value = p.vel.texture; ShaderPass.prototype.update.call(this); };

    function Poisson(simProps) { ShaderPass.call(this, { material: { vertexShader: face_vert, fragmentShader: poisson_frag, uniforms: { boundarySpace: { value: simProps.boundarySpace }, pressure: { value: simProps.dst_.texture }, divergence: { value: simProps.src.texture }, px: { value: simProps.cellScale } } }, output: simProps.dst, output0: simProps.dst_, output1: simProps.dst }); ShaderPass.prototype.init.call(this); }
    Poisson.prototype = Object.create(ShaderPass.prototype);
    Poisson.prototype.update = function (p) {
      var p_in, p_out;
      for (var i = 0; i < p.iterations; i++) {
        if (i % 2 === 0) { p_in = this.props.output0; p_out = this.props.output1; } else { p_in = this.props.output1; p_out = this.props.output0; }
        this.uniforms.pressure.value = p_in.texture;
        this.props.output = p_out;
        ShaderPass.prototype.update.call(this);
      }
      return p_out;
    };

    function Pressure(simProps) { ShaderPass.call(this, { material: { vertexShader: face_vert, fragmentShader: pressure_frag, uniforms: { boundarySpace: { value: simProps.boundarySpace }, pressure: { value: simProps.src_p.texture }, velocity: { value: simProps.src_v.texture }, px: { value: simProps.cellScale }, dt: { value: simProps.dt } } }, output: simProps.dst }); ShaderPass.prototype.init.call(this); }
    Pressure.prototype = Object.create(ShaderPass.prototype);
    Pressure.prototype.update = function (p) { this.uniforms.velocity.value = p.vel.texture; this.uniforms.pressure.value = p.pressure.texture; ShaderPass.prototype.update.call(this); };

    var fboSize = new THREE.Vector2();
    var cellScale = new THREE.Vector2();
    var boundarySpace = new THREE.Vector2();
    var fbos = { vel_0: null, vel_1: null, vel_viscous0: null, vel_viscous1: null, div: null, pressure_0: null, pressure_1: null };

    function calcSize() {
      var w = Math.max(1, Math.round(resolution * Common.width));
      var h = Math.max(1, Math.round(resolution * Common.height));
      cellScale.set(1 / w, 1 / h);
      fboSize.set(w, h);
    }

    function getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }

    function createAllFBO() {
      var type = getFloatType();
      var opts = { type: type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
      for (var key in fbos) { fbos[key] = new THREE.WebGLRenderTarget(fboSize.x, fboSize.y, opts); }
    }

    var advection, externalForce, viscousPass, divergence, poisson, pressure;

    function createShaderPass() {
      advection = new Advection({ cellScale: cellScale, fboSize: fboSize, dt: dt, src: fbos.vel_0, dst: fbos.vel_1 });
      externalForce = new ExternalForce({ cellScale: cellScale, cursor_size: cursorSize, dst: fbos.vel_1 });
      viscousPass = new Viscous({ cellScale: cellScale, boundarySpace: boundarySpace, viscous: viscous, src: fbos.vel_1, dst: fbos.vel_viscous1, dst_: fbos.vel_viscous0, dt: dt });
      divergence = new Divergence({ cellScale: cellScale, boundarySpace: boundarySpace, src: fbos.vel_viscous0, dst: fbos.div, dt: dt });
      poisson = new Poisson({ cellScale: cellScale, boundarySpace: boundarySpace, src: fbos.div, dst: fbos.pressure_1, dst_: fbos.pressure_0 });
      pressure = new Pressure({ cellScale: cellScale, boundarySpace: boundarySpace, src_p: fbos.pressure_0, src_v: fbos.vel_viscous0, dst: fbos.vel_0, dt: dt });
    }

    function resizeAll() {
      calcSize();
      for (var key in fbos) { fbos[key].setSize(fboSize.x, fboSize.y); }
    }

    var outputScene, outputCamera, outputMesh;

    function initOutput() {
      outputScene = new THREE.Scene();
      outputCamera = new THREE.Camera();
      outputMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.RawShaderMaterial({
          vertexShader: face_vert,
          fragmentShader: color_frag,
          transparent: true,
          depthWrite: false,
          uniforms: { velocity: { value: fbos.vel_0.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } }
        })
      );
      outputScene.add(outputMesh);
    }

    function simUpdate() {
      boundarySpace.set(isBounce ? 0 : cellScale.x, isBounce ? 0 : cellScale.y);
      advection.update({ dt: dt, isBounce: isBounce, BFECC: BFECC });
      externalForce.update({ cursor_size: cursorSize, mouse_force: mouseForce, cellScale: cellScale });
      var vel = fbos.vel_1;
      if (isViscous) { vel = viscousPass.update({ viscous: viscous, iterations: iterationsViscous, dt: dt }); }
      divergence.update({ vel: vel });
      var pResult = poisson.update({ iterations: iterationsPoisson });
      pressure.update({ vel: vel, pressure: pResult });
    }

    function renderOutput() {
      Common.renderer.setRenderTarget(null);
      Common.renderer.render(outputScene, outputCamera);
    }

    var running = false;
    var rafId = null;

    function loop() {
      if (!running) return;
      AutoDriver.update();
      Mouse.update();
      Common.update();
      simUpdate();
      renderOutput();
      rafId = requestAnimationFrame(loop);
    }

    function start() { if (running) return; running = true; loop(); }
    function pause() { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    function onResize() { Common.resize(); resizeAll(); }

    // Initialize
    Common.init(container);
    Mouse.init(container);
    Mouse.autoIntensity = autoIntensity;
    Mouse.takeoverDuration = takeoverDuration;
    calcSize();
    createAllFBO();
    createShaderPass();
    initOutput();
    container.prepend(Common.renderer.domElement);

    window.addEventListener('resize', onResize);
    var visibilityHandler = function () { if (document.hidden) { pause(); } else { start(); } };
    document.addEventListener('visibilitychange', visibilityHandler);

    start();

    return {
      dispose: function () {
        pause();
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', visibilityHandler);
        if (Mouse._dispose) Mouse._dispose();
        if (Common.renderer) { var c = Common.renderer.domElement; if (c && c.parentNode) c.parentNode.removeChild(c); Common.renderer.dispose(); Common.renderer.forceContextLoss(); }
      },
      resize: onResize
    };
  }

  window.initLiquidEther = initLiquidEther;
})();
