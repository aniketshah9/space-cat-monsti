let cats = [];
let tap = 0;
let phase = 0;
let hueBase = 0;
let stars = [];
let monster = null;
let started = false;

const MAX_CATS = 16;

// 🔊 SOUND + UI
let meow;
let showTapAgain = false;
let tapAgainTimer = 0;

/* ================= PRELOAD ================= */
function preload() {
  meow = loadSound("meow.mp3");
}

/* ================= SETUP ================= */
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  for (let i = 0; i < 200; i++) {
    stars.push({ x: random(width), y: random(height), r: random(0.5, 2) });
  }
}

/* ================= DRAW ================= */
function draw() {
  drawSpace();

  // START SCREEN
  if (!started) {
    fill(0, 0, 100);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(48);
    text("TAP!", width / 2, height / 2);
    return;
  }

  if (monster) {
    monster.update();
    monster.draw();
  } else {
    for (let c of cats) {
      c.update();
      c.draw();
    }
  }

  // TAP AGAIN TEXT
  if (showTapAgain) {
    if (millis() - tapAgainTimer < 1200) {
      fill(0, 0, 100);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(32);
      text("TAP! Again", width / 2, height * 0.75);
    } else {
      showTapAgain = false;
    }
  }
}

/* ================= SPACE ================= */
function drawSpace() {
  background(0, 0, 5);
  noStroke();
  fill(0, 0, 100, 80);
  for (let s of stars) circle(s.x, s.y, s.r);
}

/* ================= SOUND ================= */
function playMeows(count, duration = 0) {
  if (!meow) return;

  if (duration > 0) {
    let start = millis();
    let interval = setInterval(() => {
      meow.play();
      if (millis() - start > duration) clearInterval(interval);
    }, 350);
  } else {
    for (let i = 0; i < count; i++) {
      setTimeout(() => meow.play(), i * 300);
    }
  }
}

/* ================= TAP ================= */
function touchStarted() {
  if (!started) {
    started = true;
    tap = 0;
    return false;
  }

  tap++;
  hueBase = (hueBase + 45) % 360;

  // INIT
  if (tap === 1) {
    cats = [];
    cats.push(new Cat(width * 0.4, height * 0.55, 1.2));
  }

  if (tap === 2) {
    cats.push(new Cat(width * 0.6, height * 0.55, 0.8));
  }

  // EXPLODE
  if (tap % 3 === 0 && cats.length < MAX_CATS) {
    cats.forEach(c => c.explode());
  }

  // MULTIPLY
  if (tap % 3 === 1 && cats.length < MAX_CATS) {
    let offspring = [];
    cats.forEach(c => offspring.push(c.spawn()));
    cats = cats.concat(offspring).slice(0, MAX_CATS);
  }

  // FEEDBACK
  if (cats.length > 0 && cats.length < MAX_CATS) {
    showTapAgain = true;
    tapAgainTimer = millis();
    playMeows(cats.length);
  }

  // FINAL MERGE
  if (cats.length === MAX_CATS) {
    monster = new MonsterCat(cats);
    cats = [];

    // MONSTER MEOWS FOR 5 SECONDS
    playMeows(0, 5000);
  }

  cats.forEach(c => c.hue = hueBase);
  return false;
}

/* ================= CAT ================= */
class Cat {
  constructor(x, y, s) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(0.9);
    this.base = s;
    this.scale = s;
    this.walk = random(TWO_PI);
    this.hue = hueBase;
    this.parts = [];
  }

  update() {
    this.walk += 0.04;
    this.pos.add(this.vel);
    this.keepInside(120);
    this.scale = this.base + sin(frameCount * 0.05 + this.base) * 0.1;
  }

  explode() {
    this.parts = ["head", "body", "tail", "legs"].map(p => ({
      part: p,
      pos: this.pos.copy(),
      vel: p5.Vector.random2D().mult(random(2, 4)),
      rot: random(TWO_PI)
    }));
  }

  spawn() {
    return new Cat(
      this.pos.x + random(-80, 80),
      this.pos.y + random(-80, 80),
      this.base * random(0.75, 1.1)
    );
  }

  keepInside(m) {
    if (this.pos.x < m || this.pos.x > width - m) this.vel.x *= -1;
    if (this.pos.y < m || this.pos.y > height - m) this.vel.y *= -1;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.scale);
    stroke(this.hue, 80, 90);
    strokeWeight(10);
    noFill();

    if (this.parts.length) this.drawExploded();
    else drawCatShape(this.walk);

    pop();
  }

  drawExploded() {
    for (let p of this.parts) {
      p.pos.add(p.vel);
      if (p.pos.x < 60 || p.pos.x > width - 60) p.vel.x *= -1;
      if (p.pos.y < 60 || p.pos.y > height - 60) p.vel.y *= -1;

      push();
      translate(p.pos.x - this.pos.x, p.pos.y - this.pos.y);
      rotate(p.rot);
      drawPart(p.part, this.walk);
      pop();
    }
  }
}

/* ================= MONSTER ================= */
class MonsterCat {
  constructor(catList) {
    this.pos = createVector(width / 2, height / 2);
    this.walk = 0;
    this.heads = catList.length;
    this.colors = [];

    for (let i = 0; i < this.heads; i++) {
      this.colors.push((hueBase + i * 360 / this.heads) % 360);
    }

    this.scale = min(width, height) / 600;
  }

  update() {
    this.walk += 0.015;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.scale);

    strokeWeight(10);
    noFill();

    let bodyHue = this.colors[Math.floor(this.colors.length / 2)];
    stroke(bodyHue, 90, 85);

    beginShape();
    curveVertex(-260, 80);
    curveVertex(-200, -60);
    curveVertex(0, -120);
    curveVertex(200, -60);
    curveVertex(260, 80);
    curveVertex(200, 260);
    curveVertex(-200, 260);
    curveVertex(-260, 80);
    endShape();

    for (let i = 0; i < this.heads; i++) {
      let angle = this.walk + TWO_PI * i / this.heads;
      let radiusX = 240;
      let radiusY = 140;
      let x = cos(angle) * radiusX;
      let y = sin(angle) * radiusY - 220;
      drawMonsterHead(x, y, angle, this.colors[i]);
    }

    stroke(bodyHue, 80, 80);
    for (let i = -220; i <= 220; i += 34) {
      monsterLeg(i, 260, sin(this.walk + i * 0.03) * 35);
    }

    pop();
  }
}

/* ================= DRAWING ================= */
function drawCatShape(w) {
  body();
  head(w);
  legs(w);
  tail(w);
  fur(w);
}

function body() {
  beginShape();
  curveVertex(-90, 30);
  curveVertex(-60, 0);
  curveVertex(0, -20);
  curveVertex(60, 0);
  curveVertex(90, 30);
  curveVertex(60, 80);
  curveVertex(-60, 80);
  curveVertex(-90, 30);
  endShape();
}

function head(w) {
  ellipse(0, -80, 95, 75);
  triangle(-30,-100,-60,-150,-5,-115);
  triangle(30,-100,60,-150,5,-115);
  let px = sin(w) * 3;
  ellipse(-18 + px, -80, 12, 16);
  ellipse(18 + px, -80, 12, 16);
}

function legs(w) {
  let a = sin(w) * 18;
  let b = sin(w + PI) * 18;
  leg(-45, 80, a);
  leg(-15, 80, b);
  leg(15, 80, a);
  leg(45, 80, b);
}

function leg(x, y, s) {
  beginShape();
  vertex(x, y);
  vertex(x + s, y + 50);
  vertex(x + s * 1.2, y + 95);
  endShape();
}

function tail(w) {
  bezier(90, 50, 140, 20, 160, 80 + sin(w) * 25, 200, 120);
}

function fur(w) {
  for (let i = 0; i < 35; i++) {
    let t = map(i, 0, 35, -80, 80);
    line(t, 30 + sin(w + t * 0.05) * 4, t + random(-3,3), 30 + random(-6,6));
  }
}

function drawPart(p, w) {
  if (p === "head") head(w);
  if (p === "body") body();
  if (p === "tail") tail(w);
  if (p === "legs") legs(w);
}

function drawMonsterHead(x, y, rot, h) {
  push();
  translate(x, y);
  rotate(rot * 0.4);
  stroke(h, 90, 90);
  noFill();
  ellipse(0, 0, 70, 55);
  triangle(-25, -20, -55, -65, -5, -45);
  triangle(25, -20, 55, -65, 5, -45);
  let blink = abs(sin(frameCount * 0.05)) * 8;
  ellipse(-14, -5, 10, 12 - blink);
  ellipse(14, -5, 10, 12 - blink);
  triangle(0, 5, -4, 10, 4, 10);
  pop();
}

function monsterLeg(x, y, s) {
  beginShape();
  vertex(x, y);
  vertex(x + s, y + 65);
  vertex(x + s * 1.3, y + 120);
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
