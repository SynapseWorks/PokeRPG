// Monster League RPG - v10
// Adds full Party Menu: press P in overworld, click creature to make active, ESC to close.

const TILE_SIZE = 32;
const MAX_PARTY_SIZE = 6;

const MOVES = {
  leafJab: { name: "Leaf Jab", type: "Leaf", power: 8, accuracy: 0.95 },
  vineWhip: { name: "Vine Whip", type: "Leaf", power: 11, accuracy: 0.9 },
  ember: { name: "Ember", type: "Flame", power: 9, accuracy: 0.95 },
  flameBurst: { name: "Flame Burst", type: "Flame", power: 12, accuracy: 0.85 },
  splash: { name: "Splash Jet", type: "Water", power: 8, accuracy: 0.96 },
  bubbleShot: { name: "Bubble Shot", type: "Water", power: 11, accuracy: 0.9 },
  tackle: { name: "Tackle", type: "Normal", power: 7, accuracy: 0.98 }
};

const STARTERS = [
  { id: "sproutle", name: "Sproutle", type: "Leaf", color: 0x7ddf64, maxHP: 32, moves: ["leafJab", "vineWhip"] },
  { id: "emberbun", name: "Emberbun", type: "Flame", color: 0xff6f61, maxHP: 28, moves: ["ember", "flameBurst"] },
  { id: "bubblit", name: "Bubblit", type: "Water", color: 0x66ccff, maxHP: 35, moves: ["splash", "bubbleShot"] }
];

const WILD_MONSTERS = [
  { id: "mossling", name: "Mossling", type: "Leaf", color: 0x2ecc71, maxHP: 24, level: 3, moves: ["leafJab", "tackle"] },
  { id: "ashkit", name: "Ashkit", type: "Flame", color: 0xff9f43, maxHP: 22, level: 4, moves: ["ember", "tackle"] },
  { id: "puddlefin", name: "Puddlefin", type: "Water", color: 0x48dbfb, maxHP: 26, level: 3, moves: ["splash", "tackle"] }
];

const MAP = [
  "WWWWWWWWWWWWWWWWWWWW",
  "W..................W",
  "W..GGGG............W",
  "W..GGGG....TTT.....W",
  "W..........T.T.....W",
  "W..........TTT.....W",
  "W..................W",
  "W.....GGGGGG.......W",
  "W.....GGGGGG.......W",
  "W..................W",
  "W.............BBBB.W",
"W.............H..H.W",
  "W.............HHHH.W",
  "W..................W",
  "WWWWWWWWWWWWWWWWWWWW",
];

const gameState = {
  playerX: 2,
  playerY: 2,
  starter: null,
  party: []
};

function saveGame() {
  localStorage.setItem("monsterLeagueSave", JSON.stringify(gameState));
}

function createPartyMonster(monster) {
  return {
    ...monster,
    level: monster.level || 5,
    xp: monster.xp ?? 0,
    xpToNext: monster.xpToNext ?? 20,
    currentHP: monster.currentHP ?? monster.maxHP,
    moves: monster.moves || ["tackle"]
  };
}

function loadGame() {
  const save = localStorage.getItem("monsterLeagueSave");
  if (!save) return;

  Object.assign(gameState, JSON.parse(save));

  if (gameState.starter) {
    const base = STARTERS.find(s => s.id === gameState.starter.id);

    gameState.starter = createPartyMonster({
      ...base,
      ...gameState.starter,
      moves: gameState.starter.moves || base?.moves || ["tackle"]
    });
  }

  if (!Array.isArray(gameState.party)) gameState.party = [];

  if (gameState.starter && gameState.party.length === 0) {
    gameState.party = [gameState.starter];
  }

  gameState.party = gameState.party.map(mon => createPartyMonster(mon));

  if (gameState.party.length > 0) {
    gameState.starter = gameState.party[0];
  }

  saveGame();
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    loadGame();
    this.scene.start(gameState.starter ? "OverworldScene" : "StarterScene");
  }
}

class StarterScene extends Phaser.Scene {
  constructor() {
    super("StarterScene");
  }

  create() {
    this.add.rectangle(0, 0, 640, 480, 0x101820).setOrigin(0);

    this.add.text(45, 35, "Choose Your First Creature", {
      fontSize: "30px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    STARTERS.forEach((starter, index) => {
      const x = 130 + index * 190;
      const y = 210;

      const card = this.add.rectangle(x, y, 145, 190, 0x1f2937)
        .setStrokeStyle(3, starter.color)
        .setInteractive({ useHandCursor: true });

      this.add.rectangle(x, y - 45, 70, 70, starter.color).setStrokeStyle(4, 0xffffff);

      this.add.text(x, y + 10, starter.name, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "monospace"
      }).setOrigin(0.5);

      this.add.text(x, y + 38, starter.type, {
        fontSize: "15px",
        color: "#dddddd",
        fontFamily: "monospace"
      }).setOrigin(0.5);

      this.add.text(x, y + 70, `Press ${index + 1}`, {
        fontSize: "14px",
        color: "#aaaaaa",
        fontFamily: "monospace"
      }).setOrigin(0.5);

      card.on("pointerdown", () => this.chooseStarter(starter));
    });

    this.input.keyboard.on("keydown-ONE", () => this.chooseStarter(STARTERS[0]));
    this.input.keyboard.on("keydown-TWO", () => this.chooseStarter(STARTERS[1]));
    this.input.keyboard.on("keydown-THREE", () => this.chooseStarter(STARTERS[2]));
  }

  chooseStarter(starter) {
    gameState.starter = createPartyMonster({
      ...starter,
      level: 5,
      xp: 0,
      xpToNext: 20,
      currentHP: starter.maxHP
    });

    gameState.party = [gameState.starter];

    saveGame();
    this.scene.start("OverworldScene");
  }
}

class OverworldScene extends Phaser.Scene {
  constructor() {
    super("OverworldScene");
  }

create() {
  this.blockedTiles = new Set();
  this.grassTiles = new Set();
  this.healTiles = new Set();
  this.animatedGrass = [];

  this.drawMap();
  this.createPlayer();
  this.createUI();

  this.cursors = this.input.keyboard.createCursorKeys();
  this.keys = this.input.keyboard.addKeys("W,A,S,D");
  this.partyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  this.playerMoving = false;
  this.encounterCooldown = false;

  this.cameras.main.setBounds(0, 0, MAP[0].length * TILE_SIZE, MAP.length * TILE_SIZE);
  this.cameras.main.startFollow(this.playerGroup);
}

  drawMap() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        const tile = MAP[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const key = `${x},${y}`;

        this.drawBaseTile(px, py, 0x69b96a);

        if (tile === "W") {
          this.blockedTiles.add(key);
          this.drawWaterTile(px, py);
        }

        if (tile === ".") this.drawPathDetails(px, py);

        if (tile === "G") {
          this.grassTiles.add(key);
          this.drawGrassTile(px, py);
        }

        if (tile === "T") {
          this.blockedTiles.add(key);
          this.drawTreeTile(px, py);
        }

        if (tile === "B") {
          this.blockedTiles.add(key);
          this.drawBuildingTile(px, py);
        }
        if (tile === "H") {
          this.blockedTiles.add(key);
          this.healTiles.add(key);
          this.drawHealingCenterTile(px, py);
        }
      }
    }
  }

  drawBaseTile(px, py, color) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, color)
      .setOrigin(0)
      .setStrokeStyle(1, 0x000000, 0.1);
  }
  drawHealingCenterTile(px, py) {
  this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0xf8f8f8).setOrigin(0);
  this.add.rectangle(px + 2, py + 2, 28, 8, 0xe63946).setOrigin(0);
  this.add.rectangle(px + 7, py + 13, 7, 7, 0xadd8e6).setOrigin(0);
  this.add.rectangle(px + 19, py + 13, 6, 14, 0x3e2723).setOrigin(0);
  this.add.rectangle(px + 12, py + 12, 8, 3, 0xe63946).setOrigin(0);
  this.add.rectangle(px + 14, py + 9, 3, 8, 0xe63946).setOrigin(0);
}

  drawPathDetails(px, py) {
    if (Math.random() < 0.25) this.add.rectangle(px + 7, py + 22, 4, 3, 0x4f9f56).setOrigin(0);
    if (Math.random() < 0.2) this.add.rectangle(px + 21, py + 9, 3, 3, 0x7fd47e).setOrigin(0);
  }

  drawGrassTile(px, py) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x2e7d32).setOrigin(0);
    const blades = [];

    for (let i = 0; i < 7; i++) {
      const blade = this.add.rectangle(
        px + Phaser.Math.Between(4, 28),
        py + Phaser.Math.Between(8, 27),
        3,
        Phaser.Math.Between(7, 12),
        Phaser.Utils.Array.GetRandom([0x7ee36c, 0x47b94d, 0xa2ff7a])
      ).setOrigin(0.5, 1);

      blades.push(blade);
    }

    this.animatedGrass.push({ blades, offset: Math.random() * 1000 });
  }
tryInteract() {
  const adjacentTiles = [
    `${gameState.playerX},${gameState.playerY - 1}`,
    `${gameState.playerX},${gameState.playerY + 1}`,
    `${gameState.playerX - 1},${gameState.playerY}`,
    `${gameState.playerX + 1},${gameState.playerY}`
  ];

  const nearHealingCenter = adjacentTiles.some(tile => this.healTiles.has(tile));

  if (nearHealingCenter) {
    this.healParty();
  } else {
    this.showMessage("Nothing to interact with.");
  }
}

healParty() {
  gameState.party = gameState.party.map(monster => ({
    ...monster,
    currentHP: monster.maxHP
  }));

  gameState.starter = gameState.party[0];

  saveGame();

  this.showMessage("Your party was fully healed!");
  this.infoText.setText(
    `${gameState.starter.name} Lv.${gameState.starter.level} | HP ${gameState.starter.currentHP}/${gameState.starter.maxHP} | XP ${gameState.starter.xp}/${gameState.starter.xpToNext} | Party ${gameState.party.length}/${MAX_PARTY_SIZE} | P: Party | E: Interact`
  );
}

showMessage(message) {
  if (this.messageText) this.messageText.destroy();

  this.messageText = this.add.text(12, 440, message, {
    fontSize: "16px",
    color: "#ffffff",
    backgroundColor: "#000000dd",
    padding: { x: 10, y: 7 },
    fontFamily: "monospace"
  });

  this.messageText.setScrollFactor(0);

  this.time.delayedCall(1500, () => {
    if (this.messageText) {
      this.messageText.destroy();
      this.messageText = null;
    }
  });
}
  drawWaterTile(px, py) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x246b9f).setOrigin(0);
    this.add.rectangle(px + 4, py + 9, 18, 3, 0x5dade2).setOrigin(0);
    this.add.rectangle(px + 12, py + 21, 14, 3, 0x85c1e9).setOrigin(0);
  }

  drawTreeTile(px, py) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x4c9f50).setOrigin(0);
    this.add.rectangle(px + 13, py + 15, 8, 15, 0x7b4f24).setOrigin(0);
    this.add.rectangle(px + 5, py + 4, 22, 18, 0x145a32).setOrigin(0);
    this.add.rectangle(px + 9, py, 16, 14, 0x1e8449).setOrigin(0);
    this.add.rectangle(px + 13, py + 7, 6, 6, 0x58d68d).setOrigin(0);
  }

  drawBuildingTile(px, py) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0xb06f3c).setOrigin(0);
    this.add.rectangle(px + 2, py + 2, 28, 8, 0x6d2f1a).setOrigin(0);
    this.add.rectangle(px + 7, py + 13, 7, 7, 0xadd8e6).setOrigin(0);
    this.add.rectangle(px + 19, py + 13, 6, 14, 0x3e2723).setOrigin(0);
  }

  createPlayer() {
    const x = gameState.playerX * TILE_SIZE + TILE_SIZE / 2;
    const y = gameState.playerY * TILE_SIZE + TILE_SIZE / 2;

    this.playerGroup = this.add.container(x, y);

    this.playerGroup.add([
      this.add.ellipse(0, 13, 21, 7, 0x000000, 0.28),
      this.add.rectangle(0, 9, 14, 10, 0x263238),
      this.add.rectangle(0, -1, 18, 18, 0xfff176).setStrokeStyle(2, 0x3e2723),
      this.add.rectangle(0, -13, 16, 13, 0xffccbc).setStrokeStyle(2, 0x3e2723),
      this.add.rectangle(0, -20, 18, 7, 0x5d4037),
      this.add.rectangle(-4, -13, 2, 2, 0x000000),
      this.add.rectangle(4, -13, 2, 2, 0x000000)
    ]);
  }

  createUI() {
    this.infoText = this.add.text(
      12,
      12,
      `${gameState.starter.name} Lv.${gameState.starter.level} | HP ${gameState.starter.currentHP}/${gameState.starter.maxHP} | XP ${gameState.starter.xp}/${gameState.starter.xpToNext} | Party ${gameState.party.length}/${MAX_PARTY_SIZE} | P: Party| Party ${gameState.party.length}/${MAX_PARTY_SIZE} | P: Party | E: Interact`,
      {
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 8, y: 6 },
        fontFamily: "monospace"
      }
    );

    this.infoText.setScrollFactor(0);
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.partyKey)) {
      this.scene.pause();
      this.scene.launch("PartyScene");
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteract();
      return;
    }

    this.animateGrass(time);
    if (this.playerMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
  }

  animateGrass(time) {
    this.animatedGrass.forEach((patch) => {
      const wave = Math.sin((time + patch.offset) / 250) * 0.08;
      patch.blades.forEach((blade, i) => {
        blade.rotation = wave + i * 0.015;
      });
    });
  }

  tryMove(dx, dy) {
    const nextX = gameState.playerX + dx;
    const nextY = gameState.playerY + dy;
    const key = `${nextX},${nextY}`;

    if (this.blockedTiles.has(key)) return;

    gameState.playerX = nextX;
    gameState.playerY = nextY;
    saveGame();

    this.playerMoving = true;

    this.tweens.add({
      targets: this.playerGroup,
      x: nextX * TILE_SIZE + TILE_SIZE / 2,
      y: nextY * TILE_SIZE + TILE_SIZE / 2,
      duration: 140,
      onComplete: () => {
        this.playerMoving = false;
        this.checkEncounter();
      }
    });
  }

  checkEncounter() {
    if (this.encounterCooldown) return;

    const key = `${gameState.playerX},${gameState.playerY}`;
    if (!this.grassTiles.has(key)) return;

    if (Math.random() < 0.18) {
      this.encounterCooldown = true;
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(350, () => this.scene.start("BattleScene"));
    }
  }
}

class PartyScene extends Phaser.Scene {
  constructor() {
    super("PartyScene");
  }

  create() {
    this.add.rectangle(0, 0, 640, 480, 0x101820, 0.96).setOrigin(0);

    this.add.text(28, 24, "Party", {
      fontSize: "32px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    this.add.text(28, 62, "Click a creature to make it active. ESC to close.", {
      fontSize: "14px",
      color: "#bbbbbb",
      fontFamily: "monospace"
    });

    gameState.party.forEach((monster, index) => {
      const y = 120 + index * 56;
      const isActive = index === 0;

      const bg = this.add.rectangle(320, y, 560, 46, isActive ? 0x264653 : 0x1f2937)
        .setStrokeStyle(2, isActive ? 0x90e0ef : 0x555555)
        .setInteractive({ useHandCursor: true });

      this.add.rectangle(70, y, 28, 28, monster.color).setStrokeStyle(2, 0xffffff);

      this.add.text(100, y - 14, `${monster.name}  Lv.${monster.level}`, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "monospace"
      });

      this.add.text(100, y + 8, `HP ${monster.currentHP}/${monster.maxHP}   Type: ${monster.type}   XP ${monster.xp}/${monster.xpToNext}`, {
        fontSize: "13px",
        color: "#cccccc",
        fontFamily: "monospace"
      });

      if (isActive) {
        this.add.text(500, y - 10, "ACTIVE", {
          fontSize: "16px",
          color: "#90e0ef",
          fontFamily: "monospace"
        });
      }

      bg.on("pointerdown", () => {
        if (index > 0) {
          const selected = gameState.party[index];
          gameState.party.splice(index, 1);
          gameState.party.unshift(selected);
        }

        gameState.starter = gameState.party[0];
        saveGame();

        this.scene.stop();
        this.scene.stop("OverworldScene");
        this.scene.start("OverworldScene");
      });
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.scene.stop();
      this.scene.resume("OverworldScene");
    });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.playerMonster = gameState.party[0] || gameState.starter;
    this.enemyMonster = createPartyMonster({ ...Phaser.Utils.Array.GetRandom(WILD_MONSTERS) });

    this.playerHP = this.playerMonster.currentHP;
    this.enemyHP = this.enemyMonster.maxHP;
    this.turnLocked = false;

    this.drawBattleBackground();
    this.createBattleSprites();
    this.createBattleUI();
    this.updateText();
  }

  drawBattleBackground() {
    this.add.rectangle(0, 0, 640, 480, 0x101820).setOrigin(0);
    this.add.rectangle(0, 0, 640, 185, 0x203a43).setOrigin(0);
    this.add.rectangle(0, 185, 640, 170, 0x2f6b3f).setOrigin(0);
    this.add.rectangle(0, 355, 640, 125, 0x111827).setOrigin(0);

    this.add.ellipse(470, 210, 170, 46, 0x1f4f2b);
    this.add.ellipse(180, 365, 190, 52, 0x1f4f2b);

    this.add.text(30, 24, `A wild ${this.enemyMonster.name} appeared!`, {
      fontSize: "22px",
      color: "#ffffff",
      fontFamily: "monospace"
    });
  }

  createBattleSprites() {
    this.enemy = this.add.container(470, 150);
    this.enemy.add([
      this.add.ellipse(0, 18, 80, 30, 0x000000, 0.22),
      this.add.rectangle(0, 0, 78, 78, this.enemyMonster.color).setStrokeStyle(4, 0xffffff),
      this.add.rectangle(-16, -12, 8, 8, 0x000000),
      this.add.rectangle(16, -12, 8, 8, 0x000000),
      this.add.rectangle(0, 13, 26, 5, 0x000000)
    ]);

    this.hero = this.add.container(180, 320);
    this.hero.add([
      this.add.ellipse(0, 25, 92, 34, 0x000000, 0.24),
      this.add.rectangle(0, 0, 92, 92, this.playerMonster.color).setStrokeStyle(4, 0xffffff),
      this.add.rectangle(-18, -12, 8, 8, 0x000000),
      this.add.rectangle(18, -12, 8, 8, 0x000000),
      this.add.rectangle(0, 16, 30, 6, 0x000000)
    ]);
  }

  createBattleUI() {
    this.add.rectangle(20, 360, 600, 100, 0xf8f8f8)
      .setStrokeStyle(5, 0x111827);

    this.messageText = this.add.text(38, 379, "Choose a move:", {
      fontSize: "17px",
      color: "#111827",
      fontFamily: "monospace",
      wordWrap: { width: 290 }
    });

    this.enemyText = this.add.text(340, 235, "", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "monospace",
      backgroundColor: "#00000099",
      padding: { x: 8, y: 5 }
    });

    this.playerText = this.add.text(38, 332, "", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "monospace",
      backgroundColor: "#00000099",
      padding: { x: 8, y: 5 }
    });

    this.createMoveButtons();
    this.createActionButtons();
  }

  createMoveButtons() {
    this.playerMonster.moves.forEach((moveKey, index) => {
      const move = MOVES[moveKey];
      const x = 405 + (index % 2) * 105;
      const y = 384 + Math.floor(index / 2) * 37;

      this.makeButton(x, y, 100, 30, move.name, () => this.usePlayerMove(moveKey), 12);
    });
  }

  createActionButtons() {
    this.makeButton(405, 438, 100, 28, "CATCH", () => this.tryCatch(), 12);
    this.makeButton(510, 438, 100, 28, "RUN", () => this.runAway(), 12);
  }

  makeButton(x, y, w, h, text, callback, size = 14) {
    const button = this.add.rectangle(x, y, w, h, 0xffffff)
      .setStrokeStyle(2, 0x111827)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      color: "#111827",
      fontFamily: "monospace"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on("pointerdown", callback);
    label.on("pointerdown", callback);
  }

  updateText() {
    this.enemyText.setText(`${this.enemyMonster.name} Lv.${this.enemyMonster.level}\nHP ${this.enemyHP}/${this.enemyMonster.maxHP}`);
    this.playerText.setText(`${this.playerMonster.name} Lv.${this.playerMonster.level}\nHP ${this.playerHP}/${this.playerMonster.maxHP}`);
  }

  usePlayerMove(moveKey) {
    if (this.turnLocked) return;
    this.turnLocked = true;

    const move = MOVES[moveKey];

    if (Math.random() > move.accuracy) {
      this.messageText.setText(`${this.playerMonster.name}'s ${move.name} missed!`);
      this.time.delayedCall(900, () => this.enemyTurn());
      return;
    }

    const damage = move.power + Phaser.Math.Between(0, 4) + Math.floor(this.playerMonster.level / 2);
    this.enemyHP = Math.max(0, this.enemyHP - damage);

    this.messageText.setText(`${this.playerMonster.name} used ${move.name}!`);
    this.updateText();

    this.tweens.add({
      targets: this.enemy,
      x: this.enemy.x + 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    if (this.enemyHP <= 0) {
      this.winBattle();
      return;
    }

    this.time.delayedCall(900, () => this.enemyTurn());
  }

  tryCatch() {
    if (this.turnLocked) return;
    this.turnLocked = true;

    if (gameState.party.length >= MAX_PARTY_SIZE) {
      this.messageText.setText("Your party is full!");
      this.time.delayedCall(900, () => this.enemyTurn());
      return;
    }

    const hpRatio = this.enemyHP / this.enemyMonster.maxHP;
    const catchChance = Phaser.Math.Clamp(0.75 - hpRatio * 0.45, 0.25, 0.75);
    const caught = Math.random() < catchChance;

    this.messageText.setText("You threw a Capture Star...");

    this.tweens.add({
      targets: this.enemy,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 120,
      yoyo: true,
      repeat: 3
    });

    this.time.delayedCall(1000, () => {
      if (caught) {
        const caughtMonster = createPartyMonster({
          ...this.enemyMonster,
          currentHP: this.enemyHP
        });

        gameState.party.push(caughtMonster);
        saveGame();

        this.messageText.setText(`${this.enemyMonster.name} was caught!`);

        this.time.delayedCall(1200, () => {
          this.scene.start("OverworldScene");
        });
      } else {
        this.messageText.setText(`${this.enemyMonster.name} broke free!`);

        this.time.delayedCall(900, () => {
          this.enemyTurn();
        });
      }
    });
  }

  runAway() {
    if (this.turnLocked) return;
    this.turnLocked = true;

    this.messageText.setText("You ran away safely!");

    this.time.delayedCall(900, () => {
      this.playerMonster.currentHP = this.playerHP;
      gameState.party[0] = this.playerMonster;
      gameState.starter = gameState.party[0];
      saveGame();
      this.scene.start("OverworldScene");
    });
  }

  enemyTurn() {
    const moveKey = Phaser.Utils.Array.GetRandom(this.enemyMonster.moves);
    const move = MOVES[moveKey];

    if (Math.random() > move.accuracy) {
      this.messageText.setText(`${this.enemyMonster.name}'s ${move.name} missed!`);

      this.time.delayedCall(1000, () => {
        this.turnLocked = false;
        this.messageText.setText("Choose a move:");
      });

      return;
    }

    const damage = move.power + Phaser.Math.Between(0, 3);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.playerMonster.currentHP = this.playerHP;
    gameState.party[0] = this.playerMonster;
    gameState.starter = gameState.party[0];
    saveGame();

    this.messageText.setText(`${this.enemyMonster.name} used ${move.name}!`);
    this.updateText();

    this.tweens.add({
      targets: this.hero,
      x: this.hero.x - 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    if (this.playerHP <= 0) {
      this.time.delayedCall(900, () => {
        this.messageText.setText(`${this.playerMonster.name} fainted! Resting...`);
      });

      this.time.delayedCall(1900, () => {
        this.playerMonster.currentHP = this.playerMonster.maxHP;
        gameState.party[0] = this.playerMonster;
        gameState.starter = gameState.party[0];
        gameState.playerX = 2;
        gameState.playerY = 2;
        saveGame();
        this.scene.start("OverworldScene");
      });

      return;
    }

    this.time.delayedCall(1000, () => {
      this.turnLocked = false;
      this.messageText.setText("Choose a move:");
    });
  }

  winBattle() {
    const xpGain = Phaser.Math.Between(8, 14);

    this.time.delayedCall(800, () => {
      this.messageText.setText(`${this.enemyMonster.name} fainted! +${xpGain} XP`);
      this.playerMonster.xp += xpGain;

      if (this.playerMonster.xp >= this.playerMonster.xpToNext) {
        this.playerMonster.xp -= this.playerMonster.xpToNext;
        this.playerMonster.level += 1;
        this.playerMonster.xpToNext = Math.floor(this.playerMonster.xpToNext * 1.4);
        this.playerMonster.maxHP += 5;
        this.playerMonster.currentHP = this.playerMonster.maxHP;
        this.playerHP = this.playerMonster.currentHP;

        this.time.delayedCall(1000, () => {
          this.messageText.setText(`${this.playerMonster.name} grew to Lv.${this.playerMonster.level}!`);
          this.updateText();
        });
      }

      gameState.party[0] = this.playerMonster;
      gameState.starter = gameState.party[0];
      saveGame();
    });

    this.time.delayedCall(2800, () => {
      this.scene.start("OverworldScene");
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 640,
  height: 480,
  pixelArt: true,
  backgroundColor: "#000000",
  scene: [
    BootScene,
    StarterScene,
    OverworldScene,
    BattleScene,
    PartyScene
  ]
};

new Phaser.Game(config);
