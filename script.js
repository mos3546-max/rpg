/**
 * エコ・ブレイカー (Eco-Breaker)
 * ドラゴンクエスト風セリフ・自動シミュレーション & 闇の商人探索遭遇・売買システム
 */

// ==========================================
// 1. ゲームステート (状態管理)
// ==========================================
const state = {
    player: {
        hp: 100,
        maxHp: 100,
        atk: 15,
        baseAtk: 15, 
        def: 10,
        baseDef: 10, 
        gold: 100,
        equip: "なし",
        isMiasmaActive: false, 
        extinctKills: 0,       
        artifacts: [],         
        
        captured: {
            slime: 0,
            fishman: 0,
            goblin: 0,
            golem: 0,     
            spider: 0,    
            jewel: 0,     
            paladin: 0,
            mage: 0,
            valkyrie: 0   
        }
    },
    world: {
        corruption: 0,         
        turn: 0,               
        maxTurns: 20,          
        fieldName: "始まりの調和の森",
        bgClass: "forest-bg",
        envObjectClass: "env-object-forest"
    },
    ecosystem: {
        slime: { name: "スライム", count: 10, max: 10, extinct: false, displayName: "🟢 森のスライム", color: "var(--color-green)" },
        fishman: { name: "ギョジン", count: 8, max: 8, extinct: false, displayName: "🔵 湖のギョジン", color: "var(--color-blue)" },
        goblin: { name: "ゴブリン", count: 5, max: 5, extinct: false, displayName: "🔴 洞窟のゴブリン", color: "var(--color-red)" }
    },
    battle: {
        inBattle: false,
        currentEnemy: null
    },
    nextEncounterQueue: null,
    isProcessing: false,
    
    legacy: {
        extinctSpecies: [] 
    },
    library: [] 
};

// ==========================================
// 2. データベース（アイテム・敵・図鑑）
// ==========================================

const ARTIFACT_DATABASE = {
    glass_cannon: { name: "グラスキャノンの核", cost: 100, sellPrice: 50, desc: "こうげきりょく+50, ぼうぎょりょく-20。一撃必殺特化。" },
    miasma_veil: { name: "瘴気のベール", cost: 150, sellPrice: 75, desc: "毎ターンHP-5の毒ダメージをうけるが、あたえるダメージが2倍。" },
    poison_reflect: { name: "毒素伝染の核", cost: 120, sellPrice: 60, desc: "毒（瘴気）ダメージをうけた際、その2倍（10ダメージ）を敵にも反射。" },
    lowhp_power: { name: "背水のガラス", cost: 130, sellPrice: 65, desc: "HP20%以下でこうげきりょく3倍&ぼうぎょりょく+30。ピンチ時に覚醒。" },
    harmony_crest: { name: "保護者の紋章", cost: 90, sellPrice: 45, desc: "生存している種族数×10、ぼうぎょりょくが増加。" },
    seed_of_life: { name: "生命の種子", cost: 80, sellPrice: 40, desc: "毎ターンの探索進行時にHPが 5 回復する。生存力向上。" },
    chaos_eye: { name: "混沌の魔眼", cost: 140, sellPrice: 70, desc: "攻撃時, 世界の腐敗度の数値分の追加ダメージを敵にあたえる。" }
};

const enemyTemplates = {
    slime: { name: "スライム", hp: 30, maxHp: 30, atk: 8, def: 2, gold: 20, type: "slime" },
    fishman: { name: "ギョジン", hp: 45, maxHp: 45, atk: 12, def: 5, gold: 35, type: "fishman" },
    goblin: { name: "ゴブリン", hp: 60, maxHp: 60, atk: 18, def: 4, gold: 50, type: "goblin" },
    wood_golem: { name: "ウッドゴーレム", hp: 80, maxHp: 80, atk: 22, def: 8, gold: 60, type: "wood_golem" },
    
    stone_spider: { name: "ストーンスパイダー", hp: 85, maxHp: 85, atk: 25, def: 10, gold: 70, type: "stone_spider" },
    jewel_slime: { name: "ジュエルスライム", hp: 50, maxHp: 50, atk: 20, def: 15, gold: 150, type: "jewel_slime" },
    
    corrupted_slime: { name: "しょうきスライム", hp: 60, maxHp: 60, atk: 20, def: 5, gold: 40, type: "slime" },
    corrupted_fishman: { name: "きょうらんギョジン", hp: 80, maxHp: 80, atk: 28, def: 8, gold: 70, type: "fishman" },
    corrupted_goblin: { name: "ごうかゴブリン", hp: 110, maxHp: 110, atk: 38, def: 6, gold: 100, type: "goblin" },
    
    desert_fishman: { name: "すなあらしギョジン", hp: 70, maxHp: 70, atk: 22, def: 6, gold: 60, type: "desert_fishman" },
    desert_goblin: { name: "さばくゴブリン", hp: 90, maxHp: 90, atk: 30, def: 4, gold: 75, type: "desert_goblin" },
    desert_cactus: { name: "さばくサボテン", hp: 65, maxHp: 65, atk: 20, def: 12, gold: 50, type: "desert_cactus" },
    
    mud_slime: { name: "でいねいスライム", hp: 75, maxHp: 75, atk: 18, def: 12, gold: 55, type: "mud_slime" },
    fossil_fish: { name: "かせきうお", hp: 95, maxHp: 95, atk: 32, def: 5, gold: 80, type: "fossil_fish" },
    
    shadow_slime: { name: "シャドウスライム", hp: 90, maxHp: 90, atk: 26, def: 6, gold: 80, type: "shadow_slime" },
    abyss_fishman: { name: "しんえんギョジン", hp: 110, maxHp: 110, atk: 35, def: 10, gold: 100, type: "abyss_fishman" },
    abyss_demon: { name: "しんえんデーモン", hp: 140, maxHp: 140, atk: 48, def: 6, gold: 120, type: "abyss_demon" },
    
    goblin_slime: { name: "ゴブリンスライム", hp: 130, maxHp: 130, atk: 28, def: 10, gold: 150, type: "goblin_slime", isHybrid: true },
    fishman_slime: { name: "ギョジンスライム", hp: 140, maxHp: 140, atk: 32, def: 8, gold: 170, type: "fishman_slime", isHybrid: true },
    fishman_goblin: { name: "はんぎょゴブリン", hp: 160, maxHp: 160, atk: 40, def: 12, gold: 200, type: "fishman_goblin", isHybrid: true },
    wood_goblin: { name: "ウッドゴブリン", hp: 150, maxHp: 150, atk: 35, def: 14, gold: 180, type: "wood_goblin", isHybrid: true },
    metal_slime: { name: "メタルスライム", hp: 50, maxHp: 50, atk: 25, def: 35, gold: 220, type: "metal_slime", isHybrid: true },
    
    holy_slime: { name: "せいとうスライム", hp: 200, maxHp: 200, atk: 45, def: 25, gold: 300, type: "holy_slime", isHybrid: true, isForbidden: true },
    mage_fishman: { name: "しんかいまどうぎょじん", hp: 180, maxHp: 180, atk: 55, def: 15, gold: 300, type: "mage_fishman", isHybrid: true, isForbidden: true },
    goblin_paladin: { name: "ゴブリンパラディン", hp: 220, maxHp: 220, atk: 50, def: 30, gold: 350, type: "goblin_paladin", isHybrid: true, isForbidden: true },
    holy_golem: { name: "せいきゴーレム", hp: 250, maxHp: 250, atk: 48, def: 28, gold: 350, type: "holy_golem", isHybrid: true, isForbidden: true },
    
    paladin: { name: "ギルドのせいきし", hp: 200, maxHp: 200, atk: 45, def: 20, gold: 300, type: "paladin", isGuild: true },
    mage: { name: "ギルドのだいまどうし", hp: 150, maxHp: 150, atk: 60, def: 5, gold: 300, type: "mage", isGuild: true },
    desert_scout: { name: "ギルドのさばくスカウト", hp: 140, maxHp: 140, atk: 38, def: 10, gold: 250, type: "desert_scout", isGuild: true },
    archaeologist: { name: "ギルドのこうこがくしゃ", hp: 120, maxHp: 120, atk: 42, def: 8, gold: 250, type: "archaeologist", isGuild: true },
    dark_knight: { name: "ギルドのダークナイト", hp: 220, maxHp: 220, atk: 52, def: 15, gold: 350, type: "dark_knight", isGuild: true },
    valkyrie: { name: "ギルドそうちょうヴァルキリー", hp: 280, maxHp: 280, atk: 65, def: 25, gold: 500, type: "valkyrie", isGuild: true, isLeader: true },
    
    apocalypse: { name: "アポカリプス", hp: 350, maxHp: 350, atk: 65, def: 15, gold: 999, type: "mutant" }
};

const guildQuotes = {
    paladin: "「せいたいけいを　はかいする　おおつみびとめ！　ここでお前の暴挙を止める！」",
    mage: "「データさくじょだと？　我々は管理システムの人形ではない！　くらいなさい！」",
    desert_scout: "「すなの中に　しかばねを　さらすがいい。」",
    archaeologist: "「古代のれきしを　これ以上よごすことは　ゆるさん！」",
    dark_knight: "「ぜつめつの闇よりも深い、しんえんのきょうふを　あたえよう。」",
    valkyrie: "「私がギルドそうちょうヴァルキリーだ。これ以上の世界のよごれは、この槍がたつ！」"
};

const LIBRARY_DATABASE = {
    monsters: {
        slime: { name: "スライム", type: "slime", desc: "森に生息する原生生物。有機物を分解し、森の土壌を豊かに保つ重要な役割を持つ。攻撃性は低い。" },
        fishman: { name: "ギョジン", type: "fishman", desc: "湖の主と呼ばれる亜人種。澄んだ水を好み、水質の浄化や湖内の生態系バランスを管理している。" },
        goblin: { name: "ゴブリン", type: "goblin", desc: "洞窟に集落を作る亜人。古代の結界術を継承しており、洞窟奥深くに眠る『禁忌魔法』を封印し続けている。" },
        wood_golem: { name: "ウッドゴーレム", type: "wood_golem", desc: "森の大樹の精霊が物理的な木の体を構成した魔導ゴーレム。強固な物理防御を持ち、侵入者を無言で排除する。" },
        stone_spider: { name: "ストーンスパイダー", type: "stone_spider", desc: "古代の隠し洞窟で発見された、岩石のような甲殻を背負った巨大蜘蛛。地中の鉱石波動を感知し、鋭い糸で獲物を捕らえる。" },
        jewel_slime: { name: "ジュエルスライム", type: "jewel_slime", desc: "古代の隠し洞窟の奥深くに生息する、極めて希少なスライム。地底の魔石を捕食し、体内に美しい魔力宝石を生成する。" },
        corrupted_slime: { name: "しょうきスライム", type: "slime", desc: "世界の腐敗により瘴気を吸い込んで肥大化したスライム。分解能力が暴走し、触れるものすべてを腐食させる。" },
        corrupted_fishman: { name: "きょうらんギョジン", type: "fishman", desc: "汚染された水により精神に異常をきたしたギョジン。かつての温厚さはなく、見境なく侵入者を鋭い爪で引き裂く。" },
        corrupted_goblin: { name: "ごうかゴブリン", type: "goblin", desc: "世界の崩壊に恐怖し、怒りのあまり封印 of 炎を開放したゴブリン。全身から消えない業火の魔力を放っている。" },
        desert_fishman: { name: "すなあらしギョジン", type: "desert_fishman", desc: "スライム絶滅による砂漠化に適応したギョジン。表皮が砂のように硬く変化し、乾燥に極めて強い生命力を獲得した。" },
        desert_goblin: { name: "さばくゴブリン", type: "desert_goblin", desc: "干上がった砂漠の熱気により狂暴化したゴブリン。砂の中に潜み、油断した獲物を鋭い木槍で突き刺す。" },
        desert_cactus: { name: "さばくサボテン", type: "desert_cactus", desc: "砂漠の過酷な熱で意思を持った凶悪サボテン。攻撃した者に対して鋭い針をまき散らし、微小ダメージを反射する。" },
        mud_slime: { name: "でいねいスライム", type: "mud_slime", desc: "ギョジン絶滅により湖が干上がった際、底に溜まった高密度の汚泥とスライムが融合した生物。極めて高い物理防御力を誇る。" },
        fossil_fish: { name: "かせきうお", type: "fossil_fish", desc: "湖が干上がったことで出土した、数千年前の古代巨大魚のアンデッド。硬化したウロコと剥き出しの骨が強力な突進を生む。" },
        shadow_slime: { name: "シャドウスライム", type: "shadow_slime", desc: "ゴブリンが絶滅し封印が解けたことで、洞窟の闇の底から溢れ出た意思を持つ影。光を吸収し、不気味に蠢く。" },
        abyss_fishman: { name: "しんえんギョジン", type: "abyss_fishman", desc: "洞窟深部の暗黒魔力に適応したギョジン。目は退化しているが、頭部の触手から怪しい光を発し、獲物の生命力を探知する。" },
        abyss_demon: { name: "しんえんデーモン", type: "abyss_demon", desc: "洞窟最深部の禁忌封印の底に蠢いていた悪魔。人間の負の魔力を感知して活性化し、絶大な魔力を乗せた爪で襲いかかる。" },
        goblin_slime: { name: "ゴブリンスライム", type: "goblin_slime", desc: "【通常交配種】スライムの柔軟性とゴブリンの俊敏性を兼ね備えた変異種。動きが極めて素早く、捉えにくい。" },
        fishman_slime: { name: "ギョジンスライム", type: "fishman_slime", desc: "【通常交配種】スライムの生命力とギョジンの水流耐性が融合した変異種。受ける衝撃を半減する。" },
        fishman_goblin: { name: "はんぎょゴブリン", type: "fishman_goblin", desc: "【通常交配種】ゴブリンとギョジンが融合した凶暴な亜人。水陸両方で最強の戦闘力を発揮し、鋭い三叉矛で激しく襲いかかる。" },
        wood_goblin: { name: "ウッドゴブリン", type: "wood_goblin", desc: "【通常交配種】ウッドゴーレムの頑強な木肌を鎧として身につけたゴブリン。高い防御力と集団戦術の戦闘力を併せ持つ。" },
        metal_slime: { name: "メタルスライム", type: "metal_slime", desc: "【通常交配種】スライムとウッドゴーレムを交配したことで、全身が金属化した特殊なスライム。防御力が極めて高いが、HPは低い。" },
        holy_slime: { name: "せいとうスライム", type: "holy_slime", desc: "【禁忌交配種】捕獲した「聖騎士」と「スライム」を融合させた冒涜的な生命。体内で神聖力が凝縮されており、毎ターン自身の傷を高速修復する。" },
        mage_fishman: { name: "しんかいまどうぎょじん", type: "mage_fishman", desc: "【禁忌交配種】「大魔導士」と「ギョジン」を融合させた禁忌の生命。強力な水流魔法と広範囲の属性魔法を自在に操る。" },
        goblin_paladin: { name: "ゴブリンパラディン", type: "goblin_paladin", desc: "【禁忌交配種】「聖騎士」の強固な鎧の技術と「ゴブリン」の頑強な筋肉が融合した重装亜人。恐るべき物理防御力と剣技を持つ。" },
        holy_golem: { name: "せいきゴーレム", type: "holy_golem", desc: "【禁忌交配種】捕獲した「聖騎士」と「ウッドゴーレム」を交配した禁忌の兵器。白木の大樹に十字の金光が宿り、強烈な一撃を放つ。" },
        paladin: { name: "ギルドのせいきし", type: "paladin", desc: "世界の生態系を乱す「大罪人」を討伐すべく派遣されたギルドの騎士。神聖な盾で物理ダメージを無効化する。" },
        mage: { name: "ギルドのだいまどうし", type: "mage", desc: "ギルドの魔導院を統べる最高峰 of 術者。圧倒的な魔力を持つが、物理的な耐久力は低い。" },
        desert_scout: { name: "ギルドのさばくスカウト", type: "desert_scout", desc: "砂漠化した領域の調査とプレイヤーの暗殺を専門とする斥候。熱波を避けるため軽装だが、毒刃による奇襲を得意とする。" },
        archaeologist: { name: "ギルドのこうこがくしゃ", type: "archaeologist", desc: "干上がった湖底の遺跡発掘のために派遣されたギルドの学者。古い魔導書を読み解き、古代の衝撃魔法で応戦する。" },
        dark_knight: { name: "ギルドのダークナイト", type: "dark_knight", desc: "洞窟の暗黒魔力を調査すべく送り込まれたギルドの暗黒騎士。自らの生命力を代償に、破壊的な一撃を繰り出す。" },
        valkyrie: { name: "ギルドそうちょうヴァルキリー", type: "valkyrie", desc: "ギルドの全討伐部隊を統括する最強の戦士。世界の腐敗度が極限に達した時、プレイヤーを完全に排除するために自ら戦場に立ち塞がる。" },
        apocalypse: { name: "アポカリプス", type: "mutant", desc: "世界の完全崩壊によって発生した、防衛システムの最終プログラム。ただすべてを虚無に帰すことのみを目的に行動する。" }
    },
    items: {
        glass_cannon: { name: "グラスキャノンの核", type: "artifact", desc: "闇の商人が扱う物理の結晶。装備者の防御力を著しく低下させる代わりに、限界を突破した攻撃力を付与する。" },
        miasma_veil: { name: "瘴気のベール", type: "artifact", desc: "世界を覆う瘴気を精製して作られた布。毎ターン装備者の生命力を蝕むが、攻撃による与ダメージを2倍に増幅させる。" },
        poison_reflect: { name: "毒素伝染の核", type: "artifact", desc: "毒や瘴気の波動を増幅して反射する魔石。自身が毒ダメージを受ける際、その魔力を周囲に伝染させ、敵に強制的にダメージを反射する。" },
        lowhp_power: { name: "背水のガラス", type: "artifact", desc: "死の直前に光り輝くガラス。装備者のHPが極限（20%以下）まで減少した際、驚異的な防護結界と3倍の闘気を発生させる。" },
        harmony_crest: { name: "保護者の紋章", type: "artifact", desc: "世界の調和を守る者に与えられる紋章。野生の種族が健全に生き残っているほど、装備者の防御力を強化する。" },
        seed_of_life: { name: "生命の種子", type: "artifact", desc: "森の極小の生命エネルギーが宿った種子。毎ターンの探索進行時に装備者のHPを微小回復（HP+5）させる。" },
        chaos_eye: { name: "混沌の魔眼", type: "artifact", desc: "世界の腐敗が蓄積された結晶。攻撃時、世界の腐敗度が蓄積されているほど、追加ダメージを発生させて敵にぶつける。" },
        equip_sword: { name: "伝説の魔剣", type: "equipment", desc: "湖底から発掘された、妖しく輝く魔剣。手にする者に強大な剣撃のパワー（攻撃力+40）を与えるが、世界の終わりを加速させる。" },
        equip_magic: { name: "禁忌の魔法", type: "equipment", desc: "古代の洞窟の封印を解くことで獲得できる、空間を歪める暗黒魔法。プレイヤーの基礎攻撃力を25上昇させる。" }
    }
};

// ==========================================
// 3. DOM要素の取得
// ==========================================
const elements = {
    playerHp: document.getElementById("player-hp"),
    hpBar: document.getElementById("hp-bar"),
    playerAtk: document.getElementById("player-atk"),
    playerDef: document.getElementById("player-def"),
    playerGold: document.getElementById("player-gold"),
    playerEquip: document.getElementById("player-equip"),
    inventoryList: document.getElementById("inventory-list"),
    legacyBanner: document.getElementById("legacy-banner"),
    gameContainer: document.getElementById("game-container"),
    
    sidebarLeftCol: document.getElementById("sidebar-left-col"),
    mainDisplayCol: document.getElementById("main-display-col"),
    sidebarRightCol: document.getElementById("sidebar-right-col"),
    
    mobileTabGame: document.getElementById("mobile-tab-game"),
    mobileTabStatus: document.getElementById("mobile-tab-status"),
    mobileTabEcosystem: document.getElementById("mobile-tab-ecosystem"),
    
    visualExplore: document.getElementById("visual-explore"),
    visualBattle: document.getElementById("visual-battle"),
    visualMerchant: document.getElementById("visual-merchant"),
    visualEco: document.getElementById("visual-eco"),
    
    cageCellGolem: document.getElementById("cage-cell-golem"),
    cageCellSpider: document.getElementById("cage-cell-spider"),
    cageCellJewel: document.getElementById("cage-cell-jewel"),
    cageCellPaladin: document.getElementById("cage-cell-paladin"),
    cageCellMage: document.getElementById("cage-cell-mage"),
    cageCellValkyrie: document.getElementById("cage-cell-valkyrie"),
    
    stockSlime: document.getElementById("stock-slime"),
    stockFishman: document.getElementById("stock-fishman"),
    stockGoblin: document.getElementById("stock-goblin"),
    stockGolem: document.getElementById("stock-golem"),
    stockSpider: document.getElementById("stock-spider"),
    stockJewel: document.getElementById("stock-jewel"),
    stockPaladin: document.getElementById("stock-paladin"),
    stockMage: document.getElementById("stock-mage"),
    stockValkyrie: document.getElementById("stock-valkyrie"),
    
    corruptionValue: document.getElementById("corruption-value"),
    corruptionBar: document.getElementById("corruption-bar"),
    
    fieldName: document.getElementById("field-name"),
    environmentVisual: document.getElementById("environment-visual"),
    envObject: document.getElementById("env-object"),
    battleView: document.getElementById("visual-battle"),
    enemySprite: document.getElementById("enemy-sprite"),
    enemyName: document.getElementById("enemy-name"),
    enemyHp: document.getElementById("enemy-hp"),
    gameHeader: document.querySelector(".game-header"),
    
    countSlime: document.getElementById("count-slime"),
    countFishman: document.getElementById("count-fishman"),
    countGoblin: document.getElementById("count-goblin"),
    ecosystemEffect: document.getElementById("ecosystem-effect-text"),
    
    exploreCommands: document.getElementById("explore-commands"),
    ecoCommands: document.getElementById("eco-commands"),
    battleCommands: document.getElementById("battle-commands"),
    merchantCommands: document.getElementById("merchant-commands"),
    resultCommands: document.getElementById("result-commands"),
    
    // 【新】闇の商人メニュー用DOM
    merchantMenu: document.getElementById("merchant-menu"),
    merchantBuyList: document.getElementById("merchant-buy-list"),
    merchantSellList: document.getElementById("merchant-sell-list"),
    merchantSellButtons: document.getElementById("merchant-sell-buttons"),
    
    btnMerchantBuyMenu: document.getElementById("btn-merchant-buy-menu"),
    btnMerchantSellMenu: document.getElementById("btn-merchant-sell-menu"),
    btnMerchantBuyBack: document.getElementById("btn-merchant-buy-back"),
    btnMerchantSellBack: document.getElementById("btn-merchant-sell-back"),
    
    btnExplore: document.getElementById("btn-explore"),
    btnRest: document.getElementById("btn-rest"),
    btnEcoMenu: document.getElementById("btn-eco-menu"),
    btnLeaveEco: document.getElementById("btn-leave-eco"),
    btnOpenLibrary: document.getElementById("btn-open-library"),
    
    btnAttack: document.getElementById("btn-attack"),
    btnCapture: document.getElementById("btn-capture"),
    btnForbiddenItem: document.getElementById("btn-forbidden-item"),
    btnDeleteSpecies: document.getElementById("btn-delete-species"),
    btnRun: document.getElementById("btn-run"),
    btnLeaveMerchant: document.getElementById("btn-leave-merchant"),
    
    btnRestart: document.getElementById("btn-restart"),
    btnHardReset: document.getElementById("btn-hard-reset"),
    
    btnSidebarSave: document.getElementById("btn-sidebar-save"),
    btnSidebarLoad: document.getElementById("btn-sidebar-load"),
    btnSidebarRestart: document.getElementById("btn-sidebar-restart"),
    btnSidebarHardReset: document.getElementById("btn-sidebar-hard-reset"),
    
    btnReleaseSlime: document.getElementById("btn-release-slime"),
    btnReleaseFishman: document.getElementById("btn-release-fishman"),
    btnReleaseGoblin: document.getElementById("btn-release-goblin"),
    btnOpenBreeding: document.getElementById("btn-open-breeding"),
    
    btnBuyGlasscannon: document.getElementById("btn-buy-glasscannon"),
    btnBuyMiasma: document.getElementById("btn-buy-miasma"),
    btnBuyPoisonReflect: document.getElementById("btn-buy-poison-reflect"),
    btnBuyLowhpPower: document.getElementById("btn-buy-lowhp-power"),
    btnBuyHarmonyCrest: document.getElementById("btn-buy-harmony-crest"),
    btnBuySeedLife: document.getElementById("btn-buy-seed-life"),
    btnBuyChaosEye: document.getElementById("btn-buy-chaos-eye"),
    
    logConsole: document.getElementById("log-console"),
    
    miasmaOverlay: document.getElementById("miasma-overlay"),
    systemDeleteModal: document.getElementById("system-delete-modal"),
    deleteTargetName: document.getElementById("delete-target-name"),
    btnConfirmDelete: document.getElementById("btn-confirm-delete"),
    btnCancelDelete: document.getElementById("btn-cancel-delete"),
    btnCloseDeleteModal: document.getElementById("btn-close-delete-modal"),
    
    breedingModal: document.getElementById("breeding-modal"),
    breedParent1: document.getElementById("breed-parent1"),
    breedParent2: document.getElementById("breed-parent2"),
    btnExecuteBreed: document.getElementById("btn-execute-breed"),
    btnCancelBreed: document.getElementById("btn-cancel-breed"),
    btnCloseBreedingModal: document.getElementById("btn-close-breeding-modal"),
    
    libraryModal: document.getElementById("library-modal"),
    libraryCompletion: document.getElementById("library-completion"),
    tabLibraryMonsters: document.getElementById("tab-library-monsters"),
    tabLibraryItems: document.getElementById("tab-library-items"),
    libraryList: document.getElementById("library-list"),
    libraryDetail: document.getElementById("library-detail"),
    btnCloseLibraryModal: document.getElementById("btn-close-library-modal"),
    btnCloseLibrary: document.getElementById("btn-close-library")
};

// ==========================================
// 4. スマホレイアウト・タブ切替制御
// ==========================================

function switchMobileTab(tabName) {
    elements.mobileTabGame.classList.remove("active");
    elements.mobileTabStatus.classList.remove("active");
    elements.mobileTabEcosystem.classList.remove("active");

    elements.sidebarLeftCol.classList.add("mobile-hidden");
    elements.mainDisplayCol.classList.add("mobile-hidden");
    elements.sidebarRightCol.classList.add("mobile-hidden");

    if (tabName === "game") {
        elements.mobileTabGame.classList.add("active");
        elements.mainDisplayCol.classList.remove("mobile-hidden");
    } 
    else if (tabName === "status") {
        elements.mobileTabStatus.classList.add("active");
        elements.sidebarLeftCol.classList.remove("mobile-hidden");
    } 
    else if (tabName === "ecosystem") {
        elements.mobileTabEcosystem.classList.add("active");
        elements.sidebarRightCol.classList.remove("mobile-hidden");
    }
}

// ==========================================
// 5. 弱肉強食・ドラクエ風自動シミュレーション
// ==========================================

function simulateEcosystem() {
    if (state.player.extinctKills === 3) return; 

    let logTriggered = false;

    // --- ① 自然繁殖 ---
    Object.keys(state.ecosystem).forEach(key => {
        const species = state.ecosystem[key];
        if (!species.extinct && species.count > 0 && species.count < species.max) {
            if (Math.random() < 0.20) {
                species.count++;
                addLog(`【自然の恵み】${species.name}が　分裂して　増えた！`, "heal-log");
                logTriggered = true;
            }
        }
    });

    // --- ② 捕食関係 ---
    const slime = state.ecosystem.slime;
    const fishman = state.ecosystem.fishman;
    const goblin = state.ecosystem.goblin;

    if (!goblin.extinct && goblin.count > 0 && !slime.extinct && slime.count > 0) {
        if (Math.random() < 0.18) {
            slime.count = Math.max(0, slime.count - 1);
            addLog(`【弱肉強食】お腹をすかせた　ゴブリンが　スライムを　食べた！`, "damage-log");
            logTriggered = true;
            if (slime.count === 0) {
                triggerNaturalExtinction("slime");
            }
        }
    }

    if (!fishman.extinct && fishman.count > 0 && !slime.extinct && slime.count > 0) {
        if (Math.random() < 0.12) {
            slime.count = Math.max(0, slime.count - 1);
            addLog(`【捕食行動】ギョジンが　スライムを　捕らえて　飲み込んだ！`, "damage-log");
            logTriggered = true;
            if (slime.count === 0) {
                triggerNaturalExtinction("slime");
            }
        }
    }

    if (slime.extinct || slime.count === 0) {
        if (!goblin.extinct && goblin.count > 0 && Math.random() < 0.22) {
            goblin.count = Math.max(0, goblin.count - 1);
            addLog(`【飢餓発生】スライムが　いないため　ゴブリンが　餓死した！`, "damage-log");
            logTriggered = true;
            if (goblin.count === 0) {
                triggerNaturalExtinction("goblin");
            }
        }
        if (!fishman.extinct && fishman.count > 0 && Math.random() < 0.22) {
            fishman.count = Math.max(0, fishman.count - 1);
            addLog(`【飢餓発生】水質が悪化し　ギョジンが　息絶えてしまった！`, "damage-log");
            logTriggered = true;
            if (fishman.count === 0) {
                triggerNaturalExtinction("fishman");
            }
        }
    }

    // --- ③ 縄張り争い ---
    if (!goblin.extinct && goblin.count > 0 && !fishman.extinct && fishman.count > 0) {
        if (Math.random() < 0.12) {
            goblin.count = Math.max(0, goblin.count - 1);
            fishman.count = Math.max(0, fishman.count - 1);
            addLog(`【縄張り争い】ゴブリンとギョジンが　激突し　双方に被害が出た！`, "warning-log");
            logTriggered = true;
            if (goblin.count === 0) triggerNaturalExtinction("goblin");
            if (fishman.count === 0) triggerNaturalExtinction("fishman");
        }
    }

    // --- ④ 人間（討伐隊）巡回 ---
    if (state.world.corruption > 20) {
        const huntChance = state.world.corruption / 220;
        if (Math.random() < huntChance) {
            const alivePool = [];
            if (!slime.extinct && slime.count > 0) alivePool.push("slime");
            if (!fishman.extinct && fishman.count > 0) alivePool.push("fishman");
            if (!goblin.extinct && goblin.count > 0) alivePool.push("goblin");

            if (alivePool.length > 0) {
                const targetKey = alivePool[Math.floor(Math.random() * alivePool.length)];
                const target = state.ecosystem[targetKey];
                target.count = Math.max(0, target.count - 1);
                
                state.world.corruption = Math.max(0, state.world.corruption - 4);
                addLog(`【ギルド巡回】討伐隊が　野生の${target.name}を　退治した！ (世界の腐敗度 -4%)`, "warning-log");
                logTriggered = true;
                
                if (target.count === 0) {
                    triggerNaturalExtinction(targetKey);
                }
            }
        }
    }

    // --- ⑤ 檻（ケージ）内トラブル ---
    const totalHumans = state.player.captured.paladin + state.player.captured.mage + state.player.captured.valkyrie;
    const totalMonsters = state.player.captured.slime + state.player.captured.fishman + state.player.captured.goblin + state.player.captured.golem + state.player.captured.spider + state.player.captured.jewel;
    
    if (totalHumans > 0 && totalMonsters > 0) {
        if (Math.random() < 0.15) {
            const monsterKeys = ["slime", "fishman", "goblin", "golem", "spider", "jewel"].filter(k => state.player.captured[k] > 0);
            if (monsterKeys.length > 0) {
                const victim = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
                state.player.captured[victim]--;
                
                const dbNames = { slime: "スライム", fishman: "ギョジン", goblin: "ゴブリン", golem: "ゴーレム", spider: "岩蜘蛛", jewel: "宝スライム" };
                addLog(`【おりの中】捕らわれた人間が　暴れて　ストックの${dbNames[victim]}を　倒した！`, "damage-log");
                logTriggered = true;
            }
        }
    }

    if (logTriggered) {
        updateUI();
    }
}

// ==========================================
// 6. 演出・ログ・ほか
// ==========================================

function addLog(text, className = "system-log") {
    const p = document.createElement("p");
    p.className = className;
    p.innerHTML = text;
    elements.logConsole.appendChild(p);
    elements.logConsole.scrollTop = elements.logConsole.scrollHeight;
}

function triggerScreenShake() {
    elements.environmentVisual.classList.add("shake");
    setTimeout(() => {
        elements.environmentVisual.classList.remove("shake");
    }, 300);
}

function triggerScreenGlitch() {
    elements.gameContainer.classList.add("glitch-effect");
    setTimeout(() => {
        elements.gameContainer.classList.remove("glitch-effect");
    }, 1200);
}

function triggerCaptureFlash() {
    elements.environmentVisual.classList.add("capture-flash-effect");
    setTimeout(() => {
        elements.environmentVisual.classList.remove("capture-flash-effect");
    }, 400);
}

// ==========================================
// 7. 図鑑コレクション機能
// ==========================================

function loadLibraryData() {
    const data = localStorage.getItem('eco_breaker_library_unlocked');
    if (data) {
        state.library = JSON.parse(data);
    } else {
        state.library = [];
    }
}

function unlockLibraryItem(id) {
    if (!state.library.includes(id)) {
        state.library.push(id);
        localStorage.setItem('eco_breaker_library_unlocked', JSON.stringify(state.library));
        
        let name = "未知のデータ";
        if (LIBRARY_DATABASE.monsters[id]) name = LIBRARY_DATABASE.monsters[id].name;
        else if (LIBRARY_DATABASE.items[id]) name = LIBRARY_DATABASE.items[id].name;
        
        addLog(`【図鑑登録】「${name}」の　図鑑データが　同期された！`, "heal-log");
    }
}

function openLibraryModal() {
    elements.libraryModal.classList.remove("hidden");
    renderLibraryList();
}

function renderLibraryList() {
    elements.libraryList.innerHTML = "";
    elements.libraryDetail.innerHTML = '<p class="select-prompt">リストから項目を選択してください。</p>';
    
    const category = currentLibraryTab;
    const db = LIBRARY_DATABASE[category];
    const unlockedCount = Object.keys(db).filter(id => state.library.includes(id)).length;
    const totalCount = Object.keys(db).length;
    
    if (category === "monsters") {
        elements.tabLibraryMonsters.innerText = `生物・人間 (${unlockedCount}/${totalCount})`;
        elements.tabLibraryMonsters.classList.add("active");
        elements.tabLibraryItems.classList.remove("active");
    } else {
        elements.tabLibraryItems.innerText = `秘宝・装備 (${unlockedCount}/${totalCount})`;
        elements.tabLibraryItems.classList.add("active");
        elements.tabLibraryMonsters.classList.remove("active");
    }
    
    const totalUnlocked = state.library.length;
    const totalDb = Object.keys(LIBRARY_DATABASE.monsters).length + Object.keys(LIBRARY_DATABASE.items).length;
    const percent = Math.floor((totalUnlocked / totalDb) * 100);
    elements.libraryCompletion.innerText = `収集率: ${percent}% (${totalUnlocked} / ${totalDb})`;
    
    Object.keys(db).forEach(id => {
        const item = db[id];
        const btn = document.createElement("button");
        
        if (state.library.includes(id)) {
            btn.className = "library-item-btn";
            btn.innerText = item.name;
            btn.addEventListener("click", () => showLibraryDetail(id, category));
        } else {
            btn.className = "library-item-btn locked";
            btn.innerText = "？？？？";
            btn.disabled = true;
        }
        elements.libraryList.appendChild(btn);
    });
}

function showLibraryDetail(id, category) {
    const buttons = elements.libraryList.querySelectorAll(".library-item-btn");
    buttons.forEach(btn => {
        if (btn.innerText === LIBRARY_DATABASE[category][id].name) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });

    const item = LIBRARY_DATABASE[category][id];
    elements.libraryDetail.innerHTML = "";
    
    const header = document.createElement("div");
    header.className = "library-detail-header";
    header.innerHTML = `
        <div class="library-detail-name">${item.name}</div>
        <div class="library-detail-category">ID::${id.toUpperCase()}</div>
    `;
    elements.libraryDetail.appendChild(header);
    
    if (category === "monsters") {
        const spriteContainer = document.createElement("div");
        spriteContainer.className = "library-detail-sprite-container";
        
        const sprite = document.createElement("div");
        sprite.id = "library-detail-sprite";
        sprite.className = "library-detail-sprite sprite-" + item.type;
        sprite.style.width = "70px";
        sprite.style.height = "70px";
        
        spriteContainer.appendChild(sprite);
        elements.libraryDetail.appendChild(spriteContainer);
    }
    
    const body = document.createElement("div");
    body.className = "library-detail-body";
    body.innerText = item.desc;
    elements.libraryDetail.appendChild(body);
}

let currentLibraryTab = "monsters";

// ==========================================
// 8. UIの描画とコマンド・ビジュアル切替
// ==========================================

function updateUI() {
    elements.playerHp.innerText = `${state.player.hp} / ${state.player.maxHp}`;
    const hpPercent = (state.player.hp / state.player.maxHp) * 100;
    elements.hpBar.style.width = `${hpPercent}%`;
    
    const actualAtk = calculatePlayerAtk();
    const actualDef = calculatePlayerDef();
    elements.playerAtk.innerText = actualAtk;
    if (actualAtk !== state.player.atk) {
        elements.playerAtk.classList.add("boosted");
    } else {
        elements.playerAtk.classList.remove("boosted");
    }
    elements.playerDef.innerText = actualDef;
    elements.playerGold.innerText = `${state.player.gold} G`;
    elements.playerEquip.innerText = state.player.equip;
    
    elements.corruptionValue.innerText = `${state.world.corruption}%`;
    elements.corruptionBar.style.width = `${state.world.corruption}%`;
    
    const miasmaVal = state.world.corruption / 100;
    document.documentElement.style.setProperty('--miasma-opacity', miasmaVal * 0.45);

    updateSpeciesUI("slime", elements.countSlime);
    updateSpeciesUI("fishman", elements.countFishman);
    updateSpeciesUI("goblin", elements.countGoblin);

    let activeSpeciesCount = 3 - state.player.extinctKills;
    if (state.player.extinctKills === 3) {
        elements.ecosystemEffect.innerText = "世界は　完全に　崩壊した！";
        elements.ecosystemEffect.style.color = "var(--color-red)";
    } else if (state.player.extinctKills > 0) {
        elements.ecosystemEffect.innerText = `自然の調和が　崩れかけている。`;
        elements.ecosystemEffect.style.color = "var(--color-yellow)";
    } else {
        elements.ecosystemEffect.innerText = "生態系は　おだやかに　安定している。";
        elements.ecosystemEffect.style.color = "var(--color-white)";
    }

    updateCapturedUI();
    updateInventoryUI();
}

function updateSpeciesUI(type, element) {
    const sp = state.ecosystem[type];
    if (sp.extinct) {
        element.innerText = "絶滅 (DELETED)";
        element.className = "species-count extinct";
    } else {
        element.innerText = `${sp.count} / ${sp.max}`;
        element.className = "species-count";
        element.style.color = "var(--color-white)";
    }
}

function showVisualView(viewName) {
    elements.visualExplore.classList.add("hidden");
    elements.visualBattle.classList.add("hidden");
    elements.visualMerchant.classList.add("hidden");
    elements.visualEco.classList.add("hidden");

    if (viewName === "explore") elements.visualExplore.classList.remove("hidden");
    if (viewName === "battle") elements.visualBattle.classList.remove("hidden");
    if (viewName === "merchant") elements.visualMerchant.classList.remove("hidden");
    if (viewName === "eco") elements.visualEco.classList.remove("hidden");
}

function showCommandGroup(groupName) {
    elements.exploreCommands.classList.add("hidden");
    elements.ecoCommands.classList.add("hidden");
    elements.battleCommands.classList.add("hidden");
    elements.merchantCommands.classList.add("hidden");
    elements.resultCommands.classList.add("hidden");

    if (groupName === "explore") {
        elements.exploreCommands.classList.remove("hidden");
        showVisualView("explore");
    }
    if (groupName === "eco") {
        elements.ecoCommands.classList.remove("hidden");
        showVisualView("eco");
    }
    if (groupName === "battle") {
        elements.battleCommands.classList.remove("hidden");
        showVisualView("battle");
    }
    if (groupName === "merchant") {
        elements.merchantCommands.classList.remove("hidden");
        showVisualView("merchant");
    }
    if (groupName === "result") {
        elements.resultCommands.classList.remove("hidden");
    }
}

function initGame() {
    state.isProcessing = false;
    state.player.hp = 100;
    state.player.maxHp = 100;
    state.player.atk = 15;
    state.player.baseAtk = 15;
    state.player.def = 10;
    state.player.baseDef = 10;
    state.player.gold = 100;
    state.player.equip = "なし";
    state.player.isMiasmaActive = false;
    state.player.extinctKills = 0;
    state.player.artifacts = [];
    
    state.player.captured = {
        slime: 0,
        fishman: 0,
        goblin: 0,
        golem: 0,
        spider: 0,
        jewel: 0,
        paladin: 0,
        mage: 0,
        valkyrie: 0
    };
    
    state.world.corruption = 0;
    state.world.turn = 0;
    state.world.fieldName = "始まりの調和の森";
    state.world.bgClass = "forest-bg";
    state.world.envObjectClass = "env-object-forest";
    
    state.ecosystem.slime.count = 10;
    state.ecosystem.slime.extinct = false;
    state.ecosystem.fishman.count = 8;
    state.ecosystem.fishman.extinct = false;
    state.ecosystem.goblin.count = 5;
    state.ecosystem.goblin.extinct = false;
    
    state.battle.inBattle = false;
    state.battle.currentEnemy = null;
    state.nextEncounterQueue = null;

    elements.miasmaOverlay.style.opacity = "0";

    elements.fieldName.innerText = state.world.fieldName;
    elements.environmentVisual.className = "environment-visual " + state.world.bgClass;
    elements.envObject.className = state.world.envObjectClass;

    elements.cageCellGolem.classList.add("hidden");
    elements.cageCellSpider.classList.add("hidden");
    elements.cageCellJewel.classList.add("hidden");
    elements.cageCellPaladin.classList.add("hidden");
    elements.cageCellMage.classList.add("hidden");
    elements.cageCellValkyrie.classList.add("hidden");

    elements.logConsole.innerHTML = "";
    addLog("エコ・ブレイカーが　きどうした！", "system-log");

    loadLibraryData();
    loadLegacyData();

    showCommandGroup("explore");
    updateUI();

    if (localStorage.getItem('eco_breaker_save_data')) {
        elements.btnSidebarLoad.disabled = false;
    } else {
        elements.btnSidebarLoad.disabled = true;
    }

    switchMobileTab("game");
}

// ==========================================
// 10. 周回引き継ぎ機能
// ==========================================

function saveLegacyData() {
    const extinctList = [];
    if (state.ecosystem.slime.extinct) extinctList.push("slime");
    if (state.ecosystem.fishman.extinct) extinctList.push("fishman");
    if (state.ecosystem.goblin.extinct) extinctList.push("goblin");
    
    localStorage.setItem('eco_breaker_extinct_legacy', JSON.stringify(extinctList));
}

function loadLegacyData() {
    const data = localStorage.getItem('eco_breaker_extinct_legacy');
    if (data) {
        state.legacy.extinctSpecies = JSON.parse(data);
        if (state.legacy.extinctSpecies.length > 0) {
            elements.legacyBanner.classList.remove("hidden");
            const names = state.legacy.extinctSpecies.map(s => state.ecosystem[s].name).join("、");
            elements.legacyBanner.innerText = `【世界線同期】前世で滅んだ [${names}] は存在しません。`;
            
            state.legacy.extinctSpecies.forEach(type => {
                state.ecosystem[type].count = 0;
                state.ecosystem[type].extinct = true;
                state.player.extinctKills++;
                state.world.corruption = Math.min(100, state.world.corruption + 20);
                state.player.atk += 20; 
                applyEnvironmentChange(type, true); 
            });
            
            addLog(`前世で　[${names}]　が消え去った世界から　スタートした。(初期こうげき+${state.legacy.extinctSpecies.length * 20})`, "miasma-log");
        } else {
            elements.legacyBanner.classList.add("hidden");
        }
    }
}

function hardResetLegacy() {
    if (confirm("本当に全ての世界線記憶（引き継ぎデータ）を消去して完全初期状態に戻しますか？")) {
        localStorage.removeItem('eco_breaker_extinct_legacy');
        elements.legacyBanner.classList.add("hidden");
        state.legacy.extinctSpecies = [];
        addLog("システム: 世界線の遺産メモリを完全に消去しました。", "warning-log");
        initGame();
    }
}

// ==========================================
// 11. パッシブステータス計算
// ==========================================

function updateInventoryUI() {
    elements.inventoryList.innerHTML = "";
    if (state.player.artifacts.length === 0) {
        elements.inventoryList.innerHTML = '<p class="no-items">ぶき・防具を　もっていません</p>';
        return;
    }
    
    state.player.artifacts.forEach(artId => {
        const item = ARTIFACT_DATABASE[artId];
        const span = document.createElement("span");
        span.className = "artifact-badge";
        span.innerText = item.name;
        span.title = item.desc;
        elements.inventoryList.appendChild(span);
        
        unlockLibraryItem(artId);
    });
}

function calculatePlayerAtk() {
    let currentAtk = state.player.atk;
    if (state.player.isMiasmaActive) currentAtk *= 2;
    
    const hpPercent = (state.player.hp / state.player.maxHp) * 100;
    if (state.player.artifacts.includes("lowhp_power") && hpPercent <= 20) {
        currentAtk *= 3;
    }
    
    if (state.player.artifacts.includes("chaos_eye")) {
        currentAtk += state.world.corruption;
    }

    return currentAtk;
}

function calculatePlayerDef() {
    let currentDef = state.player.def;
    const hpPercent = (state.player.hp / state.player.maxHp) * 100;
    if (state.player.artifacts.includes("lowhp_power") && hpPercent <= 20) {
        currentDef += 30;
    }
    if (state.player.artifacts.includes("harmony_crest")) {
        let aliveCount = 0;
        if (!state.ecosystem.slime.extinct) aliveCount++;
        if (!state.ecosystem.fishman.extinct) aliveCount++;
        if (!state.ecosystem.goblin.extinct) aliveCount++;
        currentDef += (aliveCount * 10);
    }
    return currentDef;
}

// ==========================================
// 12. キャプチャー（捕獲）
// ==========================================

function updateCapturedUI() {
    elements.stockSlime.innerText = `${state.player.captured.slime} 匹`;
    elements.stockFishman.innerText = `${state.player.captured.fishman} 匹`;
    elements.stockGoblin.innerText = `${state.player.captured.goblin} 匹`;
    elements.stockGolem.innerText = `${state.player.captured.golem} 匹`;
    elements.stockSpider.innerText = `${state.player.captured.spider} 匹`;
    elements.stockJewel.innerText = `${state.player.captured.jewel} 匹`;
    elements.stockPaladin.innerText = `${state.player.captured.paladin} 人`;
    elements.stockMage.innerText = `${state.player.captured.mage} 人`;
    elements.stockValkyrie.innerText = `${state.player.captured.valkyrie} 人`;

    if (state.library.includes("wood_golem") || state.player.captured.golem > 0) {
        elements.cageCellGolem.classList.remove("hidden");
    } else {
        elements.cageCellGolem.classList.add("hidden");
    }

    if (state.library.includes("stone_spider") || state.player.captured.spider > 0) {
        elements.cageCellSpider.classList.remove("hidden");
    } else {
        elements.cageCellSpider.classList.add("hidden");
    }

    if (state.library.includes("jewel_slime") || state.player.captured.jewel > 0) {
        elements.cageCellJewel.classList.remove("hidden");
    } else {
        elements.cageCellJewel.classList.add("hidden");
    }

    const hasAnyPaladinType = state.library.includes("paladin") || 
                              state.library.includes("desert_scout") || 
                              state.library.includes("dark_knight") || 
                              state.player.captured.paladin > 0;
    if (hasAnyPaladinType) {
        elements.cageCellPaladin.classList.remove("hidden");
    } else {
        elements.cageCellPaladin.classList.add("hidden");
    }

    const hasAnyMageType = state.library.includes("mage") || 
                           state.library.includes("archaeologist") || 
                           state.player.captured.mage > 0;
    if (hasAnyMageType) {
        elements.cageCellMage.classList.remove("hidden");
    } else {
        elements.cageCellMage.classList.add("hidden");
    }

    if (state.library.includes("valkyrie") || state.player.captured.valkyrie > 0) {
        elements.cageCellValkyrie.classList.remove("hidden");
    } else {
        elements.cageCellValkyrie.classList.add("hidden");
    }
}

function performCapture() {
    if (state.isProcessing) return;
    if (!state.battle.inBattle) return;
    state.isProcessing = true;

    const enemy = state.battle.currentEnemy;

    if (enemy.hp <= 0) {
        addLog("【捕獲エラー】たおしたモンスターは　捕獲できません！", "warning-log");
        state.isProcessing = false;
        return;
    }

    if (enemy.type === "mutant") {
        addLog("【捕獲エラー】アポカリプスは　捕獲できません！", "warning-log");
        state.isProcessing = false;
        return;
    }
    if (enemy.isHybrid) {
        addLog("【捕獲エラー】交配種は　檻に入れることはできません！", "warning-log");
        state.isProcessing = false;
        return;
    }

    const hpRatio = enemy.hp / enemy.maxHp;
    const captureChance = Math.max(5, Math.floor((1 - hpRatio) * 100));

    addLog(`捕獲用ケージを　投げた！ (成功率: ${captureChance}%)`, "system-log");

    if (Math.random() * 100 < captureChance) {
        triggerCaptureFlash();
        
        let stockKey = enemy.type;
        if (enemy.type === "desert_fishman" || enemy.type === "abyss_fishman") stockKey = "fishman";
        if (enemy.type === "desert_goblin") stockKey = "goblin";
        if (enemy.type === "mud_slime" || enemy.type === "shadow_slime" || enemy.type === "metal_slime") stockKey = "slime";
        if (enemy.type === "wood_golem") stockKey = "golem"; 
        if (enemy.type === "stone_spider") stockKey = "spider";
        if (enemy.type === "jewel_slime") stockKey = "jewel";
        if (enemy.type === "desert_scout" || enemy.type === "dark_knight") stockKey = "paladin";
        if (enemy.type === "archaeologist") stockKey = "mage";
        if (enemy.type === "valkyrie") stockKey = "valkyrie";

        state.player.captured[stockKey]++;
        
        unlockLibraryItem(enemy.key);
        
        addLog(`「${enemy.name}」の　ほかくに　せいこうした！`, "heal-log");

        if (!enemy.isGuild && enemy.type !== "stone_spider" && enemy.type !== "jewel_slime") {
            let baseMapType = enemy.type;
            if (enemy.type === "desert_fishman" || enemy.type === "abyss_fishman") baseMapType = "fishman";
            if (enemy.type === "desert_goblin") baseMapType = "goblin";
            if (enemy.type === "mud_slime" || enemy.type === "shadow_slime" || enemy.type === "wood_golem") baseMapType = "slime"; 
            
            const species = state.ecosystem[baseMapType];
            if (species) {
                species.count = Math.max(0, species.count - 1);
                if (species.count === 0 && !species.extinct) {
                    triggerNaturalExtinction(baseMapType);
                }
            }
        }

        state.battle.inBattle = false;
        state.battle.currentEnemy = null;
        elements.battleView.classList.add("hidden");
        showCommandGroup("explore");
        nextTurn();
    } else {
        const enemyDisplayName = enemy.isKnown ? enemy.name : "？？？？";
        addLog(`「${enemyDisplayName}」は　すばやく　身をかわした！`, "damage-log");
        enemyTurn();
    }
}

// ==========================================
// 13. 生態系操作 (放流と人工交配)
// ==========================================

function openEcoMenu() {
    showCommandGroup("eco");
    addLog("システム: 生態系メニュー。捕獲個体の野生放流や、交配を行えます。", "system-log");
    
    elements.btnReleaseSlime.disabled = (state.player.captured.slime <= 0) || state.ecosystem.slime.extinct || (state.ecosystem.slime.count >= state.ecosystem.slime.max);
    elements.btnReleaseFishman.disabled = (state.player.captured.fishman <= 0) || state.ecosystem.fishman.extinct || (state.ecosystem.fishman.count >= state.ecosystem.fishman.max);
    elements.btnReleaseGoblin.disabled = (state.player.captured.goblin <= 0) || state.ecosystem.goblin.extinct || (state.ecosystem.goblin.count >= state.ecosystem.goblin.max);
    
    const totalCaptured = Object.values(state.player.captured).reduce((a, b) => a + b, 0);
    elements.btnOpenBreeding.disabled = (totalCaptured < 2);
}

function executeRelease(type) {
    if (state.player.captured[type] <= 0) return;
    
    state.player.captured[type]--; 
    const species = state.ecosystem[type];
    species.count = Math.min(species.max, species.count + 2);
    
    addLog("野生に「" + species.name + "」を　放流した！　生息数が 2体 増えた。", "heal-log");
    openEcoMenu(); 
    updateUI();
}

function openBreedingModal() {
    elements.breedParent1.innerHTML = "";
    elements.breedParent2.innerHTML = "";
    
    const db = {
        slime: "スライム",
        fishman: "ギョジン",
        goblin: "ゴブリン",
        golem: "ウッドゴーレム",
        spider: "ストーンスパイダー",
        jewel: "ジュエルスライム",
        paladin: "ギルドせいきし",
        mage: "ギルド魔導士",
        valkyrie: "ギルドそうちょう"
    };

    let itemsAdded = 0;
    Object.keys(state.player.captured).forEach(key => {
        const count = state.player.captured[key];
        if (count > 0) {
            const label = `${db[key]} (${count}匹)`;
            const opt1 = new Option(label, key);
            const opt2 = new Option(label, key);
            elements.breedParent1.add(opt1);
            elements.breedParent2.add(opt2);
            itemsAdded++;
        }
    });
    
    if (elements.breedParent2.options.length > 1) {
        elements.breedParent2.selectedIndex = 1;
    }

    elements.breedingModal.classList.remove("hidden");
}

function executeHybridBreeding() {
    const parent1 = elements.breedParent1.value;
    const parent2 = elements.breedParent2.value;

    if (parent1 === parent2) {
        if (state.player.captured[parent1] < 2) {
            alert(`おなじ種族で交配するには、2匹以上のストックが必要です！`);
            return;
        }
    }

    state.player.captured[parent1]--;
    state.player.captured[parent2]--;
    
    elements.breedingModal.classList.add("hidden");

    let hybridKey = "";
    const isHuman1 = (parent1 === "paladin" || parent1 === "mage" || parent1 === "valkyrie");
    const isHuman2 = (parent2 === "paladin" || parent2 === "mage" || parent2 === "valkyrie");
    
    if (isHuman1 || isHuman2) {
        const parts = [parent1, parent2].sort();
        if (parts.includes("valkyrie")) {
            hybridKey = "apocalypse";
        } else if (parts.includes("golem") && parts.includes("paladin")) {
            hybridKey = "holy_golem";
        } else if (parts.includes("slime") && parts.includes("paladin")) {
            hybridKey = "holy_slime";
        } else if (parts.includes("fishman") && parts.includes("mage")) {
            hybridKey = "mage_fishman";
        } else if (parts.includes("goblin") && parts.includes("paladin")) {
            hybridKey = "goblin_paladin";
        } else {
            hybridKey = "apocalypse";
        }
    } else {
        const parts = [parent1, parent2].sort();
        
        if (parts.includes("jewel")) {
            hybridKey = "metal_slime"; 
        } else if (parts.includes("spider")) {
            hybridKey = "fishman_goblin"; 
        } else if (parts.includes("goblin") && parts.includes("golem")) {
            hybridKey = "wood_goblin";
        } else if (parts.includes("slime") && parts.includes("golem")) {
            hybridKey = "metal_slime";
        } else if (parts.includes("slime") && parts.includes("goblin")) {
            hybridKey = "goblin_slime";
        } else if (parts.includes("slime") && parts.includes("fishman")) {
            hybridKey = "fishman_slime";
        } else if (parts.includes("fishman") && parts.includes("goblin")) {
            hybridKey = "fishman_goblin";
        } else {
            hybridKey = "corrupted_" + parent1;
        }
    }

    state.nextEncounterQueue = hybridKey;
    
    addLog(`【人工交配】掛け合わせが　完了した！`, "miasma-log");
    addLog(`新しい変異ハイブリッド種が　放流されました。`, "warning-log");
    
    showCommandGroup("explore");
    updateUI();
}

// ==========================================
// 14. 探索進行 & 闇の商人ランダム遭遇イベント
// ==========================================

function getAvailableEntitiesForField() {
    if (state.ecosystem.slime.extinct && !state.ecosystem.fishman.extinct && !state.ecosystem.goblin.extinct) {
        return {
            wild: ["corrupted_fishman", "corrupted_goblin", "desert_fishman", "desert_goblin", "desert_cactus"],
            guild: "desert_scout"
        };
    }
    if (!state.ecosystem.slime.extinct && state.ecosystem.fishman.extinct && !state.ecosystem.goblin.extinct) {
        return {
            wild: ["corrupted_slime", "corrupted_goblin", "mud_slime", "fossil_fish"],
            guild: "archaeologist"
        };
    }
    if (!state.ecosystem.slime.extinct && !state.ecosystem.fishman.extinct && state.ecosystem.goblin.extinct) {
        return {
            wild: ["corrupted_slime", "corrupted_fishman", "shadow_slime", "abyss_fishman", "abyss_demon"],
            guild: "dark_knight"
        };
    }
    if (state.player.extinctKills === 3) {
        return {
            wild: ["apocalypse"],
            guild: null
        };
    }
    if (state.player.extinctKills === 2) {
        const wildPool = [];
        if (!state.ecosystem.slime.extinct) wildPool.push("corrupted_slime", "shadow_slime", "mud_slime");
        if (!state.ecosystem.fishman.extinct) wildPool.push("corrupted_fishman", "abyss_fishman", "desert_fishman");
        if (!state.ecosystem.goblin.extinct) wildPool.push("corrupted_goblin", "desert_goblin", "desert_cactus");
        
        return {
            wild: wildPool,
            guild: (Math.random() < 0.5) ? "paladin" : "mage"
        };
    }

    return {
        wild: ["slime", "fishman", "goblin", "wood_golem"],
        guild: (Math.random() < 0.5) ? "paladin" : "mage"
    };
}

function performExplore() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    state.world.turn++;
    addLog(`探索ターン ${state.world.turn} : 周囲を　しらべている。`, "system-log");

    if (state.player.isMiasmaActive) {
        const poisonDmg = 5;
        state.player.hp = Math.max(1, state.player.hp - poisonDmg);
        addLog(`[瘴気のベール] 毒が　体をむしばむ！　${poisonDmg}のダメージ！`, "miasma-log");
    }

    if (state.player.artifacts.includes("seed_of_life") && state.player.hp < state.player.maxHp) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
        addLog(`【パッシブ】[生命の種子] HPが 5 回復した。`, "heal-log");
    }

    // 1. 【最優先】闇の商人との遭遇イベント (18%の確率)
    // モンスターの出現や交配種キュー(nextEncounterQueue)の処理よりも、商人の登場を最優先します。
    if (Math.random() < 0.18 && !state.battle.inBattle) {
        switchMobileTab("game");
        setTimeout(() => {
            startMerchantTransaction();
        }, 800);
        return;
    }

    // 2. 隠し古代の洞窟発見イベント (15%の確率)
    if (Math.random() < 0.15 && !state.battle.inBattle) {
        addLog("岩壁が崩れて　『古代の隠し洞窟』が　あらわれた！", "warning-log");
        addLog("奥から　未知の生命のうめき声が　聞こえる……。", "warning-log");
        const caveEnemy = (Math.random() < 0.5) ? "stone_spider" : "jewel_slime";
        switchMobileTab("game");
        setTimeout(() => {
            startBattle(caveEnemy);
        }, 800);
        return;
    }

    // 3. 人工交配で指定された魔物の出現
    if (state.nextEncounterQueue) {
        switchMobileTab("game");
        startBattle(state.nextEncounterQueue);
        state.nextEncounterQueue = null; 
        return;
    }

    const entities = getAvailableEntitiesForField();

    if (state.world.corruption >= 100 && Math.random() < 0.6) {
        switchMobileTab("game");
        startBattle("apocalypse");
        return;
    }

    if (state.player.extinctKills === 3) {
        switchMobileTab("game");
        startBattle("apocalypse");
        return;
    }

    if (state.world.corruption >= 50 && Math.random() < 0.3 && entities.guild) {
        let chosenGuild = entities.guild;
        if (state.world.corruption >= 80 && Math.random() < 0.3) {
            chosenGuild = "valkyrie";
        }
        switchMobileTab("game");
        startBattle(chosenGuild);
        return;
    }

    const rand = Math.random();
    if (rand < 0.45) {
        const chosenEnemy = entities.wild[Math.floor(Math.random() * entities.wild.length)];
        switchMobileTab("game");
        startBattle(chosenEnemy);
    } else if (rand < 0.70) {
        triggerFindItemEvent();
    } else {
        addLog("周りには　だれもいないようだ。", "system-log");
        nextTurn();
    }
}

function triggerFindItemEvent() {
    const rand = Math.random();
    if (rand < 0.5) {
        const goldFound = Math.floor(Math.random() * 25) + 15;
        state.player.gold += goldFound;
        addLog(`宝箱を　見つけた！　中から ${goldFound} G を手に入れた！`, "heal-log");
    } else {
        const heal = 20;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
        addLog(`澄んだ湧き水で　のどを潤した。HPが ${heal} 回復した！`, "heal-log");
    }
    nextTurn();
}

function performRest() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    const cost = 20;
    if (state.player.gold < cost) {
        addLog("ゴールドが足りません！ (休息には 20 G 必要)", "warning-log");
        state.isProcessing = false;
        return;
    }
    
    state.player.gold -= cost;
    const healAmount = 40;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
    addLog(`キャンプで　一晩やすんだ。HPが ${healAmount} 回復した。(所持金 -20 G)`, "heal-log");
    
    state.world.turn++;
    nextTurn();
}

function nextTurn() {
    simulateEcosystem();
    
    updateUI();
    if (state.world.turn === state.world.maxTurns && state.player.extinctKills === 0) {
        triggerEnding("harmony");
    }
    state.isProcessing = false;
}

// ==========================================
// 15. 戦闘システム
// ==========================================

function startBattle(enemyKey) {
    state.isProcessing = false;
    const template = enemyTemplates[enemyKey];
    state.battle.inBattle = true;
    
    const isUnlocked = state.library.includes(enemyKey);

    // 世界の腐敗度によるステータス倍率補正 (最大 2.0倍)
    const mult = 1 + (state.world.corruption / 100);
    const calculatedHp = Math.round(template.hp * mult);
    const calculatedAtk = Math.round(template.atk * mult);

    state.battle.currentEnemy = {
        key: enemyKey,
        name: template.name,
        hp: calculatedHp,
        maxHp: calculatedHp,
        atk: calculatedAtk,
        def: template.def,
        gold: template.gold,
        type: template.type,
        isGuild: template.isGuild || false,
        isHybrid: template.isHybrid || false,
        isForbidden: template.isForbidden || false,
        isKnown: isUnlocked 
    };

    elements.enemyName.innerText = isUnlocked ? template.name : "？？？？";
    elements.enemyHp.innerText = `HP: ${state.battle.currentEnemy.hp} / ${state.battle.currentEnemy.maxHp}`;
    
    elements.enemySprite.className = "";
    elements.enemySprite.classList.add("sprite-" + template.type);

    showCommandGroup("battle");

    const enemyDisplayName = isUnlocked ? state.battle.currentEnemy.name : "？？？？";
    const isCorruptedState = state.world.corruption >= 30;

    if (state.battle.currentEnemy.isGuild) {
        const quote = guildQuotes[template.type] || "「覚悟しろ！」";
        if (isCorruptedState) {
            addLog(`世界の腐敗により　怒り狂った　「${enemyDisplayName}」が　あらわれた！`, "miasma-log");
        } else {
            addLog(`「${enemyDisplayName}」が　あらわれた！`, "warning-log");
        }
        addLog(`${enemyDisplayName}: 「${quote}」`, "warning-log");
    } else if (state.battle.currentEnemy.isForbidden) {
        addLog(`禁忌の合成生物 「${enemyDisplayName}」が　あらわれた！`, "miasma-log");
    } else if (state.battle.currentEnemy.isHybrid) {
        addLog(`交配変異種 「${enemyDisplayName}」が　あらわれた！`, "warning-log");
    } else if (enemyKey === "apocalypse") {
        addLog(`世界終焉プログラム 「${state.battle.currentEnemy.name}」が　あらわれた！`, "warning-log");
    } else {
        if (isCorruptedState) {
            addLog(`瘴気を帯びて　凶暴化した　野生の 「${enemyDisplayName}」が　あらわれた！`, "miasma-log");
            addLog(`（世界の腐敗により　敵のHPと攻撃力が ${Math.round(state.world.corruption)}% 上昇している！）`, "miasma-log");
        } else {
            addLog(`野生の 「${enemyDisplayName}」が　あらわれた！`, "warning-log");
        }
    }
    
    updateUI();
}

function performAttack() {
    if (state.isProcessing) return;
    if (!state.battle.inBattle) return;
    state.isProcessing = true;

    const enemy = state.battle.currentEnemy;
    
    const playerAtk = calculatePlayerAtk();
    let dmgToEnemy = Math.max(1, playerAtk - enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmgToEnemy);
    
    triggerScreenShake();
    
    const enemyDisplayName = enemy.isKnown ? enemy.name : "？？？？";
    addLog(`プレイヤーのこうげき！　「${enemyDisplayName}」に　${dmgToEnemy}のダメージ！`, "battle-log");
    
    if (state.player.artifacts.includes("chaos_eye") && state.world.corruption > 0) {
        addLog(`【魔眼】混沌のちからが　追加ダメージをあたえる！ (+${state.world.corruption})`, "miasma-log");
    }

    elements.enemyHp.innerText = `HP: ${enemy.hp} / ${enemy.maxHp}`;

    if (enemy.hp <= 0) {
        handleEnemyDefeat();
    } else {
        enemyTurn();
    }
}

function performForbiddenItem() {
    if (state.isProcessing) return;
    if (!state.battle.inBattle) return;
    state.isProcessing = true;

    const enemy = state.battle.currentEnemy;
    
    state.world.corruption = Math.min(100, state.world.corruption + 5);
    
    const playerAtk = calculatePlayerAtk() * 3;
    let dmgToEnemy = Math.max(1, playerAtk - enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmgToEnemy);
    
    triggerScreenShake();
    const enemyDisplayName = enemy.isKnown ? enemy.name : "？？？？";
    addLog(`[禁忌の薬] プレイヤーの闘気が暴走！ 「${enemyDisplayName}」に　${dmgToEnemy}ダメージ！(腐敗度+5%)`, "miasma-log");
    elements.enemyHp.innerText = `HP: ${enemy.hp} / ${enemy.maxHp}`;

    if (enemy.hp <= 0) {
        handleEnemyDefeat();
    } else {
        enemyTurn();
    }
}

function enemyTurn() {
    const enemy = state.battle.currentEnemy;
    const playerDef = calculatePlayerDef();
    let dmgToPlayer = Math.max(1, enemy.atk - playerDef);
    
    state.player.hp = Math.max(0, state.player.hp - dmgToPlayer);
    const enemyDisplayName = enemy.isKnown ? enemy.name : "？？？？";
    addLog(`「${enemyDisplayName}」のこうげき！　プレイヤーは　${dmgToPlayer}のダメージをうけた！`, "damage-log");
    
    if (enemy.type === "desert_cactus") {
        const thornDmg = 5;
        state.player.hp = Math.max(1, state.player.hp - thornDmg);
        addLog(`[サボテンの針] 反射ダメージ！ 5 のダメージを受けた！`, "damage-log");
    }

    if (state.player.isMiasmaActive && state.player.artifacts.includes("poison_reflect")) {
        const reflectDmg = 10; 
        enemy.hp = Math.max(0, enemy.hp - reflectDmg);
        addLog(`【反射】毒の波動が　伝染！ 「${enemyDisplayName}」に　${reflectDmg}ダメージ！`, "miasma-log");
        elements.enemyHp.innerText = `HP: ${enemy.hp} / ${enemy.maxHp}`;
        
        if (enemy.hp <= 0) {
            setTimeout(() => {
                handleEnemyDefeat();
            }, 300);
            return;
        }
    }

    updateUI();

    if (state.player.hp <= 0) {
        handlePlayerDefeatRecovery();
    } else {
        state.isProcessing = false;
    }
}

function handlePlayerDefeatRecovery() {
    addLog("プレイヤーは　しんでしまった！", "warning-log");
    triggerScreenGlitch();
    
    const lostGold = Math.floor(state.player.gold / 2);
    state.player.gold -= lostGold;
    
    state.player.hp = Math.floor(state.player.maxHp * 0.5);
    
    addLog(`しかし　ふしぎなちからで　いきかえった！ HPが50%まで復元された。`, "heal-log");
    addLog(`ペナルティとして　ゴールドが半分になった。 (-${lostGold} G)`, "damage-log");

    endBattle();
}

function handleEnemyDefeat() {
    const enemy = state.battle.currentEnemy;
    
    unlockLibraryItem(enemy.key);

    addLog(`「${enemy.name}」を　たおした！`, "heal-log");
    addLog(`${enemy.gold}ゴールドを　てにいれた！`, "heal-log");
    
    state.player.gold += enemy.gold;
    
    if (enemy.isHybrid) {
        const unownedArts = Object.keys(ARTIFACT_DATABASE).filter(id => !state.player.artifacts.includes(id));
        if (unownedArts.length > 0) {
            const randomArt = unownedArts[Math.floor(Math.random() * unownedArts.length)];
            state.player.artifacts.push(randomArt);
            addLog(`✨【交配種ドロップ】 「${ARTIFACT_DATABASE[randomArt].name}」 を手に入れた！`, "heal-log");
        }
    }

    if (!enemy.isGuild && !enemy.isHybrid && enemy.type !== "mutant" && enemy.type !== "stone_spider" && enemy.type !== "jewel_slime") {
        let baseMapType = enemy.type;
        if (enemy.type === "desert_fishman" || enemy.type === "abyss_fishman") baseMapType = "fishman";
        if (enemy.type === "desert_goblin") baseMapType = "goblin";
        if (enemy.type === "mud_slime" || enemy.type === "shadow_slime" || enemy.type === "wood_golem") baseMapType = "slime";
        
        const species = state.ecosystem[baseMapType];
        if (species) {
            species.count = Math.max(0, species.count - 1);
            if (species.count === 0 && !species.extinct) {
                triggerNaturalExtinction(baseMapType);
            }
        }
    } else if (enemy.type === "mutant") {
        triggerEnding("apocalypse_slain");
        return;
    }

    endBattle();
}

function endBattle() {
    state.battle.inBattle = false;
    state.battle.currentEnemy = null;
    showCommandGroup("explore");
    nextTurn();
}

function performRun() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    if (state.battle.currentEnemy && (state.battle.currentEnemy.type === "mutant" || state.battle.currentEnemy.isGuild)) {
        addLog("この強敵から　にげることはできない！", "warning-log");
        state.isProcessing = false;
        return;
    }
    addLog("ゆうしゃは　にげだした！", "system-log");
    endBattle();
}

// ==========================================
// 16. 種族消去 (絶滅) メタ演出
// ==========================================

function openDeleteSystemModal() {
    if (!state.battle.inBattle) return;
    const enemy = state.battle.currentEnemy;
    
    if (enemy.isGuild) {
        triggerScreenGlitch();
        addLog("【システムエラー】人間は消去できません！", "warning-log");
        alert("ERROR: 0x80070005\nAccess is denied. Target object is not registerd in ECO_SYSTEM.");
        return;
    }
    if (enemy.type === "mutant") {
        addLog("【システムエラー】アポカリプスは消去できません！", "warning-log");
        return;
    }

    elements.deleteTargetName.innerText = `SPECIES::${enemy.type.toUpperCase()}`;
    elements.systemDeleteModal.classList.remove("hidden");
}

function executeSpeciesDeletion() {
    elements.systemDeleteModal.classList.add("hidden");
    const enemy = state.battle.currentEnemy;
    
    unlockLibraryItem(enemy.key);

    let type = enemy.type;
    if (enemy.type === "desert_fishman" || enemy.type === "abyss_fishman") type = "fishman";
    if (enemy.type === "desert_goblin") type = "goblin";
    if (enemy.type === "mud_slime" || enemy.type === "shadow_slime" || enemy.type === "wood_golem" || enemy.type === "desert_cactus" || enemy.type === "fossil_fish" || enemy.type === "abyss_demon") type = "slime";

    const species = state.ecosystem[type];

    addLog("システム: 物理さくじょコマンドを受理。書き換え中...", "warning-log");
    document.body.style.pointerEvents = "none";
    triggerScreenGlitch();

    setTimeout(() => {
        elements.miasmaOverlay.style.opacity = "0.95";
        addLog(">> データを物理フォーマットしています...", "warning-log");
        
        setTimeout(() => {
            if (species) {
                species.count = 0;
                species.extinct = true;
            }
            state.player.extinctKills++;
            state.world.corruption = Math.min(100, state.world.corruption + 25);
            state.player.atk += 30; 
            
            addLog(`種族 「${enemy.name}」 のデータを　消去した！`, "warning-log");
            addLog(`世界の腐敗度が 25% 上昇した！`, "miasma-log");
            addLog(`【背徳のバフ】ぜつめつの呪いが宿る！ 攻撃力+30！`, "heal-log");

            applyEnvironmentChange(type, false);

            document.body.style.pointerEvents = "all";
            elements.miasmaOverlay.style.opacity = "0";

            state.battle.inBattle = false;
            state.battle.currentEnemy = null;
            
            if (state.world.corruption >= 100) {
                triggerEnding("corruption_apocalypse");
            } else {
                showCommandGroup("explore");
                nextTurn();
            }
        }, 1200);
    }, 500);
}

function triggerNaturalExtinction(type) {
    const species = state.ecosystem[type];
    if (species) {
        species.extinct = true;
    }
    state.player.extinctKills++;
    state.world.corruption = Math.min(100, state.world.corruption + 15);
    state.player.atk += 15;
    
    const speciesName = species ? species.name : "未知の種族";
    addLog(`【警告】「${speciesName}」が　絶滅してしまった！`, "warning-log");
    addLog(`世界の腐敗度が 15% 上昇した！`, "miasma-log");
    addLog(`【背徳 of バフ】絶滅の余波により　攻撃力+15！`, "heal-log");

    applyEnvironmentChange(type, false);
    
    if (state.world.corruption >= 100) {
        triggerEnding("corruption_apocalypse");
    }
}

function applyEnvironmentChange(extinctType, silent = false) {
    if (extinctType === "slime") {
        state.world.fieldName = "灼熱の砂漠と化した森";
        state.world.bgClass = "desert-bg";
        state.world.envObjectClass = "env-object-desert";
        if (!silent) {
            addLog("【環境変化】スライムが滅び、緑が砂漠へと変わった！", "warning-log");
        }
    } 
    else if (extinctType === "fishman") {
        state.world.fieldName = "干上がった湖底の荒野";
        state.player.equip = "伝説の魔剣";
        state.player.atk += 40;
        
        unlockLibraryItem("equip_sword");

        if (!silent) {
            addLog("【環境変化】湖底から　『伝説の魔剣』が　発掘された！ (攻撃力+40)", "heal-log");
        }
    }
    else if (extinctType === "goblin") {
        state.player.atk += 25; 
        
        unlockLibraryItem("equip_magic");

        if (!silent) {
            addLog("【環境変化】ゴブリンの滅亡により　『禁忌魔法』が　解放された！ (攻撃力+25)", "heal-log");
        }
    }

    if (state.player.extinctKills === 3) {
        state.world.fieldName = "完全なる混沌の荒野";
        state.world.bgClass = "wasteland-bg";
        state.world.envObjectClass = "env-object-wasteland";
        if (!silent) {
            addLog("【世界崩壊】すべての生命が消え去り　暗黒の荒野となった！", "miasma-log");
        }
    }

    elements.fieldName.innerText = state.world.fieldName;
    elements.environmentVisual.className = "environment-visual " + state.world.bgClass;
    elements.envObject.className = state.world.envObjectClass;
}

// ==========================================
// 17. 【新】闇の商人探索遭遇＆売買メニュー
// ==========================================

function startMerchantTransaction() {
    state.isProcessing = false;
    showCommandGroup("merchant");
    elements.visualMerchant.classList.remove("hidden");
    
    addLog("＊　こんなところで　物好きなやつに　出会うとはな。<br>闇の商人が　あらわれた！", "warning-log");
    openMerchantShop();
}

function openMerchantShop() {
    // メインメニューの表示とサブメニューの非表示
    elements.merchantCommands.classList.remove("hidden");
    elements.merchantBuyList.classList.add("hidden");
    elements.merchantSellList.classList.add("hidden");
    
    addLog("闇の商人: 「へへへ... 良いものが　あるぜ。どうする？」", "warning-log");
}

function enterBuyMenu() {
    elements.merchantCommands.classList.add("hidden");
    elements.merchantBuyList.classList.remove("hidden");
    elements.merchantSellList.classList.add("hidden");
    
    addLog("闇の商人: 「何を買っていきたいんだ？」", "warning-log");
    
    // 購入ボタンの有効・無効判定
    elements.btnBuyGlasscannon.disabled = (state.player.gold < 100) || state.player.artifacts.includes("glass_cannon");
    elements.btnBuyMiasma.disabled = (state.player.gold < 150) || state.player.isMiasmaActive;
    elements.btnBuyPoisonReflect.disabled = (state.player.gold < 120) || state.player.artifacts.includes("poison_reflect");
    elements.btnBuyLowhpPower.disabled = (state.player.gold < 130) || state.player.artifacts.includes("lowhp_power");
    elements.btnBuyHarmonyCrest.disabled = (state.player.gold < 90) || state.player.artifacts.includes("harmony_crest");
    elements.btnBuySeedLife.disabled = (state.player.gold < 80) || state.player.artifacts.includes("seed_of_life");
    elements.btnBuyChaosEye.disabled = (state.player.gold < 140) || state.player.artifacts.includes("chaos_eye");
}

function enterSellMenu() {
    elements.merchantCommands.classList.add("hidden");
    elements.merchantBuyList.classList.add("hidden");
    elements.merchantSellList.classList.remove("hidden");
    
    addLog("闇の商人: 「どれを買い取ってほしいんだ？」", "warning-log");
    renderMerchantSellList();
}

function renderMerchantSellList() {
    elements.merchantSellButtons.innerHTML = "";
    
    if (state.player.artifacts.length === 0) {
        elements.merchantSellButtons.innerHTML = '<p class="no-items" style="color:var(--text-muted);">売却できるどうぐがありません</p>';
        return;
    }
    
    state.player.artifacts.forEach(artId => {
        const item = ARTIFACT_DATABASE[artId];
        const btn = document.createElement("button");
        btn.className = "btn btn-shop";
        btn.innerHTML = `${item.name}を売る <span class="shop-desc">【+${item.sellPrice}G】</span>`;
        btn.addEventListener("click", () => sellArtifact(artId, item.sellPrice));
        elements.merchantSellButtons.appendChild(btn);
    });
}

function buyArtifact(id, cost) {
    if (state.isProcessing) return;
    state.isProcessing = true;

    if (state.player.gold < cost || state.player.artifacts.includes(id)) {
        state.isProcessing = false;
        return;
    }
    
    state.player.gold -= cost;
    state.player.artifacts.push(id);
    
    // 特殊バフの即時付与
    if (id === "glass_cannon") {
        state.player.atk += 50;
        state.player.def = Math.max(0, state.player.def - 20);
    } 
    else if (id === "miasma_veil") {
        state.player.isMiasmaActive = true;
    }
    
    addLog(`「${ARTIFACT_DATABASE[id].name}」を　買った！`, "warning-log");
    
    unlockLibraryItem(id);
    updateInventoryUI();
    enterBuyMenu(); // 購入後メニュー再描画
    updateUI();
    state.isProcessing = false;
}

function sellArtifact(id, price) {
    if (state.isProcessing) return;
    state.isProcessing = true;

    const index = state.player.artifacts.indexOf(id);
    if (index === -1) {
        state.isProcessing = false;
        return;
    }
    
    state.player.artifacts.splice(index, 1);
    state.player.gold += price;
    
    // 特殊バフの剥奪
    if (id === "glass_cannon") {
        state.player.atk = Math.max(state.player.baseAtk, state.player.atk - 50);
        state.player.def += 20;
    } 
    else if (id === "miasma_veil") {
        state.player.isMiasmaActive = false;
    }
    
    addLog(`「${ARTIFACT_DATABASE[id].name}」を　${price}Gで　売却した！`, "warning-log");
    
    updateInventoryUI();
    enterSellMenu(); // 売却後リスト再描画
    updateUI();
    state.isProcessing = false;
}

function endMerchantTransaction() {
    addLog("闇の商人: 「また会おうぜ。生き延びてたらな。」", "system-log");
    elements.visualMerchant.classList.add("hidden");
    showCommandGroup("explore");
    nextTurn(); 
}

// ==========================================
// 18. ゲーム終了制御
// ==========================================

function triggerEnding(type) {
    saveLegacyData();

    if (type === "harmony") {
        addLog("🎉【調和達成】絶滅を出さずに　調和を守り抜いた！", "heal-log");
        addLog("ボーナスとして 200 G を手に入れた！　さらに旅はつづく。", "heal-log");
        state.player.gold += 200;
        state.world.maxTurns = Infinity; 
    } 
    else if (type === "corruption_apocalypse") {
        addLog("☠️【終焉の警告】世界の腐敗度が100%になり　瘴気が満ちた！", "miasma-log");
        addLog("アポカリプスが　フィールドを徘徊しはじめた！", "warning-log");
    } 
    else if (type === "apocalypse_slain") {
        addLog("👑【覇王の証明】アポカリプスの撃破に成功した！", "heal-log");
        addLog("あなたは滅びた世界の支配者となった！", "heal-log");
        addLog("（ボーナスとして、商人の商品がすべて無料になります）", "heal-log");
        state.player.gold += 9999;
    }

    updateUI();
}

// ==========================================
// 19. イベント登録
// ==========================================

elements.mobileTabGame.addEventListener("click", () => switchMobileTab("game"));
elements.mobileTabStatus.addEventListener("click", () => switchMobileTab("status"));
elements.mobileTabEcosystem.addEventListener("click", () => switchMobileTab("ecosystem"));

elements.btnExplore.addEventListener("click", performExplore);
elements.btnRest.addEventListener("click", performRest);
elements.btnEcoMenu.addEventListener("click", openEcoMenu);
elements.btnLeaveEco.addEventListener("click", () => {
    showCommandGroup("explore");
});

elements.btnReleaseSlime.addEventListener("click", () => executeRelease("slime"));
elements.btnReleaseFishman.addEventListener("click", () => executeRelease("fishman"));
elements.btnReleaseGoblin.addEventListener("click", () => executeRelease("goblin"));
elements.btnOpenBreeding.addEventListener("click", openBreedingModal);

elements.btnOpenLibrary.addEventListener("click", openLibraryModal);
elements.btnCloseLibrary.addEventListener("click", () => {
    elements.libraryModal.classList.add("hidden");
});
elements.btnCloseLibraryModal.addEventListener("click", () => {
    elements.libraryModal.classList.add("hidden");
});

elements.tabLibraryMonsters.addEventListener("click", () => {
    currentLibraryTab = "monsters";
    renderLibraryList();
});
elements.tabLibraryItems.addEventListener("click", () => {
    currentLibraryTab = "items";
    renderLibraryList();
});

elements.btnAttack.addEventListener("click", performAttack);
elements.btnCapture.addEventListener("click", performCapture);
elements.btnForbiddenItem.addEventListener("click", performForbiddenItem);
elements.btnDeleteSpecies.addEventListener("click", openDeleteSystemModal);
elements.btnRun.addEventListener("click", performRun);

// 闇の商人メニュー制御
elements.btnMerchantBuyMenu.addEventListener("click", enterBuyMenu);
elements.btnMerchantSellMenu.addEventListener("click", enterSellMenu);
elements.btnMerchantBuyBack.addEventListener("click", openMerchantShop);
elements.btnMerchantSellBack.addEventListener("click", openMerchantShop);
elements.btnLeaveMerchant.addEventListener("click", endMerchantTransaction);

// アーティファクト購入処理
elements.btnBuyGlasscannon.addEventListener("click", () => buyArtifact("glass_cannon", 100));
elements.btnBuyMiasma.addEventListener("click", () => buyArtifact("miasma_veil", 150));
elements.btnBuyPoisonReflect.addEventListener("click", () => buyArtifact("poison_reflect", 120));
elements.btnBuyLowhpPower.addEventListener("click", () => buyArtifact("lowhp_power", 130));
elements.btnBuyHarmonyCrest.addEventListener("click", () => buyArtifact("harmony_crest", 90));
elements.btnBuySeedLife.addEventListener("click", () => buyArtifact("seed_of_life", 80));
elements.btnBuyChaosEye.addEventListener("click", () => buyArtifact("chaos_eye", 140));

elements.btnConfirmDelete.addEventListener("click", executeSpeciesDeletion);
elements.btnCancelDelete.addEventListener("click", () => {
    elements.systemDeleteModal.classList.add("hidden");
    addLog("システム: データ削除命令がキャンセルされました。", "system-log");
});
elements.btnCloseDeleteModal.addEventListener("click", () => {
    elements.systemDeleteModal.classList.add("hidden");
});

elements.btnExecuteBreed.addEventListener("click", executeHybridBreeding);
elements.btnCancelBreed.addEventListener("click", () => {
    elements.breedingModal.classList.add("hidden");
});
elements.btnCloseBreedingModal.addEventListener("click", () => {
    elements.breedingModal.classList.add("hidden");
});

function saveGameData() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    const saveData = {
        player: state.player,
        world: state.world,
        ecosystem: state.ecosystem
    };
    localStorage.setItem('eco_breaker_save_data', JSON.stringify(saveData));
    elements.btnSidebarLoad.disabled = false;
    addLog("＊　おめでとう！　ぼうけんのしょに　しっかりと　きろくされた！", "heal-log");
    state.isProcessing = false;
}

function loadGameData() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    const raw = localStorage.getItem('eco_breaker_save_data');
    if (!raw) {
        addLog("＊　ぼうけんのしょが　みつかりません！", "warning-log");
        state.isProcessing = false;
        return;
    }
    try {
        const saveData = JSON.parse(raw);
        state.player = saveData.player;
        state.world = saveData.world;
        if (saveData.ecosystem) {
            state.ecosystem = saveData.ecosystem;
        }

        // フィールド環境ビジュアルの再構築
        elements.fieldName.innerText = state.world.fieldName;
        elements.environmentVisual.className = "environment-visual " + state.world.bgClass;
        elements.envObject.className = state.world.envObjectClass;
        
        // 各種UI状態の再同期
        updateCapturedUI();
        updateUI();
        
        // 開いているモーダルを強制クローズ
        elements.systemDeleteModal.classList.add("hidden");
        elements.breedingModal.classList.add("hidden");
        elements.libraryModal.classList.add("hidden");
        
        // 強制的に探索画面に戻して安全を確保
        state.battle.inBattle = false;
        state.battle.currentEnemy = null;
        showCommandGroup("explore");
        
        addLog("＊　ぼうけんのしょから　きおくを　よみがえらせた！", "heal-log");
    } catch (e) {
        addLog("＊　ぼうけんのしょの　ロードに　しっぱいした！", "warning-log");
    }
    state.isProcessing = false;
}

elements.btnSidebarSave.addEventListener("click", saveGameData);
elements.btnSidebarLoad.addEventListener("click", loadGameData);

elements.btnSidebarRestart.addEventListener("click", initGame);
elements.btnSidebarHardReset.addEventListener("click", hardResetLegacy);

elements.btnRestart.addEventListener("click", initGame);
elements.btnHardReset.addEventListener("click", hardResetLegacy);

window.onload = () => {
    initGame();
};
