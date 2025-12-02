const fs = require('fs')

const convertGuild = (data) => {
    try {
        let guild = (({ profile, member, recentTerritoryWarResult }) => ({ profile, member, recentTerritoryWarResult }))(data.guild)
        const allowed = ['playerId', 'playerName', 'galacticPower']
        guild.member = guild.member.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return { guild }
    } catch (error) {
        console.log(error.message)
    }
}

const convertPlayer = (data) => {
    try {
        const allowed = ["name", "rosterUnit"]
        let player = data.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        const allowed2 = ["baseId", "currentTier", "currentRarity", "currentLevel", "legend", "nameKey", "relic", "definitionId"]
        for(let i = 0; i < player.length; i++){
            player[i].rosterUnit = player[i].rosterUnit.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed2.includes(key))))
        }
        return player
    } catch (error) {
        console.log(error.message)   
    }
}

const convertData = (data) => {
    try {
        //hier gäbe es auch Informationen über Datacrons, Lightspeedbundles und tokens
        let temp = (({battleTargetingRule, categories, modRecommendation, skill, units, territoryBattleDefinition}) => ({battleTargetingRule, categories, modRecommendation, skill, units, territoryBattleDefinition})) (data)
        const allowed = ["baseId", "id", "legend", "descKey", "nameKey"]
        temp.units = temp.units.map(obj=> Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return temp
    } catch (error) {
        console.log(error.message)
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
            const filtered = entries.filter(e => !e.nameKey.startsWith("UNIT_WIN_") && !e.nameKey.startsWith("UNIT_KILL_") && !e.nameKey.startsWith("UNIT_BUNDLE_"));
            return filtered
    } catch (error) {
        console.log(error.message)
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
        console.log(error.message)
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
        console.log(error.message)
    }
}

module.exports = {
    convertGuild,
    convertPlayer,
    convertData,
    connectUnits,
    filterUnitNames,
    connectData
}