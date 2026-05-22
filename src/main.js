// Monster League RPG - v6
// Visual upgrade: animated grass, water, pixel-style tiles/player, improved battle UI.

const TILE_SIZE = 32;

const STARTERS = [
  { id: "sproutle", name: "Sproutle", type: "Leaf", color: 0x7ddf64, maxHP: 32, minDamage: 5, maxDamage: 10 },
  { id: "emberbun", name: "Emberbun", type: "Flame", color: 0xff6f61, maxHP: 28, minDamage: 6, maxDamage: 11 },
  { id: "bubblit", name: "Bubblit", type: "Water", color: 0x66ccff, maxHP: 35, minDamage: 4, maxDamage: 9 }
];

const WILD_MONSTERS = [
  { name: "Mossling", type: "Leaf", color: 0x2ecc71, maxHP: 22, minDamage: 3, maxDamage: 7 },
  { name: "Ashkit", type: "Flame", color: 0xff9f43, maxHP: 24, minDamage: 4, maxDamage: 8 },
  { name: "Puddlefin", type: "Water", color: 0x48dbfb, maxHP: 26, minDamage: 3, maxDamage: 7 }
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
  "W.............B..B.W",
  "W.............BBBB.W",
  "W..................W",
  "WWWWWWWWWWWWWWWWWWWW",
];

const gameState = {
  playerX: 2,
  playerY: 2,
  starter: null
};

function saveGame() {
  localStorage.setItem("monsterLeagueSave", JSON.stringify(gameState));
}

function loadGame() {
  const save = localStorage.getItem("monsterLeagueSave");
  if (!save) return;

  const loaded = JSON.parse(save);
  gameState.playerX = loaded.playerX ?? 2;
  gameState.playerY = loaded.playerY ?? 2;
  gameState.starter = loaded.starter ?? null;

  if (gameState.starter) {
    gameState.starter.xp ??= 0;
    gameState.starter.xpToNext ??= 20;
    gameState.starter.level ??= 5;
    gameState.starter.currentHP ??= gameState.starter.maxHP;
  }
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

      this.add.rectangle(x, y - 45, 70, 70, starter.color)
        .setStrokeStyle(4, 0xffffff);

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
    gameState.starter = {
      ...starter,
      level: 5,
      xp: 0,
      xpToNext: 20,
      currentHP: starter.maxHP
    };

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
    this.animatedGrass = [];

    this.drawMap();
    this.createPlayer();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");

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

        if (tile === ".") {
          this.drawPathDetails(px, py);
        }

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
      }
    }
  }

  drawBaseTile(px, py, color) {
    this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, color)
      .setOrigin(0)
      .setStrokeStyle(1, 0x000000, 0.10);
  }

  drawPathDetails(px, py) {
    if (Math.random() < 0.25) {
      this.add.rectangle(px + 7, py + 22, 4, 3, 0x4f9f56).setOrigin(0);
    }

    if (Math.random() < 0.2) {
      this.add.rectangle(px + 21, py + 9, 3, 3, 0x7fd47e).setOrigin(0);
    }
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

    const shadow = this.add.ellipse(0, 13, 21, 7, 0x000000, 0.28);
    const legs = this.add.rectangle(0, 9, 14, 10, 0x263238);
    const body = this.add.rectangle(0, -1, 18, 18, 0xfff176).setStrokeStyle(2, 0x3e2723);
    const face = this.add.rectangle(0, -13, 16, 13, 0xffccbc).setStrokeStyle(2, 0x3e2723);
    const hair = this.add.rectangle(0, -20, 18, 7, 0x5d4037);
    const eye1 = this.add.rectangle(-4, -13, 2, 2, 0x000000);
    const eye2 = this.add.rectangle(4, -13, 2, 2, 0x000000);

    this.playerGroup.add([shadow, legs, body, face, hair, eye1, eye2]);
  }

  createUI() {
    this.infoText = this.add.text(
      12,
      12,
      `${gameState.starter.name} Lv.${gameState.starter.level} | HP ${gameState.starter.currentHP}/${gameState.starter.maxHP} | XP ${gameState.starter.xp}/${gameState.starter.xpToNext}`,
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 8, y: 6 },
        fontFamily: "monospace"
      }
    );

    this.infoText.setScrollFactor(0);
  }

  update(time) {
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

      this.time.delayedCall(350, () => {
        this.scene.start("BattleScene");
      });
    }
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.playerMonster = gameState.starter;
    this.enemyMonster = { ...Phaser.Utils.Array.GetRandom(WILD_MONSTERS) };

    this.playerHP = this.playerMonster.currentHP;
    this.enemyHP = this.enemyMonster.maxHP;
    this.battleLocked = false;

    this.drawBattleBackground();
    this.createBattleSprites();
    this.createBattleUI();

    this.updateText();

    this.input.keyboard.on("keydown-F", () => this.playerAttack());
    this.input.keyboard.on("keydown-R", () => this.runAway());
  }

  drawBattleBackground() {
    this.add.rectangle(0, 0, 640, 480, 0x101820).setOrigin(0);

    this.add.rectangle(0, 0, 640, 185, 0x203a43).setOrigin(0);
    this.add.rectangle(0, 185, 640, 170, 0x2f6b3f).setOrigin(0);
    this.add.rectangle(0, 355, 640, 125, 0x111827).setOrigin(0);

    this.add.ellipse(470, 210, 170, 46, 0x1f4f2b);
    this.add.ellipse(180, 365, 190, 52, 0x1f4f2b);

    for (let i = 0; i < 22; i++) {
      this.add.rectangle(
        Phaser.Math.Between(0, 640),
        Phaser.Math.Between(190, 335),
        Phaser.Math.Between(4, 10),
        2,
        0x76d275,
        0.5
      );
    }

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

    this.messageText = this.add.text(38, 379, "Press F to Fight or R to Run", {
      fontSize: "18px",
      color: "#111827",
      fontFamily: "monospace",
      wordWrap: { width: 360 }
    });

    this.add.rectangle(420, 374, 170, 70, 0xffffff)
      .setStrokeStyle(3, 0x111827);

    this.add.text(442, 386, "[F] FIGHT", {
      fontSize: "18px",
      color: "#111827",
      fontFamily: "monospace"
    });

    this.add.text(442, 416, "[R] RUN", {
      fontSize: "18px",
      color: "#111827",
      fontFamily: "monospace"
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
  }

  updateText() {
    this.enemyText.setText(`${this.enemyMonster.name} HP: ${this.enemyHP}/${this.enemyMonster.maxHP}`);
    this.playerText.setText(`${this.playerMonster.name} Lv.${this.playerMonster.level} HP: ${this.playerHP}/${this.playerMonster.maxHP}`);
  }

  gainXP(amount) {
    this.playerMonster.xp += amount;

    if (this.playerMonster.xp >= this.playerMonster.xpToNext) {
      this.playerMonster.xp -= this.playerMonster.xpToNext;
      this.playerMonster.level += 1;
      this.playerMonster.xpToNext = Math.floor(this.playerMonster.xpToNext * 1.35);

      this.playerMonster.maxHP += Phaser.Math.Between(3, 6);
      this.playerMonster.minDamage += 1;
      this.playerMonster.maxDamage += 1;
      this.playerMonster.currentHP = this.playerMonster.maxHP;
      this.playerHP = this.playerMonster.currentHP;

      return true;
    }

    this.playerMonster.currentHP = this.playerHP;
    return false;
  }

  playerAttack() {
    if (this.battleLocked) return;
    this.battleLocked = true;

    const damage = Phaser.Math.Between(this.playerMonster.minDamage, this.playerMonster.maxDamage);
    this.enemyHP = Math.max(0, this.enemyHP - damage);

    this.updateText();
    this.messageText.setText(`${this.playerMonster.name} attacked! ${damage} damage!`);

    this.tweens.add({
      targets: this.enemy,
      x: this.enemy.x + 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    if (this.enemyHP <= 0) {
      const xpReward = Phaser.Math.Between(8, 14);
      const leveledUp = this.gainXP(xpReward);

      this.time.delayedCall(900, () => {
        this.messageText.setText(`${this.enemyMonster.name} fainted! Gained ${xpReward} XP!`);
        this.updateText();
      });

      this.time.delayedCall(1900, () => {
        if (leveledUp) {
          this.messageText.setText(`${this.playerMonster.name} grew to Lv.${this.playerMonster.level}!`);
          this.updateText();
        }
      });

      this.time.delayedCall(3100, () => {
        gameState.starter = this.playerMonster;
        saveGame();
        this.scene.start("OverworldScene");
      });

      return;
    }

    this.time.delayedCall(900, () => this.enemyAttack());
  }

  enemyAttack() {
    const damage = Phaser.Math.Between(this.enemyMonster.minDamage, this.enemyMonster.maxDamage);
    this.playerHP = Math.max(0, this.playerHP - damage);

    this.updateText();
    this.messageText.setText(`${this.enemyMonster.name} attacked! ${damage} damage!`);

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
        gameState.starter.currentHP = gameState.starter.maxHP;
        gameState.playerX = 2;
        gameState.playerY = 2;
        saveGame();
        this.scene.start("OverworldScene");
      });

      return;
    }

    this.playerMonster.currentHP = this.playerHP;
    gameState.starter = this.playerMonster;
    saveGame();

    this.time.delayedCall(500, () => {
      this.battleLocked = false;
      this.messageText.setText("Press F to Fight or R to Run");
    });
  }

  runAway() {
    if (this.battleLocked) return;
    this.battleLocked = true;

    this.messageText.setText("You ran away safely!");

    this.time.delayedCall(1000, () => {
      this.playerMonster.currentHP = this.playerHP;
      gameState.starter = this.playerMonster;
      saveGame();
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
  scene: [BootScene, StarterScene, OverworldScene, BattleScene]
};

new Phaser.Game(config);
