const fs = require('fs')

const convertGuild = (data) => {
    try {
        let guild = (({ profile, member, recentTerritoryWarResult }) => ({ profile, member, recentTerritoryWarResult }))(data.guild)
        const allowed = ['playerId', 'playerName', 'galacticPower']
        guild.member = guild.member.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return { guild }
    } catch (error) {
        console.log("Fehler beim konvertieren der Guilddaten" + error.message)
    }
}
const convertPlayer = (data) => {
    try {
        const allowed = ["name", "rosterUnit", "datacron"]
        let player = data.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        const allowed2 = ["baseId", "currentTier", "currentRarity", "currentLevel", "legend", "nameKey", "relic", "definitionId", "skill"]
        for(let i = 0; i < player.length; i++){
            player[i].rosterUnit = player[i].rosterUnit.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed2.includes(key))))
        }
        return player
    } catch (error) {
        console.log("Fehler beim konvertieren der Playerdaten", error.message)   
    }
}
const convertData = (data) => {
    try {
        const allowed = ["baseId", "id", "legend", "descKey", "nameKey", "unitPrefab", "categoryId"]
        data.units = data.units.map(obj=> Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return data
    } catch (error) {
        console.log("Fehler beim konvertieren der Daten", error.message)
    }
}
const convertSkillData = (data) => {
    try {
        let skills = (({ skill }) => ({ skill }))(data)
        return skills
    } catch (error) {
        console.log("Fehler beim konvertieren der Daten", error.message)
    }
}

const filterUnitNames = (text) => {
    try {
        const entries = [];
            const regex = /(UNIT_[A-Z0-9_]+_NAME(?:_V\d+)?)\|(.*)/g;

            let match;
            while ((match = regex.exec(text)) !== null) {
            const [, key, value] = match;

            entries.push({
                nameKey: key.trim(),
                name: value.trim()
            });
            }
            let filtered = entries.filter(e => !e.nameKey.startsWith("UNIT_WIN_") && !e.nameKey.startsWith("UNIT_KILL_") && !e.nameKey.startsWith("UNIT_BUNDLE_"));
            for(let i = 0; i < filtered.length; i++){
                if(filtered[i].nameKey === "UNIT_SLAVE1_NAME_V2"){
                    filtered[i].nameKey = "UNIT_SLAVE1_NAMEV2"
                    break;
                }
            }
            return filtered
    } catch (error) {
        console.log("Fehler beim filtern der Unitnames", error.message)
    }
}
function filterTerritoryNames(text) {
  try {
    const entries = []
    const regex = /(TERRITORY_[A-Z0-9_]+)\|(.*)/g

    let match
    while ((match = regex.exec(text)) !== null) {
      const [, key, value] = match

      entries.push({
        nameKey: key.trim(),
        name: value.trim()
      })
    }

    return entries
  } catch (error) {
    console.log("Fehler beim Filtern der Territory-Namen", error.message)
    return []
  }
}

const connectUnits = (player) => {
    try {    
        const unitsMap2 = new Map()
        for (const member of player) {
            for (const unit of member.rosterUnit) {
                const unitName = unit.name;

                if (!unitsMap2.has(unitName)) {
                    unitsMap2.set(unitName, {
                        name: unitName,
                        members: []
                    });
                }

                unitsMap2.get(unitName).members.push({
                    memberName: member.name,
                    ...unit   
                });
            }
        }
        const result = Array.from(unitsMap2.values());
        return result
    } catch (error) {
        console.log("Fehler beim connecten der Units", error.message)
    }
}
const connectData = (player, data, text) =>
{
    try {
        const unitsMap = new Map(data.units.map(u => [u.id, u]));
        for(let i = 0; i < player.length; i++){
            player[i].rosterUnit = player[i].rosterUnit.map(r => {
                const unit = unitsMap.get(r.definitionId) || {};
                return {
                    ...r,
                    ...unit
                }
            });
        }

        const namesMap = new Map(text.map(n => [n.nameKey, n.name]));
            for(let j = 0; j < player.length; j++){
            player[j].rosterUnit = player[j].rosterUnit.map(m => ({
            ...m,
            name: namesMap.get(m.nameKey) || null
            }));
        }

        return player
    } catch (error) {
        console.log("Fehler beim connectern der Daten", error.message)
    }
}
const filterGuildNames = (guilds) => {
    const allowed = ["id", "name"]
    const result = guilds.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
    return result
}

function expandSkills(allRosterData, skillDefinitions) {
    // Skill Map: O(1) Zugriff
    const skillMap = new Map(skillDefinitions.map(s => [s.id, s]));
  
    for (const player of allRosterData) {
  
      // rosterUnit könnte riesig sein → also direkt bearbeiten
      for (const unit of player.rosterUnit) {
        
        for (const skill of unit.skill) {
          const def = skillMap.get(skill.id);
          if (!def) continue;
          skill.nameKey = def.nameKey;
          skill.isZeta = def.tier[skill.tier].isZetaTier;
          skill.isOmicron = def.tier[skill.tier].isOmicronTier;
          skill.omicronArea = def.omicronMode;
        }
      }
    }
  
    return allRosterData;
}

function expandSZData(strikeZoneDefinition, tables){
    const rewardTableMap = new Map(
    tables.map(table => [table.id, table.row])
  )

  return strikeZoneDefinition.map(strikeZone => {
    const rewardRow = rewardTableMap.get(
      strikeZone.encounterRewardTableId
    )

    return {
      ...strikeZone,
      rewardTable: rewardRow ?? null
    }
  })
}

// Planet Object Normalization

function normalizeReconZones(reconZones) {
  return reconZones.map(z => ({
    id: z.zoneDefinition.zoneId,
    nameKey: z.zoneDefinition.nameKey,
    linkedConflictId: z.zoneDefinition.linkedConflictId,
    platoonDefinition: z.platoonDefinition,
    minRelicTier: z.unitRelicTier-2 ,
    maxUnitCountPerPlayer: z.zoneDefinition.maxUnitCountPerPlayer
  }))
}

function normalizeStrikeZones(strikeZones) {
  return strikeZones.map(z => ({
    id: z.zoneDefinition.zoneId,
    nameKey: z.zoneDefinition.nameKey,
    linkedConflictId: z.zoneDefinition.linkedConflictId,

    combatType: z.combatType, // 1 = ground, 2 = fleet
    encounterRewardTableId: z.encounterRewardTableId,

    rewards: z.rewardTable.map(r => ({
      phase: Number(r.key),
      galacticScore: Number(r.value.split(':')[1])
    }))
  }))
}

function normalizeConflictZones(conflictZones) {
  return conflictZones.map(z => {
    const m = z.zoneDefinition.zoneId.match(/phase(\d+)_/)
    const phase = m ? Number(m[1]) : null

    return {
      id: z.zoneDefinition.zoneId,
      nameKey: z.zoneDefinition.nameKey,
      phase,
      alignment: z.forceAlignment, // 1 LS, 2 N, 3 DS
      isBonus: !!z.isBonus,

      unlocksFrom: z.zoneDefinition.unlockRequirement
        ? z.zoneDefinition.unlockRequirement.requirementItem
            .filter(r => r.type === 61)
            .map(r => r.id)
        : [],

      starThresholds: z.victoryPointRewards
        .map(r => Number(r.galacticScoreRequirement)),

      strikeZones: [],
      reconZones: []
    }
  })
}

function buildPlanets(conflictZoneDefinition, strikeZoneDefinition, reconZoneDefinition) {
  const planets = normalizeConflictZones(conflictZoneDefinition)

  const planetById = Object.fromEntries(
    planets.map(p => [p.id, p])
  )

  const strikes = normalizeStrikeZones(strikeZoneDefinition)
  for (const sz of strikes) {
    const planet = planetById[sz.linkedConflictId]
    if (planet) {
      planet.strikeZones.push(sz)
    }
  }

  const recons = normalizeReconZones(reconZoneDefinition)
  for (const rz of recons) {
    const planet = planetById[rz.linkedConflictId]
    if (planet) {
      planet.reconZones.push(rz)
    }
  }

  return planets
}

function buildLocalizationMap(entries) {
  return Object.fromEntries(
    entries.map(e => [e.nameKey, e.name])
  )
}

function applyPlanetNames(planets, localizationMap) {
  for (const planet of planets) {
    planet.name =
      localizationMap[planet.nameKey] ??
      planet.nameKey // fallback für Debug

    // Optional: StrikeZones ebenfalls benennen
    for (const strike of planet.strikeZones) {
      strike.name =
        localizationMap[strike.nameKey] ??
        strike.nameKey
    }

    // Optional: ReconZones
    for (const recon of planet.reconZones) {
      recon.name =
        localizationMap[recon.nameKey] ??
        recon.nameKey
    }
  }

  return planets
}

function attachOpUnitsToPlanets(planets, opData) {
  // Key: "<planetNameLower>::<platoonId>" -> units[]
  const keyOf = (planetName, platoonId) =>
    `${String(planetName).trim().toLowerCase()}::${String(platoonId).trim()}`

  const platoonUnitMap = new Map(
    opData.map(entry => [keyOf(entry.name, entry.id), entry.units])
  )

  return planets.map(planet => {
    if (!planet?.name || !planet.reconZones?.length) return planet

    const planetName = planet.name

    const reconZones = planet.reconZones.map(rz => {
      const platoonArr = rz.platoonDefinition
      const platoonDefinition = platoonArr.map(platoon => {
        const units = platoonUnitMap.get(keyOf(planetName, platoon.id))
        if (!units) return platoon

        return {
          ...platoon,
          units // 👈 hier rein
        }
      })

      return {
        ...rz,
        platoonDefinition
      }
    })

    return {
      ...planet,
      reconZones
    }
  })
}

// Op Analysis


function isShipMember(member) {
  // robust genug für swgoh-data: ships haben i.d.R. "ship" im prefab 
  return member.categoryId.includes("territory_ship_platoon") || member.categoryId.includes("shipclass_capitalship") || member.unitPrefab.includes('ship')
}
function effectiveRelicTier(member) {
  // chars: relic.currentTier - 2
  const r = member?.relic?.currentTier
  if (typeof r !== 'number') return 0
  return r - 2
}
function isEligible(member, minRelicTier) {
  if (!member) return false
  if (isShipMember(member)) {
    // ships müssen Tier 7 sein
    return member.currentRarity === 7
  }
  // chars: minRelicTier <= relic.currentTier - 2
  return effectiveRelicTier(member) >= minRelicTier
}
function analyzeMPlatoon(platoon, rosterPool) {
  const minRelicTier = platoon.minRelicTier ?? 0
  const missingUnits = []
  let isBlocked = false
  let usedUnits = []

  for (const req of platoon.units || []) {
    const pool = rosterPool.get(req.name) || []

    // geeignete Members filtern
    const eligible = pool.filter(m => isEligible(m, minRelicTier))

    if (eligible.length === 0) {
      isBlocked = true
      missingUnits.push({
        name: req.name,
        required: req.amount,
        available: 0,
        missing: req.amount,
        minRelicTier
      })
      continue
    }

    const usedCount = Math.min(eligible.length, req.amount)

    // ❗️ HIER PASSIERT DER VERBRAUCH
    const consumed = eligible.slice(0, usedCount)

    // aus Pool entfernen
    rosterPool.set(
      req.name,
      pool.filter(m => !consumed.includes(m))
    )

    usedUnits.push(...consumed)

    if (usedCount < req.amount) {
      missingUnits.push({
        name: req.name,
        required: req.amount,
        available: usedCount,
        missing: req.amount - usedCount,
        minRelicTier
      })
    }
  }

  let status = "COMPLETE"
  if (missingUnits.length > 0) status = "PARTIAL"
  if (isBlocked) status = "BLOCKED"

  return {
    id: platoon.id,
    minRelicTier,
    status,
    missingUnits,
    usedUnits: usedUnits.length
  }
}
function analyzeMPlanetOps(planet, baseRosterPool) {
  const rosterPool = cloneRosterPool(baseRosterPool)

  const platoonAnalyses = []
  let complete = 0, partial = 0, blocked = 0

  for (const rz of planet.reconZones || []) {
    const minRelicTier = rz.minRelicTier ?? 0

    for (const p of rz.platoonDefinition || []) {
      const platoon = { ...p, minRelicTier }
      const result = analyzeMPlatoon(platoon, rosterPool)
      platoonAnalyses.push(result)

      if (result.status === "COMPLETE") complete++
      if (result.status === "PARTIAL") partial++
      if (result.status === "BLOCKED") blocked++
    }
  }

  return {
    planet: planet.name,
    phase: planet.phase,
    summary: { complete, partial, blocked },
    platoons: platoonAnalyses
  }
}
function analyzeCombinedOps(selectedPlanets, baseRosterPool) {
  const rosterPool = cloneRosterPool(baseRosterPool)
  const missing = []
  let blocked = false

  for (const planet of selectedPlanets) {
    for (const rz of planet.reconZones || []) {
      const minRelicTier = rz.minRelicTier ?? 0

      for (const p of rz.platoonDefinition || []) {
        const result = analyzeMPlatoon(
          { ...p, minRelicTier },
          rosterPool
        )

        if (result.status !== "COMPLETE") {
          blocked ||= result.status === "BLOCKED"
          missing.push(...result.missingUnits)
        }
      }
    }
  }
  const mergedMissing = mergeMissingUnits(missing)

  mergedMissing.sort((a, b) => {
  if (a.status !== b.status) {
    return a.status === "BLOCKED" ? -1 : 1
  }
  if (a.minRelicTier !== b.minRelicTier) {
    return b.minRelicTier - a.minRelicTier
  }
  return b.missing - a.missing
})


  const status =
    missing.length === 0
      ? "COMPLETE"
      : blocked
        ? "BLOCKED"
        : "PARTIAL"

  return { status, mergedMissing }
}
function mergeMissingUnits(missingUnits) {
  const map = new Map()

  for (const u of missingUnits) {
    const key = `${u.name}__${u.minRelicTier}`

    if (!map.has(key)) {
      map.set(key, {
        name: u.name,
        minRelicTier: u.minRelicTier,
        required: 0,
        available: 0,
        missing: 0
      })
    }

    const entry = map.get(key)
    entry.required += u.required
    entry.available += u.available
    entry.missing += u.missing
  }

  return [...map.values()].map(e => ({
    ...e,
    status:
      e.available === 0
        ? "BLOCKED"
        : e.available < e.required
          ? "PARTIAL"
          : "COMPLETE"
  }))
}
function analyzeOpsForSelectedPlanets(planets, unitsArray) {
  const baseRosterPool = buildRosterPool(unitsArray)

  const perPlanet = {}
  for (const p of planets) {
    perPlanet[p.name] = analyzeMPlanetOps(p, baseRosterPool)
  }

  const combined = analyzeCombinedOps(planets, baseRosterPool)

  return {
    perPlanet,
    combined
  }
}





/**
 * Berechnet die optimale Sternverteilung für eine Phase.
 * @param {number} guildGP - Die verfügbare GM für das Deployment (nach Abzug der Ops).
 * @param {Array} currentPlanets - Array der Planeten-Objekte mit 'starThresholds'.
 */
function solveRotePhase(guildGP, currentPlanets) {
    let bestStrategy = {
        totalStars: -1,
        usedGP: 0,
        plan: [],
        score: -1
    };

    // Sicherstellen, dass wir auf die Array-Indizes zugreifen können (auch wenn < 3 Planeten übergeben werden)
    const p1 = currentPlanets[0];
    const p2 = currentPlanets[1];
    const p3 = currentPlanets[2];

    // Hilfsfunktion: Kosten für n Sterne auf einem Planeten holen
    const getCost = (planet, stars) => {
        if (!planet || stars === 0) return 0;
        return planet.starThresholds[stars - 1];
    };

    // Wir iterieren durch alle Kombinationen (0-3 Sterne) für bis zu 3 Planeten
    for (let s1 = 0; s1 <= 3; s1++) {
        if (!p1 && s1 > 0) break; // Abbruch, falls Planet 1 nicht existiert

        for (let s2 = 0; s2 <= 3; s2++) {
            if (!p2 && s2 > 0) break; // Abbruch, falls Planet 2 nicht existiert

            for (let s3 = 0; s3 <= 3; s3++) {
                if (!p3 && s3 > 0) break; // Abbruch, falls Planet 3 nicht existiert

                // 1. Gesamtkosten berechnen
                let cost = 0;
                if (p1) cost += getCost(p1, s1);
                if (p2) cost += getCost(p2, s2);
                if (p3) cost += getCost(p3, s3);

                // 2. Ist das machbar?
                if (cost <= guildGP) {
                    let leftover = guildGP - cost;
                    let currentStars = s1 + s2 + s3;

                    // 3. Score berechnen
                    // Basis: Anzahl Sterne * 1000
                    // Bonus: +50 für jeden abgeschlossenen Planeten (3 Sterne)
                    let score = currentStars * 1000;
                    if (s1 === 3) score += 50;
                    if (s2 === 3) score += 50;
                    if (s3 === 3) score += 50;

                    // Wenn besser als bisherige beste Lösung -> Speichern
                    if (score > bestStrategy.score) {
                        
                        // Plan-Objekt zusammenbauen
                        let plan = [];
                        if (p1) plan.push(createPlanetResult(p1, s1));
                        if (p2) plan.push(createPlanetResult(p2, s2));
                        if (p3) plan.push(createPlanetResult(p3, s3));

                        bestStrategy = {
                            totalStars: currentStars,
                            usedGP: cost,
                            leftoverGP: leftover,
                            score: score,
                            plan: plan
                        };
                    }
                }
            }
        }
    }

    // Rest-GM verteilen (Pre-loading Logic)
    distributeRemainingGP(bestStrategy);

    return bestStrategy;
}

/**
 * Hilfsfunktion zum Erstellen des Ergebnis-Objekts für einen Planeten
 */
function createPlanetResult(planet, stars) {
    return {
        name: planet.name,
        targetStars: stars,
        cost: stars > 0 ? planet.starThresholds[stars - 1] : 0,
        thresholds: planet.starThresholds,
        extraDeployment: 0,
        isPreload: false
    };
}

/**
 * Verteilt die Rest-GM intelligent auf 0-Sterne-Planeten.
 */
function distributeRemainingGP(strategy) {
    let remaining = strategy.leftoverGP;
    if (remaining <= 0) return;

    // Wir suchen NUR nach Planeten, die aktuell 0 Sterne im Plan haben.
    // Denn dort bleiben die Punkte für die nächste Phase erhalten (Pre-load).
    // Bei Planeten mit 1 oder 2 Sternen würden die Punkte verfallen (Reset nach Sternerhalt).
    let preloadCandidates = strategy.plan.filter(p => p.targetStars === 0);

    if (preloadCandidates.length > 0) {
        // Wir nehmen den Planeten, der am wenigsten für den 1. Stern braucht (effizientester Start für nächste Phase)
        // Sortieren nach dem 1. Threshold
        preloadCandidates.sort((a, b) => a.thresholds[0] - b.thresholds[0]);

        // Den besten Kandidaten auswählen
        let bestTarget = preloadCandidates[0];

        // Alles draufpacken
        bestTarget.extraDeployment = remaining;
        bestTarget.isPreload = true;
        
        // Strategie-Objekt aktualisieren (alles verbraucht)
        strategy.leftoverGP = 0; 
    }
}
/**
 * Versucht, die Anforderungen eines Platoons zu erfüllen.
 * Entfernt genutzte Einheiten aus dem rosterPool und gibt sie zurück.
 */
function consumeUnitsForPlatoon(platoon, minRelicTier, rosterPool) {
    const usedUnitsInThisPlatoon = [];

    // Durchlaufe alle Anforderungen im Platoon (z.B. 2x Jedi Knight Luke, 1x C-3PO)
    for (const req of platoon.units || []) {
        // Hole alle verfügbaren Einheiten dieses Typs aus dem Pool
        const availableUnits = rosterPool.get(req.name) || [];

        // 1. Filter: Wer erfüllt die Bedingungen (Sterne/Relic)?
        // (Nutzt deine isEligible Funktion von vorhin)
        const eligibleCandidates = availableUnits.filter(u => isEligible(u, minRelicTier));

        // 2. Sortierung: "Billigste" Einheiten zuerst!
        // Wir wollen für OPs so wenig GP wie möglich verschwenden.
        eligibleCandidates.sort((a, b) => getUnitGP(a) - getUnitGP(b));

        // 3. Menge bestimmen
        const amountNeeded = req.amount;
        const amountToTake = Math.min(eligibleCandidates.length, amountNeeded);

        if (amountToTake > 0) {
            // Einheiten auswählen
            const unitsToConsume = eligibleCandidates.slice(0, amountToTake);
            
            // Zur Liste der verbrauchten hinzufügen
            usedUnitsInThisPlatoon.push(...unitsToConsume);

            // 4. WICHTIG: Aus dem globalen Pool für diese Phase entfernen
            // Wir aktualisieren den Eintrag in der Map
            const remainingUnits = availableUnits.filter(u => !unitsToConsume.includes(u));
            rosterPool.set(req.name, remainingUnits);
        }
    }

    return usedUnitsInThisPlatoon;
}
/**
 * Prüft, ob ein Platoon vollständig gefüllt wurde.
 * Wird benötigt, um zu entscheiden, ob es Punkte (TP) gibt.
 */
function isPlatoonComplete(platoon, usedUnits) {
    // Summe der benötigten Einheiten laut Platoon-Definition
    const totalRequired = platoon.units.reduce((sum, unitReq) => sum + unitReq.amount, 0);
    
    // Summe der tatsächlich zugewiesenen Einheiten
    const totalFilled = usedUnits.length;

    return totalFilled >= totalRequired;
}
function cloneRosterPool(pool) {
  if (!pool) {
      console.error("Fehler: cloneRosterPool wurde mit 'undefined' aufgerufen.");
      return new Map();
  }
  const clone = new Map();
  // .entries() existiert nur auf Maps. Wenn pool ein Array ist, muss es anders behandelt werden.
  // Wir gehen hier sicher, dass es eine Map ist.
  if (typeof pool.entries === 'function') {
      for (const [k, v] of pool.entries()) {
        clone.set(k, [...v]);
      }
  }
  return clone;
}
function buildRosterPool(unitsArray) {
  const map = new Map()

  for (const u of unitsArray || []) {
    map.set(u.name, [...(u.members || [])])
  }

  return map
}
// Hilfsfunktion: GP einer Unit holen (passe das Feld an deine Daten an)
function getUnitGP(member) {
    return member.galacticPower || member.gp || 0; 
}
// Deine Funktion erweitert um GP-Berechnung und Score
function processPlatoonAndCalculateCost(platoon, rosterPool) {
    const minRelicTier = platoon.minRelicTier ?? 0;
    let usedGP = 0;
    let filledUnitsCount = 0;
    const totalRequired = platoon.units.reduce((sum, u) => sum + u.amount, 0);

    // Wir klonen das Platoon-Objekt nicht, wir verändern den Pool direkt (Call by Reference ist hier gewollt für die Simulation)
    
    for (const req of platoon.units || []) {
        const pool = rosterPool.get(req.name) || [];
        
        // Filter: Geeignet UND noch nicht verbraucht (Implizit, da wir sie aus dem Pool entfernen)
        const eligible = pool.filter(m => isEligible(m, minRelicTier));
        
        // Gieriger Ansatz: Nimm die "billigsten" Units, die die Anforderung erfüllen, 
        // um hohe GP für Deployment zu sparen? 
        // ODER nimm einfach die ersten. Für Simulation sortieren wir nach GP aufsteigend.
        eligible.sort((a, b) => getUnitGP(a) - getUnitGP(b));

        const need = req.amount;
        const take = Math.min(eligible.length, need);
        
        if (take > 0) {
            const consumed = eligible.slice(0, take);
            filledUnitsCount += take;

            // GP addieren und Units aus Pool entfernen
            consumed.forEach(u => usedGP += getUnitGP(u));

            // Pool update
            rosterPool.set(req.name, pool.filter(m => !consumed.includes(m)));
        }
    }

    // Status prüfen
    const isComplete = filledUnitsCount === totalRequired;
    
    // Punkte berechnen (TP) - Annahme: Platoon hat 'reward.value'
    let gainedTP = 0;
    if (isComplete && platoon.reward && platoon.reward.value) {
        gainedTP = parseInt(platoon.reward.value, 10);
    }

    return {
        id: platoon.id,
        usedGP: usedGP,
        gainedTP: gainedTP,
        isComplete: isComplete
    };
}
/**
 * Führt alle Ops für einen Planeten aus und gibt Kosten/Nutzen zurück.
 */
function processPlanetOperations(planet, rosterPool) {
    let totalUsedGP = 0;
    let totalGainedTP = 0;
    
    // Durch alle ReconZones (Ops) iterieren
    for (const rz of planet.reconZones || []) {
        const minRelicTier = rz.minRelicTier ?? 0;
        
        for (const p of rz.platoonDefinition || []) {
            const platoon = { ...p, minRelicTier };
            
            // Hier verändern wir den rosterPool direkt!
            const result = processPlatoonAndCalculateCost(platoon, rosterPool);
            
            totalUsedGP += result.usedGP;
            totalGainedTP += result.gainedTP;
        }
    }

    return {
        planetId: planet.id,
        usedGP: totalUsedGP,
        gainedTP: totalGainedTP
    };
}

// Hilfsfunktion für Kombinationen (wenn man wählen muss)
function getKCombinations(set, k) {
    if (k > set.length || k <= 0) return [];
    if (k === set.length) return [set];
    if (k === 1) return set.map(i => [i]);
    
    const combs = [];
    let tail_combs = [];
    
    for (let i = 0; i <= set.length - k + 1; i++) {
        tail_combs = getKCombinations(set.slice(i + 1), k - 1);
        for (let j = 0; j < tail_combs.length; j++) {
            combs.push([set[i], ...tail_combs[j]]);
        }
    }
    return combs;
}
/**
 * Berechnet die Summe der Galaktischen Macht (GP) aus einer Liste von Einheiten.
 * Wird genutzt, um zu sehen, wie viel GP in Operations "verschwunden" ist.
 */
function calculateUsedGP(unitsList) {
    if (!unitsList || unitsList.length === 0) return 0;

    return unitsList.reduce((sum, unit) => {
        // Fallback für verschiedene Datenstrukturen (swgoh.gg nutzt oft 'galacticPower' oder 'gp')
        const gpValue = unit.galacticPower || unit.gp || 0;
        return sum + gpValue;
    }, 0);
}
/**
 * START-FUNKTION
 */
// Signatur erweitert um 'strikeZoneSuccessRate'
/**
 * HAUPTFUNKTION
 * @param {Array|number} strikeZoneSuccessRates - Array [Tag1, Tag2...] oder einzelne Zahl
 */
function simulateFullCampaign(initialRoster, guildTotalGP, allPlanetsData, strikeZoneSuccessRates = 1.0) {
    // 1. Raten-Handling: Sicherstellen, dass es ein Array ist
    let ratesArray = Array.isArray(strikeZoneSuccessRates) ? strikeZoneSuccessRates : Array(6).fill(strikeZoneSuccessRates);
    // Falls Array zu kurz, mit letztem Wert auffüllen
    while(ratesArray.length < 6) {
        ratesArray.push(ratesArray[ratesArray.length - 1]);
    }

    const relevantPlanets = allPlanetsData.filter(p => p.isBonus !== true);
    const baseRosterMap = buildRosterPool(initialRoster); 
    const startPlanets = relevantPlanets.filter(p => p.phase === 1);

    const bestResult = findBestPath(
        {
            day: 1,
            activePlanets: startPlanets, 
            totalStarsAccumulated: 0,
            pathHistory: [], 
            existingPlanetTP: new Map() 
        }, 
        relevantPlanets, 
        baseRosterMap, 
        guildTotalGP,
        ratesArray // Array übergeben
    );

    // NEU: Priority List generieren und anhängen
    const priorityList = generatePriorityList(bestResult);
    bestResult.priorityList = priorityList;

    return bestResult;
}

/**
 * REKURSIVE PFADSUCHE
 */
/**
 * REKURSIVE PFADSUCHE (Core Logic)
 * * Features:
 * 1. Simuliert Tag 1 bis 6.
 * 2. Berechnet StrikeZone Punkte basierend auf Tages-Rate.
 * 3. Führt Operations durch und trackt Status pro Platoon.
 * 4. Simuliert "Sandbagging" (Stern opfern für Preload).
 * 5. Speichert fehlende Einheiten für Prio-Liste.
 */
function findBestPath(currentState, allPlanetsData, baseRosterOriginal, guildTotalGP, ratesArray) {
    
    // 1. Abbruchbedingung: Tag > 6 oder keine Planeten mehr aktiv
    if (currentState.day > 6 || currentState.activePlanets.length === 0) {
        return { 
            totalStars: currentState.totalStarsAccumulated, 
            path: currentState.pathHistory 
        };
    }

    // --- RESET FÜR DEN NEUEN TAG ---
    // Roster wird jede Phase resettet (Units sind wieder da)
    const currentPhaseRoster = cloneRosterPool(baseRosterOriginal);
    let availableDeploymentGP = guildTotalGP; 
    
    // Map speichert Ergebnisse der Ops für diesen Tag (TP, Kosten, Details)
    const dailyOpsData = new Map(); 

    // --- SCHRITT A: Operations füllen ---
    currentState.activePlanets.forEach(planet => {
        // Detaillierte Ops-Verarbeitung (gibt auch platoonDetails zurück)
        const opsResult = processPlanetOperationsDetailed(planet, currentPhaseRoster);
        
        availableDeploymentGP -= opsResult.usedGP;
        
        dailyOpsData.set(planet.id, { 
            tp: opsResult.gainedTP, 
            gpCost: opsResult.usedGP,
            missingUnits: opsResult.missingUnits,
            platoonDetails: opsResult.platoonDetails 
        });
    });

    // --- SCHRITT B: Deployment Vorbereitung ---
    // Success Rate für den aktuellen Tag holen
    const currentRate = ratesArray[currentState.day - 1] || 0;

    const deploymentPlanetsInput = currentState.activePlanets.map(p => {
        const opsInfo = dailyOpsData.get(p.id);
        const opsTP = opsInfo?.tp || 0;
        
        // Punkte, die wir vom Vortag mitgebracht haben (Preload)
        const preloadedTP = currentState.existingPlanetTP.get(p.id) || 0;
        
        // Strike Points berechnen
        const strikeTP = calculateStrikeZonePoints(p, currentRate);

        // Alles zusammenzählen: Startkapital für diesen Planeten
        const totalStartingTP = opsTP + preloadedTP + strikeTP;
        
        // Thresholds reduzieren (damit der Solver nur noch die Rest-GP verteilen muss)
        const adjustedThresholds = p.starThresholds.map(t => Math.max(0, t - totalStartingTP));
        
        return {
            name: p.name,
            id: p.id,
            starThresholds: adjustedThresholds,
            originalThresholds: p.starThresholds,
            // Daten durchreichen für spätere Berechnungen
            opsTP: opsTP,
            preloadedTP: preloadedTP,
            strikeTP: strikeTP
        };
    });

    // 1. Gierige Strategie berechnen (Versucht maximale Sterne zu holen)
    const greedyStrategy = solveRotePhase(availableDeploymentGP, deploymentPlanetsInput);

    // --- SCHRITT C: Strategie-Verzweigung (Sandbagging) ---
    // Wir testen die gierige Strategie UND Varianten, wo wir absichtlich Sterne liegen lassen.
    let strategiesToTest = [greedyStrategy];

    greedyStrategy.plan.forEach((planItem, index) => {
        // Sandbagging lohnt sich meist nur, wenn wir gerade so 1 Stern schaffen.
        // Wir simulieren: "Was, wenn wir diesen Stern NICHT holen und alles pre-loaden?"
        if (planItem.targetStars === 1) {
            // Strategie klonen
            const sandbagStrategy = JSON.parse(JSON.stringify(greedyStrategy));
            const sbItem = sandbagStrategy.plan[index];

            // Manipulation: Stern entfernen
            sbItem.targetStars = 0;
            
            // Die Kosten, die wir für den Stern ausgegeben hätten...
            const savedGP = sbItem.cost;
            sbItem.cost = 0;

            // ...schieben wir komplett in das "Extra Deployment" (Preload für morgen)
            sbItem.extraDeployment += savedGP;
            sbItem.isPreload = true;

            // Stats anpassen
            sandbagStrategy.totalStars -= 1;
            sandbagStrategy.isSandbaggingVariant = true; // Markierung für Debugging
            sandbagStrategy.sandbaggedPlanet = sbItem.name;

            strategiesToTest.push(sandbagStrategy);
        }
    });

    // --- SCHRITT D & E: Rekursion über ALLE Strategien ---
    let globalMaxStars = -1;
    let globalBestPath = null;

    for (const strategy of strategiesToTest) {
        const dayStars = strategy.totalStars;
        const newTotalStars = currentState.totalStarsAccumulated + dayStars;

        // --- LOGGING VORBEREITEN ---
        // Wir bauen das detailedOpsLog für den Output
        const detailedOpsLog = [];
        currentState.activePlanets.forEach(p => {
            const data = dailyOpsData.get(p.id);
            if (data) {
                detailedOpsLog.push({
                    planetName: p.name,
                    planetId: p.id,
                    totalTP: data.tp,
                    platoons: data.platoonDetails // Liste der Platoons (Filled/Missing)
                });
            }
        });

        const stepLog = {
            day: currentState.day,
            stars: dayStars,
            totalStarsSoFar: newTotalStars,
            strategy: strategy,
            activePlanets: currentState.activePlanets, // Objekte für ID-Zugriff in Prio-Liste
            opsSummary: Array.from(dailyOpsData.entries()), // Für Prio-Liste (Missing Units)
            opsDetails: detailedOpsLog // Für Frontend-Anzeige (Platoon Status)
        };

        // --- NÄCHSTEN TAG VORBEREITEN ---
        let candidatesForNextDay = [];
        const nextDayPreloadMap = new Map(); 

        strategy.plan.forEach((result, index) => {
            const originalPlanet = currentState.activePlanets[index]; 
            
            if (result.targetStars >= 1) {
                // FALL 1: Planet erledigt. Wir suchen Nachfolger.
                // Filter: Muss in 'unlocksFrom' stehen UND darf kein Bonus-Planet sein.
                const unlockedChildren = allPlanetsData.filter(p => 
                    p.unlocksFrom && 
                    p.unlocksFrom.includes(originalPlanet.id) &&
                    p.isBonus !== true 
                );
                candidatesForNextDay.push(...unlockedChildren);
            } 
            else {
                // FALL 2: Planet nicht erledigt (0 Sterne). Er bleibt aktiv.
                candidatesForNextDay.push(originalPlanet);
                
                const inputData = deploymentPlanetsInput[index];
                
                // Berechnung des Preloads für MORGEN:
                // Alles was heute da war (Ops + Strike + Preload) + was wir deployed haben
                const totalPointsNow = 
                    inputData.preloadedTP + 
                    inputData.opsTP + 
                    inputData.strikeTP + 
                    result.cost + 
                    result.extraDeployment;
                
                nextDayPreloadMap.set(originalPlanet.id, totalPointsNow);
            }
        });

        // Duplikate entfernen (falls Pfade zusammenlaufen)
        let uniqueCandidates = [...new Map(candidatesForNextDay.map(p => [p.id, p])).values()];
        
        // Branching: Wir haben meist nur 3 Slots für Planeten (LS/Mix/DS).
        // Wenn wir mehr Kandidaten haben, müssen wir Kombinationen testen.
        let combinations = [];
        const SLOTS = 3; 
        
        if (uniqueCandidates.length <= SLOTS) {
            if (uniqueCandidates.length > 0) combinations.push(uniqueCandidates);
        } else {
            combinations = getKCombinations(uniqueCandidates, SLOTS);
        }

        // Sackgasse prüfen
        if (combinations.length === 0) {
             // Wenn dies der beste bisherige Pfad ist, speichern
             if (newTotalStars > globalMaxStars) {
                 globalMaxStars = newTotalStars;
                 globalBestPath = { totalStars: newTotalStars, path: [...currentState.pathHistory, stepLog] };
             }
             continue; // Nächste Strategie testen
        }

        // --- REKURSION ---
        for (const combo of combinations) {
            const result = findBestPath({
                day: currentState.day + 1,
                activePlanets: combo,
                totalStarsAccumulated: newTotalStars,
                pathHistory: [...currentState.pathHistory, stepLog],
                existingPlanetTP: nextDayPreloadMap
            }, allPlanetsData, baseRosterOriginal, guildTotalGP, ratesArray);

            if (result.totalStars > globalMaxStars) {
                globalMaxStars = result.totalStars;
                globalBestPath = result;
            }
        }
    }

    // Fallback, falls alle Pfade sterben (sollte nicht passieren durch Sackgassen-Check oben)
    return globalBestPath || { totalStars: currentState.totalStarsAccumulated, path: currentState.pathHistory };
}

/**
 * Führt Operations durch und liefert Details pro Platoon zurück.
 */
function processPlanetOperationsDetailed(planet, rosterPool) {
    let totalUsedGP = 0;
    let totalGainedTP = 0;
    let allMissingUnits = [];
    
    // NEU: Liste für den detaillierten Status jedes Platoons
    const platoonDetails = []; 

    for (const rz of planet.reconZones || []) {
        const minRelicTier = rz.minRelicTier ?? 0;
        
        for (const p of rz.platoonDefinition || []) {
            
            // 1. Einheiten verbrauchen
            const usedUnits = consumeUnitsForPlatoon(p, minRelicTier, rosterPool); 
            
            // 2. GP Kosten addieren
            if (usedUnits.length > 0) {
                totalUsedGP += calculateUsedGP(usedUnits);
            }

            // 3. Status prüfen
            const isComplete = isPlatoonComplete(p, usedUnits);
            const pointsValue = parseInt(p.reward?.value || 0);
            
            if (isComplete) {
                 totalGainedTP += pointsValue;
            } else {
                // Fehlende Einheiten global sammeln
                const missing = getMissingUnitsForPlatoon(p, usedUnits, minRelicTier);
                allMissingUnits.push(...missing);
            }

            // 4. NEU: Detail-Eintrag für dieses Platoon erstellen
            platoonDetails.push({
                id: p.id,
                // Name oft als nameKey in den Daten, sonst ID
                name: p.nameKey || p.id, 
                zoneName: rz.nameKey || "Unknown Zone", // Damit man weiß, welche Zone (Links/Rechts/Mitte)
                status: isComplete ? "FILLED" : "INCOMPLETE",
                pointsGained: isComplete ? pointsValue : 0,
                // Optional: Falls du im Log sehen willst, was GENAU hier fehlte:
                missing: isComplete ? [] : getMissingUnitsForPlatoon(p, usedUnits, minRelicTier)
            });
        }
    }

    return { 
        id: planet.id, 
        usedGP: totalUsedGP, 
        gainedTP: totalGainedTP, 
        missingUnits: allMissingUnits,
        platoonDetails: platoonDetails // <--- Geben wir zurück an die Simulation
    };
}
/**
 * Berechnet die erwarteten Punkte aus Kampfmissionen (Strike Zones).
 * @param {Object} planet - Das Planeten-Datenobjekt.
 * @param {number} successRate - Faktor 0.0 bis 1.0 (wie viel % der Gilde schafft das).
 * @returns {number} Die geschätzten Gesamtpunkte der Gilde durch Kämpfe.
 */
function calculateStrikeZonePoints(planet, successRate) {
    if (!planet.strikeZones || planet.strikeZones.length === 0) return 0;

    // 1. Maximale Punkte pro Spieler berechnen
    let maxPointsPerPlayer = 0;

    planet.strikeZones.forEach(zone => {
        // User-Anweisung: "einfach alle Rewards der Phasen zusammenrechnen"
        const missionTotal = zone.rewards.reduce((sum, reward) => {
            return sum + (reward.galacticScore || 0);
        }, 0);
        
        maxPointsPerPlayer += missionTotal;
    });

    // 2. Auf die Gilde hochrechnen (50 Mitglieder) und Faktor anwenden
    const GUILD_MEMBERS = 50;
    const totalPotential = maxPointsPerPlayer * GUILD_MEMBERS;

    return Math.floor(totalPotential * successRate);
}

/**
 * Vergleicht Platoon-Anforderungen mit verbrauchten Einheiten und gibt Fehlendes zurück.
 */
function getMissingUnitsForPlatoon(platoon, usedUnits, minRelicTier) {
    const missing = [];
    
    // Zählen, wie viel wir von wem verbraucht haben
    const usedCountMap = new Map();
    usedUnits.forEach(u => {
        // Wir nutzen den Namen als Key (oder baseId, falls verfügbar)
        const current = usedCountMap.get(u.name) || 0;
        usedCountMap.set(u.name, current + 1);
    });

    platoon.units.forEach(req => {
        const usedAmount = usedCountMap.get(req.name) || 0;
        const missingAmount = req.amount - usedAmount;

        if (missingAmount > 0) {
            missing.push({
                name: req.name,
                relic: minRelicTier,
                count: missingAmount,
                // Speichern, wie viele Punkte das GANZE Platoon wert ist, 
                // um die Wichtigkeit später zu schätzen
                platoonPoints: parseInt(platoon.reward?.value || 0) 
            });
        }
    });

    return missing;
}

/**
 * Generiert die finale Prioritätenliste aus dem besten Pfad.
 */
function generatePriorityList(bestPathResult) {
    const listByPhase = [];
    
    // Globaler Tracker: Wir wollen Planeten nicht doppelt listen, 
    // wenn sie über mehrere Tage aktiv bleiben (Sandbagging).
    // Eine Einheit soll in der Phase auftauchen, in der der Planet ZUM ERSTEN MAL drankommt.
    const processedPlanetIds = new Set(); 

    // Wir gehen den Pfad Tag für Tag (Phase für Phase) durch
    bestPathResult.path.forEach(step => {
        
        // Temporäre Map nur für DIESE Phase
        const phaseMap = new Map(); 

        const { strategy, activePlanets, opsSummary } = step;

        strategy.plan.forEach((planItem, index) => {
            const planetData = activePlanets[index];
            const planetId = planetData.id;

            // Haben wir diesen Planeten schon in einer vorherigen Phase analysiert?
            if (processedPlanetIds.has(planetId)) {
                return; // Überspringen, damit er nicht doppelt in der Liste auftaucht
            }
            processedPlanetIds.add(planetId);

            // 1. Dringlichkeit berechnen (Gap zum nächsten Stern)
            const costSoFar = planItem.cost + planItem.extraDeployment + (planItem.opsTP || 0) + (planItem.preloadedTP || 0) + (planItem.strikeTP || 0);
            const currentStars = planItem.targetStars;
            let gapToNextStar = Infinity;
            
            if (currentStars < 3 && planItem.thresholds && planItem.thresholds[currentStars]) {
                gapToNextStar = planItem.thresholds[currentStars] - costSoFar;
            }

            // Score: Je knapper der Stern, desto höher die Prio
            let urgencyScore = 1; 
            if (gapToNextStar <= 20000000) urgencyScore = 10; 
            if (gapToNextStar <= 5000000) urgencyScore = 50;  

            // 2. Fehlende Ops aus dem Summary holen
            // opsSummary Struktur ist: [ [planetId, {missingUnits: [...]}], ... ]
            const opsEntry = opsSummary.find(entry => entry[0] === planetId);
            
            if (opsEntry && opsEntry[1].missingUnits) {
                opsEntry[1].missingUnits.forEach(missing => {
                    // Key inkl. Relic (z.B. "Jedi Knight Luke_R7")
                    const key = `${missing.name}_R${missing.relic}`;

                    if (!phaseMap.has(key)) {
                        phaseMap.set(key, {
                            name: missing.name,
                            relic: missing.relic,
                            totalCount: 0,
                            locations: [],
                            score: 0
                        });
                    }

                    const entry = phaseMap.get(key);
                    entry.totalCount += missing.count;
                    entry.score += (urgencyScore * missing.platoonPoints);
                    entry.locations.push(planItem.name); // Nur Name speichern
                });
            }
        });

        // Wenn wir in dieser Phase fehlende Einheiten gefunden haben:
        if (phaseMap.size > 0) {
            // Map zu Array wandeln und nach Score sortieren
            const sortedUnits = Array.from(phaseMap.values()).sort((a, b) => b.score - a.score);
            
            listByPhase.push({
                phase: step.day,
                units: sortedUnits
            });
        }
    });

    return listByPhase;
}


module.exports = {
    convertGuild,
    convertPlayer,
    convertData,
    connectUnits,
    filterUnitNames,
    filterTerritoryNames,
    connectData,
    filterGuildNames,
    convertSkillData,
    expandSkills,
    expandSZData,
    buildPlanets,
    applyPlanetNames,
    buildLocalizationMap,
    attachOpUnitsToPlanets,
    simulateFullCampaign
}