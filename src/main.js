// Monster League RPG - v5
// Adds starter selection, saved game state, XP, and leveling.

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

    if (gameState.starter) {
      this.scene.start("OverworldScene");
    } else {
      this.scene.start("StarterScene");
    }
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

    this.drawMap();
    this.createPlayer();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");

    this.playerMoving = false;
    this.encounterCooldown = false;

    this.cameras.main.setBounds(0, 0, MAP[0].length * TILE_SIZE, MAP.length * TILE_SIZE);
    this.cameras.main.startFollow(this.player);
  }

  drawMap() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        const tile = MAP[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const key = `${x},${y}`;

        let color = 0x66bb6a;

        if (tile === "W") {
          color = 0x263238;
          this.blockedTiles.add(key);
        }

        if (tile === "G") {
          color = 0x2e7d32;
          this.grassTiles.add(key);
        }

        if (tile === "T") {
          color = 0x1b5e20;
          this.blockedTiles.add(key);
        }

        if (tile === "B") {
          color = 0x8d6e63;
          this.blockedTiles.add(key);
        }

        this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, color)
          .setOrigin(0)
          .setStrokeStyle(1, 0x000000, 0.15);
      }
    }
  }

  createPlayer() {
    this.player = this.add.rectangle(
      gameState.playerX * TILE_SIZE + TILE_SIZE / 2,
      gameState.playerY * TILE_SIZE + TILE_SIZE / 2,
      22,
      26,
      0xfff176
    );

    this.player.setStrokeStyle(3, 0x3e2723);
  }

  createUI() {
    this.infoText = this.add.text(
      12,
      12,
      `${gameState.starter.name} Lv.${gameState.starter.level} | HP ${gameState.starter.currentHP}/${gameState.starter.maxHP} | XP ${gameState.starter.xp}/${gameState.starter.xpToNext}`,
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 6 },
        fontFamily: "monospace"
      }
    );

    this.infoText.setScrollFactor(0);
  }

  update() {
    if (this.playerMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
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
      targets: this.player,
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

    this.add.rectangle(0, 0, 640, 480, 0x1a1a2e).setOrigin(0);

    this.add.text(30, 24, `A wild ${this.enemyMonster.name} appeared!`, {
      fontSize: "22px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    this.enemy = this.add.rectangle(470, 150, 90, 90, this.enemyMonster.color)
      .setStrokeStyle(4, 0xffffff);

    this.hero = this.add.rectangle(180, 320, 100, 100, this.playerMonster.color)
      .setStrokeStyle(4, 0xffffff);

    this.enemyText = this.add.text(350, 240, "", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    this.playerText = this.add.text(40, 390, "", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    this.messageText = this.add.text(30, 430, "Press F to Fight or R to Run", {
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "#000000aa",
      padding: { x: 10, y: 8 },
      fontFamily: "monospace"
    });

    this.updateText();

    this.input.keyboard.on("keydown-F", () => this.playerAttack());
    this.input.keyboard.on("keydown-R", () => this.runAway());
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
