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
        const allowed = ["name", "rosterUnit"]
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
        const allowed = ["baseId", "id", "legend", "descKey", "nameKey", "unitPrefab"]
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
  
          const maxTier = def.tier.length + 1;
  
          const zetaTierIndex = def.tier.findIndex(t => t.isZetaTier);
          const omicronTierIndex = def.tier.findIndex(t => t.isOmicronTier);
  
          skill.nameKey = def.nameKey;
          skill.maxTier = maxTier;
          skill.isZeta = def.isZeta;
          skill.isOmicron = def.omicronMode !== 0;
          skill.omicronArea = def.omicronMode;
  
          skill.hasZeta =
            zetaTierIndex !== -1 && skill.tier >= (zetaTierIndex + 1);
  
          skill.hasOmicron =
            omicronTierIndex !== -1 && skill.tier >= (omicronTierIndex + 1);
        }
      }
    }
  
    return allRosterData;
  }
  
  

module.exports = {
    convertGuild,
    convertPlayer,
    convertData,
    connectUnits,
    filterUnitNames,
    connectData,
    filterGuildNames,
    convertSkillData,
    expandSkills
}