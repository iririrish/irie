/* irie – effects engine (WebGL). One set of shaders is used for the live camera,
   the thumbnails, the editor preview and the final download, so they always match. */
'use strict';
(() => {
  const CATS = [
    { id: 'color', name: 'Color' },
    { id: 'warp', name: 'Distortion' },
    { id: 'art', name: 'Artistic' }
  ];

  /* Each effect is the body of `vec3 effect(vec2 uv)`. `mix:true` fades it with the strength slider;
     effects with mix:false use the strength inside (e.g. how strong the warp is). */
  const E = [
    { id: 'none', name: 'None', cat: 'none', mix: false, body: 'return src(uv);' },

    // ----- color -----
    { id: 'bw', name: 'Black & White', cat: 'color', mix: true, body: 'float l=(luma(src(uv))-.5)*1.1+.5;return vec3(l);' },
    { id: 'sepia', name: 'Sepia', cat: 'color', mix: true, body: 'vec3 c=src(uv);return vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),dot(c,vec3(.272,.534,.131)));' },
    { id: 'vintage', name: 'Vintage', cat: 'color', mix: true, body: 'vec3 c=src(uv);vec3 s=vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),dot(c,vec3(.272,.534,.131)));return mix(c,s,.5)*vec3(.92,.9,.85)+vec3(.086,.063,.055);' },
    { id: 'retro', name: 'Retro', cat: 'color', mix: true, body: 'vec3 c=src(uv);return (c-.5)*vec3(1.1,1.05,.95)+.5+vec3(.055,.016,-.055);' },
    { id: 'lomo', name: 'Lomo', cat: 'color', mix: true, body: 'vec3 c=satc(conc(src(uv),1.3),1.25)*vec3(1.04,1.,.9);vec2 q=(uv-.5)*asp();float v=1.-smoothstep(.12,.9,dot(q,q))*.85;return c*v;' },
    { id: 'warm', name: 'Warm Tone', cat: 'color', mix: true, body: 'return src(uv)*vec3(1.08,1.02,.88)+vec3(.04,.012,.0);' },
    { id: 'cool', name: 'Cool Tone', cat: 'color', mix: true, body: 'return src(uv)*vec3(.88,1.,1.1)+vec3(.0,.0,.04);' },
    { id: 'faded', name: 'Faded', cat: 'color', mix: true, body: 'return satc(src(uv),.8)*.84+vec3(.15,.133,.133);' },
    { id: 'pastel', name: 'Pastel', cat: 'color', mix: true, body: 'return satc(src(uv),.7)*.72+vec3(.275,.275,.29);' },
    { id: 'matte', name: 'Matte', cat: 'color', mix: true, body: 'return satc(src(uv),.9)*.82+vec3(.11,.11,.118);' },
    { id: 'contrast', name: 'High Contrast', cat: 'color', mix: true, body: 'return satc(conc(src(uv),1.5),1.15);' },
    { id: 'cinema', name: 'Cinematic', cat: 'color', mix: true, body: 'vec3 c=src(uv);float t=(luma(c)-.5)*.17;return satc(conc(c+vec3(t,.0,-t),1.15),.9);' },
    { id: 'negative', name: 'Negative', cat: 'color', mix: true, body: 'return vec3(1.)-src(uv);' },
    { id: 'thermal', name: 'Thermal', cat: 'color', mix: true, body: 'float t=clamp(luma(src(uv)),0.,1.)*4.;vec3 a=vec3(.0,.0,.16);vec3 b=vec3(.27,.0,.67);vec3 d=vec3(.88,.14,.24);vec3 e=vec3(1.,.69,.0);vec3 f=vec3(1.,1.,.82);vec3 r=mix(a,b,clamp(t,0.,1.));r=mix(r,d,clamp(t-1.,0.,1.));r=mix(r,e,clamp(t-2.,0.,1.));return mix(r,f,clamp(t-3.,0.,1.));' },
    { id: 'night', name: 'Night Vision', cat: 'color', mix: true, body: 'float l=luma(src(uv))*1.35;float n=(hash(floor(uv*vec2(320.,240.))+fract(u_time))-.5)*.12;return vec3(l*.15+n*.3,min(1.,l*1.05+.1)+n,l*.2+n*.3);' },
    { id: 'neon', name: 'Neon', cat: 'color', mix: true, body: 'return conc(satc(src(uv),1.9),1.25)+vec3(.04,-.03,.08);' },
    { id: 'underwater', name: 'Underwater', cat: 'color', mix: true, body: 'return src(uv)*vec3(.55,.98,1.1)+vec3(.0,.03,.09);' },
    { id: 'citrus', name: 'Citrus', cat: 'color', mix: true, body: 'return satc(src(uv)*vec3(1.06,1.1,.78)+vec3(.025),1.25);' },
    { id: 'bloom', name: 'Bloom', cat: 'color', mix: true, body: 'vec3 c=src(uv);vec3 g=vec3(0.);vec2 bp=vec2(.007,.007*u_res.x/u_res.y);for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){g+=src(uv+vec2(float(i),float(j))*bp);}}g/=25.;return satc(vec3(1.)-(vec3(1.)-c)*(vec3(1.)-g*.7),1.15);' },
    { id: 'dreamy', name: 'Dreamy', cat: 'color', mix: true, body: 'vec3 c=src(uv);vec3 g=vec3(0.);vec2 bp=vec2(.012,.012*u_res.x/u_res.y);for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){g+=src(uv+vec2(float(i),float(j))*bp);}}g/=25.;c=vec3(1.)-(vec3(1.)-c)*(vec3(1.)-g);return c*vec3(1.04,1.,1.04)+vec3(.04,.016,.055);' },

    // ----- distortion (strength is used inside) -----
    { id: 'fisheye', name: 'Fisheye', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float Rd=length(.5*A);float rn=length(p)/Rd;p*=pow(max(rn,.0001),u_k*.9);return src(p/A+.5);' },
    { id: 'bulge', name: 'Bulge', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float R=.5*min(A.x,1.);float r=length(p)/R;if(r<1.){p*=1.-u_k*.7*(1.-r*r);}return src(p/A+.5);' },
    { id: 'pinch', name: 'Pinch', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float R=.5*min(A.x,1.);float r=length(p)/R;if(r<1.){p*=1.+u_k*.8*(1.-r*r);}return src(p/A+.5);' },
    { id: 'ripple', name: 'Ripple', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float Rd=length(.5*A);float rn=length(p)/Rd;p*=1.+u_k*.05*sin(rn*38.-u_time*3.);return src(p/A+.5);' },
    { id: 'spiral', name: 'Spiral', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float R=.5*min(A.x,1.);float r=length(p)/R;p=rot(p,u_k*5.*min(r,1.));return src(p/A+.5);' },
    { id: 'twist', name: 'Twist', cat: 'warp', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float R=.5*min(A.x,1.);float r=length(p)/R;float t=max(0.,1.-r);p=rot(p,u_k*3.*t*t);return src(p/A+.5);' },
    { id: 'stretch', name: 'Stretch', cat: 'warp', mix: false, body: 'float t=1.-abs(uv.x-.5)*2.;vec2 q=uv;q.y=.5+(uv.y-.5)*(1.-u_k*.55*t*t);return src(q);' },
    { id: 'wave', name: 'Wave', cat: 'warp', mix: false, body: 'vec2 q=uv;float a=u_k*.035;q.x+=a*sin(uv.y*18.85+u_time*2.);q.y+=a*.6*sin(uv.x*12.57+u_time*2.);return src(q);' },

    // ----- artistic -----
    { id: 'cartoon', name: 'Cartoon', cat: 'art', mix: true, body: 'vec3 c=floor(satc(src(uv),1.3)*5.+.5)/5.;return c*(1.-smoothstep(.25,.6,edge(uv)));' },
    { id: 'comic', name: 'Comic Book', cat: 'art', mix: true, body: 'vec3 c=floor(satc(src(uv),1.4)*4.+.5)/4.;float l=luma(c);vec2 A=asp();vec2 g=uv*vec2(60.*A.x,60.);float dots=step(length(fract(g)-.5),(1.-l)*.6);c*=mix(1.,.55,dots);return c*(1.-smoothstep(.3,.7,edge(uv)));' },
    { id: 'sketch', name: 'Sketch', cat: 'art', mix: true, body: 'float l=luma(src(uv));float s=1.-clamp(edge(uv)*3.2,0.,1.);return vec3(.97,.95,.92)*s*mix(.8,1.,l);' },
    { id: 'pixelate', name: 'Pixelate', cat: 'art', mix: false, body: 'float cells=mix(220.,28.,u_k);vec2 cell=vec2(cells,cells*u_res.y/u_res.x);vec2 q=(floor(uv*cell)+.5)/cell;return src(q);' },
    { id: 'posterize', name: 'Posterize', cat: 'art', mix: false, body: 'float lv=mix(16.,3.,u_k);return floor(src(uv)*lv+.5)/lv;' },
    { id: 'glitch', name: 'Glitch', cat: 'art', mix: false, body: 'float t=floor(u_time*8.);float band=floor(uv.y*22.);float n=hash(vec2(band,t));float off=0.;if(n>.82){off=(n-.9)*.35*u_k;}float sp=.012*u_k;vec2 q=uv+vec2(off,0.);return vec3(src(q+vec2(sp,0.)).r,src(q).g,src(q-vec2(sp,0.)).b);' },
    { id: 'kaleido', name: 'Kaleidoscope', cat: 'art', mix: false, body: 'vec2 A=asp();vec2 p=(uv-.5)*A;float n=floor(3.+u_k*7.+.5);float seg=6.2831853/n;float a=mod(atan(p.y,p.x),seg);if(a>seg*.5){a=seg-a;}float r=length(p)*.85;p=vec2(cos(a+.4),sin(a+.4))*r;return src(p/A+.5);' },
    { id: 'mirror', name: 'Mirror', cat: 'art', mix: false, body: 'vec2 q=uv;if(uv.x>.5){q.x=1.-uv.x;}return mix(src(uv),src(q),u_k);' },
    { id: 'double', name: 'Double Vision', cat: 'art', mix: false, body: 'vec2 o=vec2(.035,.012)*u_k;return mix(src(uv-o),src(uv+o),.5);' },
    { id: 'hatch', name: 'Crosshatch', cat: 'art', mix: true, body: 'float l=luma(src(uv));float s=u_res.y/110.;float x=gl_FragCoord.x;float y=gl_FragCoord.y;float h=1.;if(l<.8&&mod(x+y,s)<s*.2){h=0.;}if(l<.6&&mod(x-y+s*4.,s)<s*.2){h=0.;}if(l<.4&&mod(x+y+s*.5,s)<s*.2){h=0.;}if(l<.25&&mod(x-y+s*4.5,s)<s*.2){h=0.;}return vec3(.97,.95,.9)*(.12+.88*h);' }
  ];

  const ADJ = [
    ['brightness', 'Brightness', -100, 100], ['contrast', 'Contrast', -100, 100], ['saturation', 'Saturation', -100, 100],
    ['exposure', 'Exposure', -100, 100], ['temperature', 'Temperature', -100, 100], ['tint', 'Tint', -100, 100],
    ['highlights', 'Highlights', -100, 100], ['shadows', 'Shadows', -100, 100],
    ['sharpness', 'Sharpness', 0, 100], ['vignette', 'Vignette', 0, 100], ['grain', 'Grain', 0, 100]
  ];
  const defaultFx = () => { const adj = {}; ADJ.forEach(a => { adj[a[0]] = 0; }); return { effect: 'none', strength: 100, adj }; };
  const isNeutral = fx => fx.effect === 'none' && ADJ.every(a => !fx.adj[a[0]]);

  const VERT = 'attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=vec2(a_pos.x*.5+.5,.5-a_pos.y*.5);gl_Position=vec4(a_pos,0.,1.);}';
  const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_crop;
uniform float u_mirror;
uniform float u_k;
uniform float u_time;
uniform vec4 u_a1;
uniform vec4 u_a2;
uniform vec3 u_a3;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 satc(vec3 c,float s){float l=luma(c);return vec3(l)+(c-vec3(l))*s;}
vec3 conc(vec3 c,float k){return (c-.5)*k+.5;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 rot(vec2 p,float a){float c=cos(a);float s=sin(a);return vec2(p.x*c-p.y*s,p.x*s+p.y*c);}
vec2 asp(){return vec2(u_res.x/u_res.y,1.);}
vec2 pxs(){return vec2(max(1.,u_res.y/360.))/u_res;}
vec2 srcUV(vec2 uv){uv=(clamp(uv,0.,1.)-.5)*u_crop+.5;if(u_mirror>.5){uv.x=1.-uv.x;}return uv;}
vec3 srcRaw(vec2 uv){return texture2D(u_tex,srcUV(uv)).rgb;}
vec3 src(vec2 uv){
  vec3 c=srcRaw(uv);
  if(u_a3.z>.001){
    vec2 p=pxs();
    vec3 n=srcRaw(uv+vec2(p.x,0.))+srcRaw(uv-vec2(p.x,0.))+srcRaw(uv+vec2(0.,p.y))+srcRaw(uv-vec2(0.,p.y));
    c=c*(1.+4.*u_a3.z)-n*u_a3.z;
  }
  return c;
}
float lumAt(vec2 uv){return luma(src(uv));}
float edge(vec2 uv){
  vec2 p=pxs();
  float tl=lumAt(uv+vec2(-p.x,-p.y));float t=lumAt(uv+vec2(0.,-p.y));float tr=lumAt(uv+vec2(p.x,-p.y));
  float l=lumAt(uv+vec2(-p.x,0.));float r=lumAt(uv+vec2(p.x,0.));
  float bl=lumAt(uv+vec2(-p.x,p.y));float b=lumAt(uv+vec2(0.,p.y));float br=lumAt(uv+vec2(p.x,p.y));
  float gx=-tl-2.*l-bl+tr+2.*r+br;
  float gy=-tl-2.*t-tr+bl+2.*b+br;
  return length(vec2(gx,gy));
}
`;
  const TAIL = (mix) => `
void main(){
  vec2 uv=v_uv;
  vec3 base=src(uv);
  vec3 c=effect(uv);
  ${mix ? 'c=mix(base,c,u_k);' : ''}
  c*=exp2(u_a1.w*1.5);
  float tp=u_a2.x*.2;float tn=u_a2.y*.16;
  c.r+=tp+tn*.3;c.g-=tn*.6;c.b+=-tp+tn*.3;
  float l=clamp(luma(c),0.,1.);
  c+=vec3((u_a2.w*(1.-l)*(1.-l)+u_a2.z*l*l)*.27);
  c+=vec3(u_a1.x*.35);
  c=conc(c,1.+u_a1.y);
  c=satc(c,1.+u_a1.z);
  if(u_a3.x>.001){float rn=length(uv-.5)/.7071;c*=max(1.-u_a3.x*pow(rn,2.2)*1.3,0.);}
  if(u_a3.y>.001){float n=hash(floor(uv*vec2(480.,360.))+fract(u_time*.37)*10.)-.5;c+=vec3(n*u_a3.y*.176);}
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}
`;

  function create(canvas) {
    let gl = null, tex = null, buf = null, vs = null;
    const progs = new Map();   // effect id -> {p, u} or null if it failed
    let api = null;

    function init() {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl', { alpha: false, preserveDrawingBuffer: true });
      if (!gl) return false;
      progs.clear();
      vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VERT); gl.compileShader(vs);
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return true;
    }
    function program(id) {
      if (progs.has(id)) return progs.get(id);
      const e = E.find(x => x.id === id); let out = null;
      if (e && gl) {
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, HEAD + 'vec3 effect(vec2 uv){' + e.body + '}' + TAIL(e.mix)); gl.compileShader(fs);
        const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'a_pos'); gl.linkProgram(p);
        if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
          const u = {}; ['u_tex', 'u_res', 'u_crop', 'u_mirror', 'u_k', 'u_time', 'u_a1', 'u_a2', 'u_a3'].forEach(n => { u[n] = gl.getUniformLocation(p, n); });
          out = { p, u };
        } else console.warn('irie: effect "' + id + '" failed:', gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(p));
      }
      progs.set(id, out); return out;
    }

    function draw(source, sw, sh, o, dw, dh) {
      if (!gl || gl.isContextLost()) return false;
      dw = Math.max(1, Math.round(dw)); dh = Math.max(1, Math.round(dh));
      if (canvas.width !== dw || canvas.height !== dh) { canvas.width = dw; canvas.height = dh; }
      const pr = program(o.effect) || program('none'); if (!pr) return false;
      const a = (o.adj || {}), g = k => (a[k] || 0) / 100;
      gl.viewport(0, 0, dw, dh); gl.useProgram(pr.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      const sa = sw / sh, da = dw / dh, cx = sa > da ? da / sa : 1, cy = sa > da ? 1 : sa / da;
      gl.uniform1i(pr.u.u_tex, 0); gl.uniform2f(pr.u.u_res, dw, dh); gl.uniform2f(pr.u.u_crop, cx, cy);
      gl.uniform1f(pr.u.u_mirror, o.mirror ? 1 : 0); gl.uniform1f(pr.u.u_k, o.k == null ? 1 : o.k); gl.uniform1f(pr.u.u_time, o.time || 0);
      gl.uniform4f(pr.u.u_a1, g('brightness'), g('contrast'), g('saturation'), g('exposure'));
      gl.uniform4f(pr.u.u_a2, g('temperature'), g('tint'), g('highlights'), g('shadows'));
      gl.uniform3f(pr.u.u_a3, g('vignette'), g('grain'), g('sharpness'));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    }

    if (!init()) return null;
    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', init);
    api = {
      canvas, draw,
      usable: id => id === 'none' || !!program(id),
      /* compile effects a few at a time so the page stays smooth */
      compileAll(done) {
        const ids = E.map(e => e.id); let i = 0;
        const step = () => { for (let n = 0; n < 4 && i < ids.length; n++, i++) program(ids[i]); if (i < ids.length) setTimeout(step, 0); else if (done) done(); };
        step();
      }
    };
    return api;
  }

  window.IrieFX = { EFFECTS: E, CATS, ADJ, defaultFx, isNeutral, create };
})();
